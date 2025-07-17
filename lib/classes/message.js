const { extractMessageContent } = require("baileys")
const { GROUP_JID, USER_JID } = require("../core/constants")
const { store } = require("../core/store")
const { getSocket } = require("../core/socket")
const { settings } = require("../core/settings")
const { queue } = require("../utils/queue")

class Message {
    constructor (m, receivedOnline = true) {
        this.room = m.key.remoteJid
        const senderId = m.key.fromMe ? getBotId() : (m.key.participant || m.key.remoteJid) 
        this.sender = this.sender = {
            id: senderId,
            isMe: m.key.fromMe,
            name: m.key.fromMe ? getBotName() : m.pushName,
            isOwner: isOwner(senderId),
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
        this.receivedOnline = receivedOnline
        this.toBaileys = () => m
    }

    async reply (options) {
        const text = typeof options === "string"
            ? options
            : options?.text
        if (!text) return
        const ephemeralExpiration = await getEphemeralExpiration(this.room)
        const mentions = getMentionsFromText(text)
        return new Message(await sendMessage(this.room, {text, mentions}, {quoted:this.toBaileys(), ephemeralExpiration}))
    }
}

async function sendMessage(jid, message, options = {}) {
    const socket = getSocket();
    if (!socket) return null
    return await queue("socket", null, () => socket.sendMessage(jid, message, options))
}

async function getEphemeralExpiration(jid) {
  if (jid.endsWith(GROUP_JID)) {
    const data = await store.getGroup(jid)
    return data.ephemeralDuration
  } else {
    return 
  }
}

function getMentionsFromText(text) {
  if (!text) return []
  return (text.match(/@\d+/g) || []).map((m) => m.slice(1) + USER_JID);
}

function getBotId() {
    const socket = getSocket()
    if (!socket) return null
    return socket.user.id.replace(/:\d+/,"")
}

function getBotName() {
    const socket = getSocket()
    if (!socket) return null
    return socket.user.name
}

function isOwner(jid) {
    return settings.ownerIds.includes(jid)
}

module.exports = {
    Message
}