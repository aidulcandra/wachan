
const { extractGroupMetadata } = require("baileys/lib/Socket/groups");
const  { getSocket } = require("./socket");
const { queue } = require("../utils/queue");
const { GROUP_JID } = require("../core/constants");

const groupStore = {}
const messageStore = {}

async function getGroup(jid, raw=false) {
  const socket = getSocket();
  if (!socket) throw new Error("Store: Socket is not connected");
  if (!jid.endsWith(GROUP_JID)) return
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

async function isUserAdmin(id, groupId) {
  const group = await getGroup(groupId);
  if (!group) return null;
  return group.participants.some(p => p.id === id && p.admin);
}

const store = { getGroup, getMessage, isUserAdmin }

module.exports = {
  store
}