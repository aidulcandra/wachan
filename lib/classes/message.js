const fs = require("fs")
const { fileTypeFromBuffer } = require("file-type")
const mime = require("mime-types")
const { createHash } = require("crypto")
const { extractMessageContent, downloadMediaMessage, decryptPollVote } = require("baileys")
const vCard = require("vcard-parser")
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
        let contextInfo
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
                    break
                }
                case "interactiveMessage": {
                    this.type = "buttons"
                    this.text = realMessage[key].body.text
                    this.title = realMessage[key].header.title
                    this.footer = realMessage[key].footer.text
                    this.buttons = realMessage[key].nativeFlowMessage.buttons
                        .map(b => {
                            const params = JSON.parse(b.buttonParamsJson)
                            const button = {}
                            switch (b.name) {
                                case "quick_reply":
                                    button.type = "reply"
                                    button.text = params.display_text
                                    button.id = params.id
                                    break
                                case "single_select":
                                    button.type = "list"
                                    button.title = params.title
                                    button.sections = params.sections
                                    break
                                case "cta_url":
                                    button.type = "url"
                                    button.text = params.display_text
                                    button.url = params.url
                                    button.merchantUrl = params.merchant_url
                                    break
                                case "cta_copy":
                                    button.type = "copy"
                                    button.text = params.display_text
                                    button.code = params.copy_code
                                    break
                                case "cta_call":
                                    button.type = "call"
                                    button.text = params.display_text
                                    button.phoneNumber = params.phone_number
                                    break
                            }
                            return button
                        })
                    break
                }
                case "templateButtonReplyMessage": {
                    this.type = "buttonReply"
                    this.buttonReply = {
                        id: realMessage[key].selectedId,
                        text: realMessage[key].selectedDisplayText,
                        pos: realMessage[key].selectedIndex
                    }
                    break
                }
                case "contactMessage": 
                case "contactsArrayMessage": {
                    const parseVcard = (vc) => {
                        const data = vCard.parse(vc)
                        const name = data.fn[0].value
                        const number = data.tel[0].value
                        return {name, number}
                    }
                    this.contacts = [
                        realMessage[key].vcard || 
                        realMessage[key].contacts?.map(c => c.vcard)
                    ].flat().map(vc => parseVcard(vc))
                    break
                }
                case "pollCreationMessage":
                case "pollCreationMessageV2":
                case "pollCreationMessageV3":
                case "pollCreationMessageV4":
                case "pollCreationMessageV5": {
                    this.type = "poll"
                    const pollMessage = realMessage[key]
                    this.poll = {
                        title: pollMessage.name,
                        options: pollMessage.options?.map(o => o.optionName) || [],
                        multiple: pollMessage.selectableOptionsCount != 1,
                        votes: {}
                    }
                    for (const option of this.poll.options) this.poll.votes[option] = []
                    break
                }
                case "pollUpdateMessage": {
                    const pollUpdate = realMessage[key]
                    const pollKey = pollUpdate.pollCreationMessageKey
                    const pollMessage = messageStore.get(pollKey)
                    if (!pollMessage) {
                        console.log("Message: Poll message not found for this vote")
                        this.vote = null
                        break
                    }
                    const pollContext = {
                        pollCreatorJid: pollKey.participant,
                        pollMsgId: pollKey.id,
                        pollEncKey: pollMessage.message.messageContextInfo.messageSecret,
                        voterJid: m.key.participant
                    }
                    const voteMessage = decryptPollVote(pollUpdate.vote, pollContext)
                    const pollCreationMessage = pollMessage.message.pollCreationMessage
                        || pollMessage.message.pollCreationMessageV2
                        || pollMessage.message.pollCreationMessageV3
                        || pollMessage.message.pollCreationMessageV4
                        || pollMessage.message.pollCreationMessageV5
                    const options = pollCreationMessage.options.map(o=>o.optionName)
                    this.vote = {
                        pollId: pollKey.id,
                        list: voteMessage
                            .selectedOptions
                            .map(o=>options?.find(opt=>hashPollOption(opt) == o.toString('base64')))
                    }
                    break
                }
            }
            if (key.endsWith("Message")) {
                const cleanName = key.replace(/Message$/, "")
                if (this.type === undefined) this.type = cleanName
                else {
                    this.extraTypes ??= []
                    this.extraTypes.push(cleanName)
                }
            }
            contextInfo ??= realMessage[key]?.contextInfo
            this.isMedia ??= false
            const t = realMessage[key]?.text 
                || realMessage[key]?.caption 
                || realMessage[key]
            if (typeof t === "string" && this.type !== "reaction") this.text = t
        }
        this.receivedOnline = context?.receivedOnline ?? true
        this.getQuoted = async () => {
            if (!contextInfo?.quotedMessage) return null
            const user = userStore.find(contextInfo?.participant)
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
        this.toBaileys = () => m
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
            if (key === "contacts") {
                return await sendContacts(room, options)
            }
            if (key === "poll") {
                return await sendPoll(room, options)
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
    const sent = new Message(
        await queue("socket", null, () => socket.sendMessage(room, message, sendingOptions)),
        { senderIsAdmin: await groupStore.isUserAdmin(getBotInfo().id, room)}
    )
    messageStore.add(sent.toBaileys())
    return sent
}

async function sendReaction(message, emoji) {
    const socket = getSocket();
    if (!socket) return null
    if (!message) throw new Error("sendReaction: No target message specified")
    if (emoji === undefined || emoji === null) throw new Error("sendReaction: No emoji specified")
    const room = message.room
    const sent = new Message(
        await queue("socket", null, () => socket.sendMessage(room, {
            react: {
                key: message.toBaileys().key,
                text: emoji
            }
        }), { senderIsAdmin: await groupStore.isUserAdmin(getBotInfo().id, room)})
    )
    messageStore.add(sent.toBaileys())
    return sent
}

async function sendContacts(room, options) {
    const socket = getSocket();
    if (!socket) return null
    if (!room) throw new Error("sendContacts: No room id specified")
    if (!room.endsWith(USER_JID) && !room.endsWith(USER_LID) && !room.endsWith(GROUP_JID))
        throw new Error(`sendContacts: Invalid room id ${room}, must be a user or group chat`)
    if (!options?.contacts?.[0]) throw new Error("sendContacts: No contacts specified through options.contacts[]")
    const vcards = options.contacts.map((c) => {
        return {
            vcard: `BEGIN:VCARD\nVERSION:3.0\nFN:${
                c.name
            }\nTEL;type=CELL;type=VOICE;waid=${c.number.replace(/\D/g, "")}:${
                c.number
            }\nEND:VCARD`,
        };
    })
    const quoted = options?.quoted?.toBaileys() || options?.quoted
    const ephemeralExpiration = await getGroupData(room, "ephemeralDuration")
    const sendingOptions = { quoted, ephemeralExpiration }
    const sent = new Message(
        await queue("socket", null, () => socket.sendMessage(
            room,
            { contacts: { contacts: vcards } },
            sendingOptions
        ), { senderIsAdmin: await groupStore.isUserAdmin(getBotInfo().id, room)})
    )
    messageStore.add(sent.toBaileys())
    return sent
}

async function sendPoll(room, options) {
    const socket = getSocket()
    if (!socket) return null
    if (!room) throw new Error("sendPoll: No room id specified")
    if (!room.endsWith(GROUP_JID)) 
        throw new Error(`sendPoll: Invalid room id ${room}, must be a group chat`)
    if (!options?.poll) throw new Error("sendPoll: No poll specified through options.poll")
    if (!options.poll.title) throw new Error("sendPoll: No poll title specified through options.poll.title")
    if (!options.poll.options) throw new Error("sendPoll: No poll options specified through options.poll.options")
    if (options.poll.options.length < 2) throw new Error("sendPoll: At least 2 poll options are required in options.poll.options")
    const selectableCount = options.poll.multiple ? 0 : 1
    const quoted = options?.quoted?.toBaileys() || options?.quoted
    const ephemeralExpiration = await getGroupData(room, "ephemeralDuration")
    const sendingOptions = { quoted, ephemeralExpiration }
    const sent = new Message(
        await queue("socket", null, () => socket.sendMessage(
            room,
            { 
                poll: { 
                    name: options.poll.title, 
                    values: options.poll.options,
                    selectableCount
                }
            },
            sendingOptions
        ), { senderIsAdmin: await groupStore.isUserAdmin(getBotInfo().id, room)})
    )
    messageStore.add(sent.toBaileys())
    return sent
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
    const interactiveButtons = []
    for (const btn of options.buttons) {
        // type: reply, list, url, copy, call
        if (!btn?.type) throw new Error("sendButtons: Each button must have a type property")
        switch (btn.type) {
            case "reply": {
                if (!btn.id) throw new Error("sendButtons: Reply button must have an id property")
                if (!btn.text) throw new Error("sendButtons: Reply button must have a text property")
                interactiveButtons.push({
                    name: "quick_reply",
                    buttonParamsJson: JSON.stringify({
                        display_text: btn.text,
                        id: btn.id
                    })
                })
                break
            }
            case "list": {
                if (!btn.title) throw new Error("sendButtons: List button must have a title property")
                if (!btn.sections?.[0]) throw new Error("sendButtons: List button must have a sections[] property with at least one section")
                for (const section of btn.sections) {
                    // optional property: title
                    if (!section.rows?.[0]) throw new Error("sendButtons: List button's section must have at least one row in section.rows[]")
                    for (const row of section.rows) {
                        if (!row.id) throw new Error("sendButtons: List button's section row must have an id property")
                        if (!row.title) throw new Error("sendButtons: List button's section row must have a title property")
                        // there are optional properties: description, header
                    }
                }
                interactiveButtons.push({
                    name: "single_select",
                    buttonParamsJson: JSON.stringify({
                        title: btn.title,
                        sections: btn.sections
                    })
                })
                break
            }
            case "url": {
                if (!btn.text) throw new Error("sendButtons: URL button must have a text property")
                if (!btn.url) throw new Error("sendButtons: URL button must have a url property")
                interactiveButtons.push({
                    name: "cta_url",
                    buttonParamsJson: JSON.stringify({
                        display_text: btn.text,
                        url: btn.url,
                        merchant_url: btn.merchantUrl
                    })
                })
                break
            }
            case "copy": {
                if (!btn.text) throw new Error("sendButtons: Copy button must have a text property")
                if (!btn.code) throw new Error("sendButtons: Copy button must have a code property")
                interactiveButtons.push({
                    name: "cta_copy",
                    buttonParamsJson: JSON.stringify({
                        display_text: btn.text,
                        copy_code: btn.code
                    })
                })
                break
            }
            case "call": {
                if (!btn.text) throw new Error("sendButtons: Call button must have a text property")
                if (!btn.phoneNumber) throw new Error("sendButtons: Call button must have a phoneNumber property")
                interactiveButtons.push({
                    name: "cta_call",
                    buttonParamsJson: JSON.stringify({
                        display_text: btn.text,
                        phone_number: btn.phoneNumber
                    })
                })
                break
            }
            default: {
                throw new Error(`sendButtons: Unknown button type ${btn.type}`)
            }
        }
    }
    const content = { 
        text: options.text,
        footer: options.footer,
        title: options.title,
        interactiveButtons,
        contextInfo: {
            quotedMessage: options?.quoted?.toBaileys() || options?.quoted,
            expiration: await getGroupData(room, "ephemeralDuration")
        }
    }
    const { sendInteractiveMessage } = require("baileys_helper")
    const sent = new Message(
        await queue("socket", null, () => sendInteractiveMessage(socket, room, content)),
        { senderIsAdmin: await groupStore.isUserAdmin(getBotInfo().id, room) }
    )
    messageStore.add(sent.toBaileys())
    return sent
}

async function getGroupData(jid, key) {
    const data = await groupStore.get(jid)
    return data?.[key]
}

function getMentionsFromText(text) {
  if (!text) return []
  return (text.match(/@\d+/g) || []).map((m) => m.slice(1) + USER_LID);
}

function hashPollOption (name) {
    return createHash('sha256').update(Buffer.from(name)).digest().toString('base64')
}

module.exports = {
    Message, sendMessage
}