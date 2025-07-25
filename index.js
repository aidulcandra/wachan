const { Receiver } = require("./lib/classes/receiver")
const { connect, getSocket } = require("./lib/core/socket")
const { store } = require("./lib/core/store")
const { setUpBehaviors } = require("./lib/core/behaviors")
const { settings } = require("./lib/core/settings")
const wachan = require("./package.json")
require("colors");

const receivers = []

function onReceive(options, response) {
    const opt = typeof options === "string"
        ? {text: options}
        : typeof options === "function"
            ? {filter: options}
            : options instanceof RegExp
                ? {regex: options}
                : options
    const receiver = new Receiver(opt)
    receivers.push({receiver, response})
    return receiver
}

async function start() {
    while (true) {
        try {
            console.clear()
            console.log("", "🗨 WACHAN".green, `v${wachan.version}`.gray, "\n")
            console.log("Wachan is starting connection...".green)
            const {socket, requiresRestart} = await connect({store})
            if (requiresRestart) {
                console.log("Wachan needs to restart. Restarting...".yellow);
                continue;
            }
            setUpBehaviors(socket, receivers, settings)
            console.log("Connected!".green)
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

module.exports = { onReceive, start, receivers, settings, getSocket }