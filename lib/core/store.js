// const MESSAGE_STORE_PATH = "./wachan/message-store.json"
const USER_STORE_PATH = "./wachan/user-store.json"

const fs = require("fs")
const { extractGroupMetadata } = require("baileys/lib/Socket/groups")
const { getSocket } = require("./socket")
const { queue } = require("../utils/queue")
const { GROUP_JID } = require("../core/constants")

const messageStore = {
    size: 1000,
    list: [],
    get: (key) => {
        if (!key) return null
        return messageStore.list.find(m => m.key.id === key.id && m.key.remoteJid === key.remoteJid) || null
    },
    add: (m) => {
        if (!m) return
        messageStore.list.push(m)
        if (messageStore.list.length > messageStore.size) {
            messageStore.list.splice(0, messageStore.list.length - messageStore.size)
        }
    }
}

const groupStore = {
    list: {},
    get: async (jid, raw = false) => {
        const socket = getSocket();
        if (!socket) throw new Error("Store: Socket is not connected");
        if (!jid.endsWith(GROUP_JID)) return
        if (!groupStore.list[jid]) {
            try {
                const result = await queue("socket", null, () => socket.query({
                    tag: "iq",
                    attrs: {type: "get", xmlns: "w:g2", to: jid},
                    content: [{tag:"query", attrs:{request:"interactive"}}]
                }))
                
                groupStore.list[jid] = result
            } catch {return null}
        }
        return raw ? groupStore.list[jid] : extractGroupMetadata(groupStore.list[jid]);
    },
    refresh: async (jid) => {
        delete groupStore.list[jid]
        return await groupStore.get(jid)
    },
    isUserAdmin: async (id, groupId) => {
        const group = await groupStore.get(groupId);
        if (!group) return null;
        return group.participants.some(p => p.id === id && p.admin);
    }
}

const userStore = {
    list: (()=>{
        try {
            return JSON.parse(fs.readFileSync(USER_STORE_PATH))
        } catch (e) {
            return []
        }
    })(),
    find: (id) => {
        return userStore.list.find(u=>u.id===id || u.lid===id) || null
    },
    add: (id, pushName, lid, save=true) => {
        let changed = false
        if (!id) return
        const existing = userStore.find(id)
        if (existing) {
            if (pushName && existing.pushName !== pushName) {
                existing.pushName = pushName
                changed = true
            }
            if (lid && existing.lid !== lid) {
                existing.lid = lid
                changed = true
            }
        }
        else {
            userStore.list.push({id, pushName, lid})
            changed = true
        }
        
        if (changed) {
            try {
                if (save) fs.writeFileSync(USER_STORE_PATH, JSON.stringify(userStore.list, null, 2))
            } catch {}
        }
    },
    getPushName: (id) => {
        const user = userStore.find(id)
        return user?.pushName || null
    }
}

const store = { messageStore, groupStore, userStore }

module.exports = {
    store
}