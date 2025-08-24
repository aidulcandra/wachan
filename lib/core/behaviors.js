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
            await processMessages(update, settings)
        },
        onReceivePendingHandler: async () => {
            await processMessages({type: "append", messages: pendingMessages}, settings)
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
}

function addReceiver(input, response) {
    const receiver = new Receiver(input)
    receiver.remove = () => {
        const index = receivers.findIndex(r => r.receiver.id === receiver.id)
        if (index !== -1) receivers.splice(index, 1)
    }
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
async function processMessages(update, settings) {
    for (const m of update.messages) {
        if (m.key.remoteJid === "status@broadcast") continue
        const group = await store.getGroup(m.key.remoteJid)
        const senderAsParticipant = group?.participants?.find(p => p.id === m.key.participant || p.id === m.key.remoteJid)
        const senderIsAdmin = senderAsParticipant === undefined ? null : !!senderAsParticipant?.admin
        const defaultBotName = settings.defaultBotName
        const context = {
            receivedOnline: update.type === "notify",
            senderIsAdmin,
            defaultBotName
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
            await message.reply(value)
        }
    }
}

module.exports = { 
    setUpBehaviors, addReceiver, addConnectedCallback, 
    addReadyCallback, processMessages, pendingMessages,
    receivers, connectedCallbacks, readyCallbacks
}