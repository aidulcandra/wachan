const WACHAN_DATA_PATH = "./wachan"

const fs = require("fs")
const { connect, getSocket } = require("./lib/core/socket")
const { store } = require("./lib/core/store")
const { setUpBehaviors, addReceiver, addConnectedCallback, addReadyCallback, addErrorCallback } = require("./lib/core/behaviors")
const { sendMessage } = require("./lib/classes/message")
const { settings } = require("./lib/core/settings")
const wachan = require("./package.json")
require("colors");

async function onConnected(callback) {
    addConnectedCallback(callback)
}

async function onReady(callback) {
    addReadyCallback(callback)
}

function onReceive(options, response) {
    return addReceiver(options, response)
}

function onReceiveReply(message, response) {
    return addReceiver(
        message 
            ? m => m.getQuoted().then(q => q?.id === message.id)
            : m => m.getQuoted().then(q => q != null),
        response
    )
}

function onError(response) {
    return addErrorCallback(response)
}

async function waitForMessage(options, timeout=10000) {
    let receiver
    const result = await new Promise(resolve => {
        receiver = onReceive(options, context=>resolve(context.message))
        setTimeout(resolve, timeout)
    })
    receiver.remove()
    return result
}

async function getGroupData(jid) {
    const group = await store.groupStore.get(jid)
    return group ? {
        id: group.id,
        subject: group.subject,
        description: group.desc,
        getParticipants: () => group.participants.map(p => ({ id: p.id, lid: p.lid })),
        getAdmins: () => group.participants.filter(p => p.admin).map(p => ({ id: p.id, lid: p.lid })),
        getMembers: () => group.participants.filter(p => !p.admin).map(p => ({ id: p.id, lid: p.lid })),
    } : null
}

async function getUserData(id) {
    if (!id) return null
    return store.userStore.find(id)
}

async function start(options = {}) {
    if (!fs.existsSync(WACHAN_DATA_PATH)) {
        fs.mkdirSync(WACHAN_DATA_PATH)
    }
    const behaviors = setUpBehaviors({settings})
    store.messageStore.size = settings.messageStoreSize
    while (true) {
        try {
            // console.clear()
            console.log("", "🗨 WACHAN".green, `v${wachan.version}`.gray, "\n")
            console.log("Wachan is connecting...".green)
            const phoneNumber = options.phoneNumber
            if (phoneNumber && typeof phoneNumber !== "string") throw new Error("index: start: 'phoneNumber' option must be a string".red)
            const suppressLogs = options.suppressBaileysLogs ?? true
            const configOverrides = options.baileysConfigOverrides || {}
            const {socket, requiresRestart} = await connect({store, behaviors, phoneNumber, suppressLogs, configOverrides})
            if (requiresRestart) {
                console.log("Wachan needs to restart. Restarting...".yellow);
                continue;
            }
            console.log("Ready!".green)
            return {socket}
        } catch (error) {
            if (error.message == "Unauthorized") {
                console.log("Wachan needs re-login. Relogging in...".yellow)
                continue
            }
            console.error("Wachan failed to connect to whatsapp:".red, error.message.red)
            break
        }
    }
}

const bot = { 
    onConnected, onReady, onReceive, onReceiveReply, onError, start, 
    sendMessage, waitForMessage,
    getGroupData, getUserData,
    settings, getSocket,
    messageType: { 
        any: 0, nonmedia:1, media: 2,
        text: 10, reaction: 11, buttonReply: 12,
        image: 20, video: 21, gif: 22, audio: 23, sticker: 24, document: 25, vn: 26
    }
}

module.exports = bot