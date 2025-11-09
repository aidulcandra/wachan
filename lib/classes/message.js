const fs = require("fs")
const { fileTypeFromBuffer } = require("file-type")
const mime = require("mime-types")
const { extractMessageContent, downloadMediaMessage } = require("baileys")
const { USER_JID, USER_LID, GROUP_JID } = require("../core/constants")
const { store: { messageStore, groupStore, userStore } } = require("../core/store")
const { getSocket, getBotInfo } = require("../core/socket")
const { queue } = require("../utils/queue")

class Message {
    constructor (m, context) {
        const botInfo = getBotInfo()
        this.id = m.key.id
        this.room = m.key.remoteJid
        const senderId = m.key.fromMe ? botInfo.id : (m.key.participantPn || m.key.participant || m.key.remoteJid)
        const senderLid = m.key.fromMe ? botInfo.lid : (m.key.participantLid || m.key.participant || m.key.senderLid)
        this.sender = {
            id: senderId,
            lid: senderLid,
            isMe: m.key.fromMe,
            name: m.key.fromMe ? (botInfo.name || context?.defaultBotName || "Wachan") : m.pushName,
            isAdmin: context?.senderIsAdmin || false
        }
        this.timestamp = m.messageTimestamp
        const realMessage = extractMessageContent(
            m.message?.protocolMessage?.editedMessage ||
            m.message?.groupMentionedMessage?.message ||
            m.message?.viewOnceMessage?.message ||
            m.message?.viewOnceMessageV2?.message ||
            m.message 
        )
        for (const key in realMessage) {
            if (!realMessage[key]) continue
            switch (key) {
                case "conversation":
                case "extendedTextMessage": {
                    this.type = "text"
                    break
                }
                case "imageMessage":
                case "videoMessage": 
                case "audioMessage":
                case "stickerMessage":
                case "documentMessage": {
                    this.type = realMessage[key].gifPlayback ? "gif" : key.slice(0,-7)
                    this.isMedia = true
                    this.downloadMedia = async function (saveTo) {
                        const socket = getSocket()
                        const buffer = await downloadMediaMessage(m, "buffer", {}, {reuploadRequest: socket.updateMediaMessage})
                        if (saveTo) await fs.promises.writeFile(saveTo, buffer)
                        return buffer
                    }
                    break
                }
                case "reactionMessage": {
                    this.reaction = { emoji: realMessage[key].text, key: realMessage[key].key }
                }
                default: {
                    if (key.endsWith("Message")) {
                        const cleanName = key.replace(/Message$/, "")
                        if (this.type === undefined) this.type = cleanName
                        else {
                            this.extraTypes ??= []
                            this.extraTypes.push(cleanName)
                        }
                    }
                }
            }
            const contextInfo = realMessage[key]?.contextInfo
            this.getQuoted = async () => {
                if (!contextInfo?.quotedMessage) return null
                const user = userStore.find(contextInfo.participant)
                const key = {
                    id: contextInfo.stanzaId,
                    remoteJid: contextInfo.remoteJid || m.key.remoteJid,
                    fromMe: contextInfo.participant === botInfo.id 
                        || contextInfo.participant === botInfo.lid,
                    participant: contextInfo.participant,
                    participantPn: user?.id,
                    participantLid: user?.lid,
                }
                const fakeQuotedMessage = { 
                    key, 
                    message: contextInfo?.quotedMessage, 
                    messageTimestamp: 0, 
                    broadcast: false,
                    pushName: user?.pushName
                }
                const quotedContext = {
                    receivedOnline: false,
                    senderIsAdmin: await groupStore.isUserAdmin(key.participant, key.remoteJid),
                    defaultBotName: context?.defaultBotName
                }
                return new Message(messageStore.get(key) || fakeQuotedMessage, quotedContext)
            }
            this.isMedia ??= false
            const t = realMessage[key]?.text 
                || realMessage[key]?.caption 
                || realMessage[key]
            if (typeof t === "string" && this.type !== "reaction") this.text = t
        }
        this.receivedOnline = context?.receivedOnline ?? true
        this.toBaileys = () => m
    }

    async getQuoted() {
        const user = userStore.find(contextInfo.participant)
        const key = {
            id: contextInfo.stanzaId,
            remoteJid: contextInfo.remoteJid || m.key.remoteJid,
            fromMe: contextInfo.participant === botInfo.id 
                || contextInfo.participant === botInfo.lid,
            participant: contextInfo.participant,
            participantPn: user?.id,
            participantLid: user?.lid,
        }
        const fakeQuotedMessage = { 
            key, 
            message: contextInfo?.quotedMessage, 
            messageTimestamp: 0, 
            broadcast: false,
            pushName: user?.pushName
        }
        const quotedContext = {
            receivedOnline: false,
            senderIsAdmin: await groupStore.isUserAdmin(key.participant, key.remoteJid),
            defaultBotName: context?.defaultBotName
        }
        return new Message(messageStore.get(key) || fakeQuotedMessage, quotedContext)
    }

    async reply (options) {
        const opt = typeof options === "string"
            ? {text: options}
            : options
        return await sendMessage(this.room, {quoted: this, ...opt})
    }

    async react (emoji) {
        return await sendReaction(this, emoji)
    }

    async delete () {
        return await deleteMessage(this)
    }
}

async function sendMessage(room, options) {
    const socket = getSocket();
    if (!socket) return null
    if (!room) throw new Error("sendMessage: No room id specified")
    if (!room.endsWith(USER_JID) && !room.endsWith(USER_LID) && !room.endsWith(GROUP_JID)) 
        throw new Error(`sendMessage: Invalid room id ${room}, must be a user or group chat`)
    const message = {}
    let media = null
    const mediaTypes = [
        ["image"],
        ["video"],
        ["video", {gifPlayback:true}, "gif"],
        ["audio", {mimetype:"audio/mp4"}],
        ["sticker"],
        ["document"]
    ]
    if (typeof options === "object") {
        for (const key in options) {
            const value = options[key]
            for (const type of mediaTypes) {
                const [mainType, data, subType] = type
                if (key === (subType||mainType) && message[mainType] === undefined) {
                    media = { ...data }
                    if (Buffer.isBuffer(value)) media[mainType] = value
                    else if (typeof value === "string") media[mainType] = { url: value }
                    Object.assign(message, media)
                    break
                }
            }
            if (key === "buttons") {
                return await sendButtons(room, options)
            }
        }
    }
    const text = typeof options === "string" 
        ? options
        : options?.text || ""
    if (!text && !media) return null
    message[media ? "caption" : "text"] = text
    if (Buffer.isBuffer(media?.document)) {
        let ft = null
        const fileType = async () => ft ??= await fileTypeFromBuffer(media.document)
        message.mimetype = options?.mimetype || (await fileType())?.mime
        message.fileName = options?.fileName || ("media" + ((await fileType())?.ext ? `.${(await fileType())?.ext}` : ""))
    }
    if (media?.document?.url) {
        const mt = mime.lookup(media.document.url)
        const mtExt = mime.extension(mt)
        message.mimetype = options?.mimetype || mt
        message.fileName = options?.fileName || "media" + (mtExt ? `.${mtExt}` : "")
    }
    message.mentions = getMentionsFromText(text)
    const quoted = options?.quoted?.toBaileys() || options?.quoted
    const ephemeralExpiration = await getGroupData(room, "ephemeralDuration")
    const sendingOptions = { quoted, ephemeralExpiration }
    return new Message(
        await queue("socket", null, () => socket.sendMessage(room, message, sendingOptions)),
        { senderIsAdmin: await groupStore.isUserAdmin(getBotInfo().id, room)}
    )
}

async function sendReaction(message, emoji) {
    const socket = getSocket();
    if (!socket) return null
    if (!message) throw new Error("sendReaction: No target message specified")
    if (!emoji) throw new Error("sendReaction: No emoji specified")
    const room = message.room
    return new Message(
        await queue("socket", null, () => socket.sendMessage(room, {
            react: {
                key: message.toBaileys().key,
                text: emoji
            }
        }), { senderIsAdmin: await groupStore.isUserAdmin(getBotInfo().id, room)})
    )
}

async function deleteMessage(message) {
    const socket = getSocket()
    if (!socket) return null
    if (!message) throw new Error("deleteMessage: No target message specified")
    const room = message.room
    return new Message(
        await queue("socket", null, () => socket.sendMessage(room, {
            delete: message.toBaileys().key
        }), { senderIsAdmin: await groupStore.isUserAdmin(getBotInfo().id, room)})
    )
}

async function sendButtons(room, options) {
    const socket = getSocket()
    if (!socket) return null
    if (!room) throw new Error("sendButtons: No room id specified")
    if (!room.endsWith(USER_JID) && !room.endsWith(USER_LID) && !room.endsWith(GROUP_JID)) 
        throw new Error(`sendButtons: Invalid room id ${room}, must be a user or group chat`)
    if (!options?.text) throw new Error("sendButtons: No body text specified through options.text")
    if (!options?.buttons?.[0]) throw new Error("sendButtons: No buttons specified through options.buttons[]")
    for (const btn of options.buttons) {
        if (!btn?.id) throw new Error("sendButtons: Each button must have an id property")
        if (!btn?.text) throw new Error("sendButtons: Each button must have a text property")
    }
    const content = { 
        text: options.text,
        footer: options.footer,
        title: options.title,
        interactiveButtons: options.buttons,
        contextInfo: {
            quotedMessage: options?.quoted?.toBaileys() || options?.quoted,
            expiration: await getGroupData(room, "ephemeralDuration")
        }
    }
    const { sendInteractiveMessage } = require("baileys_helper")
    return new Message(
        await queue("socket", null, () => sendInteractiveMessage(socket, room, content)),
        { senderIsAdmin: await groupStore.isUserAdmin(getBotInfo().id, room) }
    )
}

async function getGroupData(jid, key) {
    const data = await groupStore.get(jid)
    return data?.[key]
}

function getMentionsFromText(text) {
  if (!text) return []
  return (text.match(/@\d+/g) || []).map((m) => m.slice(1) + USER_LID);
}

module.exports = {
    Message, sendMessage
}