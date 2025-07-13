const { Receiver } = require("./lib/classes/receiver")
const { connect } = require("./lib/core/socket")
const { store } = require("./lib/core/store")
const { setUpBehaviors } = require("./lib/core/behaviors")
const { settings } = require("./lib/core/settings")
require("colors");

const receivers = []

function onReceive(options, response) {
    const opt = typeof options === "string"
        ? {text: options}
        : typeof options === "function"
            ? {filter: options}
            : options
    const callback = typeof response === "function"
        ? response
        : () => response
        
    const receiver = new Receiver(opt)
    receivers.push({receiver, callback})
    return receiver
}

async function start() {
    while (true) {
        try {
            const {socket, requiresRestart} = await connect({store})
            if (requiresRestart) {
                console.log("Socket requires restart. Restarting...".yellow);
                continue;
            }
            setUpBehaviors(socket, receivers, settings)
            return {socket}
        } catch (error) {
            console.error("Socket connection failed:".red, error.message.red)
        }
    }
}

module.exports = { onReceive, start, receivers, settings }