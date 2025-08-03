const { Message } = require("../classes/message");
const { Receiver } = require("../classes/receiver");
const { store } = require("./store");

const pendingMessages = []
const receivers = []
const connectedCallbacks = []
const readyCallbacks = []

function setUpBehaviors({settings}) {
    return {
        onReceiveHandler: async (update) => {
            if (update.type === "append") {
                if (!settings.receiveOfflineMessages) return
                pendingMessages.push(...update.messages)
                return
            }
            await processMessages(update)
        },
        onReceivePendingHandler: async () => {
            await processMessages({type: "append", messages: pendingMessages})
        },
        onConnectedHandler: async () => {
            for (const cb of connectedCallbacks) {
                try {
                    await cb()
                } catch (error) {
                    console.log("Error in onConnected callback:", error.message.red)
                }
            }
        },
        onReadyHandler: async () => {
            for (const cb of readyCallbacks) {
                try {
                    await cb()
                } catch (error) {
                    console.log("Error in onReady callback:", error.message.red)
                }
            }
        },
    }

    async function processMessages(update) {
        for (const m of update.messages) {
            const group = await store.getGroup(m.key.remoteJid)
            const senderAsParticipant = group?.participants?.find(p => p.id === m.key.participant || p.id === m.key.remoteJid)
            const senderIsAdmin = senderAsParticipant === undefined ? null : !!senderAsParticipant?.admin
            const context = {
                receivedOnline: update.type === "notify",
                senderIsAdmin
            }
            const message = new Message(m, context);
            for (const { receiver, response } of receivers) {
                const testResult = await receiver.test(message);
                if (!testResult) continue
                if (!response) continue
                let value
                const captures = testResult.captures || {}
                switch (typeof response) {
                    case "function": value = await response(message, captures); break;
                    case "string": value = testResult.captures 
                        ? response.replace(/<<(.+)>>/g, (m,item)=>captures[item]||m)
                        : response; break;
                    default: value = response;
                }
                if (typeof value === "string") await message.reply(value)
                else if (value?.text) await message.reply(value.text)
            }
        }
    }
}

function addReceiver(options, response) {
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

function addConnectedCallback(callback) {
    if (typeof callback !== "function") {
        throw new Error("onConnected callback must be a function")
    }
    connectedCallbacks.push(callback)
}

function addReadyCallback(callback) {
    if (typeof callback !== "function") {
        throw new Error("onReady callback must be a function")
    }
    readyCallbacks.push(callback)
}

module.exports = { 
    setUpBehaviors, addReceiver, addConnectedCallback, 
    addReadyCallback
}