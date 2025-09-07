const WACHAN_DATA_PATH = "./wachan"

const fs = require("fs")
const { connect, getSocket } = require("./lib/core/socket")
const { store } = require("./lib/core/store")
const { setUpBehaviors, addReceiver, addConnectedCallback, addReadyCallback } = require("./lib/core/behaviors")
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

async function waitForMessage(options, timeout=10000) {
    let receiver
    const result = await new Promise(resolve => {
        receiver = onReceive(options, m=>resolve(m))
        setTimeout(resolve, timeout)
    })
    receiver.remove()
    return result
}


async function start() {
    if (!fs.existsSync(WACHAN_DATA_PATH)) {
        fs.mkdirSync(WACHAN_DATA_PATH)
    }
    const behaviors = setUpBehaviors({settings})
    store.messageStore.size = settings.messageStoreSize
    while (true) {
        try {
            console.clear()
            console.log("", "🗨 WACHAN".green, `v${wachan.version}`.gray, "\n")
            console.log("Wachan is connecting...".green)
            const {socket, requiresRestart} = await connect({store, behaviors})
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

module.exports = { 
    onConnected, onReady, onReceive, start, 
    sendMessage, waitForMessage,
    settings, getSocket
}