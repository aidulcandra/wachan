
const { extractGroupMetadata } = require("baileys/lib/Socket/groups");
const  { getSocket } = require("./socket");
const { queue } = require("../utils/queue");

const groupStore = {}
const messageStore = {}

async function getGroup(jid, raw=false) {
  const socket = getSocket();
  if (!socket) throw new Error("Store: Socket is not connected");
  if (!groupStore[jid]) {
    try {
      const result = await queue("socket", null, () => socket.query({
        tag: "iq",
        attrs: {type: "get", xmlns: "w:g2", to: jid},
        content: [{tag:"query", attrs:{request:"interactive"}}]
      }))
      
      groupStore[jid] = result
    } catch {return null}
  }
  return raw ? groupStore[jid] : extractGroupMetadata(groupStore[jid]);
}

async function getMessage(key) {
  if (!key) return null
  const serializedKey = `${key.id}_${key.remoteJid}`
  return messageStore[serializedKey] || null
}

const store = { getGroup, getMessage }

module.exports = {
  store
}