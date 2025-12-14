const { Message } = require("../classes/message")
const { Receiver } = require("../classes/receiver")
const { NextSignal } = require("../classes/next-signal")
const { store: { messageStore, groupStore, userStore } } = require("./store")

const pendingMessages = []
const receivers = []
const connectedCallbacks = []
const readyCallbacks = []
const errorCallbacks = []

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
    if (typeof response === "function" && response.length > 2) {
        console.warn("Deprecation Warning: Receiver response functions' arguments will be simplified in the next major version. See documentation for details.".yellow)
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

function addErrorCallback(callback) {
    if (typeof callback !== "function") {
        throw new Error("onError callback must be a function")
    }
    errorCallbacks.push(callback)
}

async function processMessages(update, settings) {
    nextMessage: for (const m of update.messages) {
        if (m.key.remoteJid === "status@broadcast") continue
        messageStore.add(m)
        const group = await groupStore.get(m.key.remoteJid)
        const senderAsParticipant = group?.participants?.find(p => p.id === m.key.participant || p.id === m.key.remoteJid)
        const senderIsAdmin = senderAsParticipant === undefined ? null : !!senderAsParticipant?.admin
        const defaultBotName = settings.defaultBotName
        const context = {
            receivedOnline: update.type === "notify",
            senderIsAdmin,
            defaultBotName
        }
        const message = new Message(m, context);
        userStore.add(message.sender.id, message.sender.name, message.sender.lid)
        const groupChat = group
            ? {
                id: group.id,
                subject: group.subject,
                description: group.desc,
                getParticipants: () => group.participants.map(p => ({ id: p.id, lid: p.lid })),
                getAdmins: () => group.participants.filter(p => p.admin).map(p => ({ id: p.id, lid: p.lid })),
                getMembers: () => group.participants.filter(p => !p.admin).map(p => ({ id: p.id, lid: p.lid })),
            } : null
        for (const { receiver, response } of receivers) {
            const testResult = await receiver.test(message);
            if (!testResult) continue
            if (!response) continue
            let value
            const captures = testResult.captures || {}
            const next = () => { throw new NextSignal() }
            switch (typeof response) {
                case "function": {
                    try {
                        // will be simplified next major version
                        // applying the new argument structure, while keeping backward compatibility
                        message.message = message
                        message.captures = captures
                        const newNext = () => next()
                        Object.assign(newNext, captures)
                        value = await response(message, newNext, groupChat, next)
                        break
                    } catch (error) {
                        if (error instanceof NextSignal) continue
                        console.log("Error in receiver response function:", error.message.red)
                        for (const cb of errorCallbacks) {
                            const context = { message, captures, groupChat } // group chat will ber removed
                            const value = await cb(error, context)
                            await message.reply(value)
                        }
                        continue nextMessage
                    }
                }
                case "string": value = testResult.captures 
                    ? response.replace(/<<(.+)>>/g, (m,item)=>captures[item]||m)
                    : response; break;
                default: value = response;
            }
            await message.reply(value)
            continue nextMessage
        }
    }
}

module.exports = { 
    setUpBehaviors, addReceiver, addConnectedCallback, 
    addReadyCallback, addErrorCallback, processMessages, pendingMessages,
    receivers, connectedCallbacks, readyCallbacks, errorCallbacks
}