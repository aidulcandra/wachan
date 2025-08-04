const { extractMessageContent } = require("baileys")
const { USER_JID, GROUP_JID } = require("../core/constants")
const { store } = require("../core/store")
const { getSocket, getBotInfo } = require("../core/socket")
const { queue } = require("../utils/queue")

class Message {
    constructor (m, context) {
        const botInfo = getBotInfo()
        this.room = m.key.remoteJid
        const senderId = m.key.fromMe ? botInfo.id : (m.key.participant || m.key.remoteJid) 
        this.sender = {
            id: senderId,
            isMe: m.key.fromMe,
            name: m.key.fromMe ? botInfo.name : m.pushName,
            isAdmin: context?.senderIsAdmin
        }
        const realMessage = extractMessageContent(
            m.message?.protocolMessage?.editedMessage ||
            m.message?.groupMentionedMessage?.message ||
            m.message?.viewOnceMessage?.message ||
            m.message?.viewOnceMessageV2?.message ||
            m.message 
        )
        this.text = realMessage?.conversation
            || realMessage?.extendedTextMessage?.text
            || realMessage?.documentMessage?.caption
            || realMessage?.imageMessage?.caption
            || realMessage?.liveLocationMessage?.caption
            || realMessage?.videoMessage?.caption
            || realMessage?.groupMentionedMessage?.text
        this.receivedOnline = context?.receivedOnline || true
        this.toBaileys = () => m
    }

    async reply (options) {
        const opt = typeof options === "string"
            ? {text: options}
            : options
        return await sendMessage(this.room, {quoted: this, ...opt})
    }
}

async function sendMessage(room, options) {
    const socket = getSocket();
    if (!socket) return null
    if (!room) throw new Error("sendMessage: No room id specified")
    if (!room.endsWith(USER_JID) && !room.endsWith(GROUP_JID)) 
        throw new Error(`sendMessage: Invalid room id ${room}, must be a user or group chat`)
    const text = typeof options === "string" 
        ? options
        : options?.text
    if (!text) return null
    const mentions = getMentionsFromText(text)
    const quoted = options?.quoted?.toBaileys() || options?.quoted
    const ephemeralExpiration = await getGroupData(room, "ephemeralDuration")
    const message = { text: text,  mentions }
    const sendingOptions = { quoted, ephemeralExpiration }
    return new Message(
        await queue("socket", null, () => socket.sendMessage(room, message, sendingOptions)),
        { senderIsAdmin: await store.isUserAdmin(getBotInfo().id, room)}
    )
}

async function getGroupData(jid, key) {
    const data = await store.getGroup(jid)
    return data?.[key]
}

function getMentionsFromText(text) {
  if (!text) return []
  return (text.match(/@\d+/g) || []).map((m) => m.slice(1) + USER_JID);
}

module.exports = {
    Message, sendMessage
}