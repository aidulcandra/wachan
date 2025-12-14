const AUTH_STATE_PATH = "./wachan/state"

const readline = require("readline");
const fs = require("fs");
const {
  default: makeWASocket,
  useMultiFileAuthState,
  Browsers,
  DisconnectReason
} = require("baileys")
const { queue } = require("../utils/queue");

let socket = null
let finishSocketStartup;
queue(
  "socket",
  null,
  () => new Promise((resolve) => (finishSocketStartup = resolve))
);

async function connect(options) {
    const authStatePath = options?.authStatePath || AUTH_STATE_PATH
    const { state, saveCreds } = await useMultiFileAuthState(authStatePath)
    return await new Promise((resolve, reject) => {
        const store = options?.store || {}
        let requestingPhoneNumber = false
        let phoneNumber = options?.phoneNumber || null
        const configOverrides = options?.configOverrides || {}

        socket = makeWASocket({
            auth: state,
            browser: Browsers.windows("Chrome"),
            cachedGroupMetadata: store.groupStore.get,
            getMessage: store.messageStore.get,
            version: [2, 3000, 1027934701],
            ...configOverrides,
            // shouldSyncHistoryMessage: () => false
        });
        if (options.suppressLogs) socket.ws.config.logger.level = "silent"
        socket.ev.on("creds.update", saveCreds);

        const { onReceiveHandler, onReceivePendingHandler, onConnectedHandler, onReadyHandler } = options.behaviors
        // Just checking
        socket.ev.on("messaging-history.set", set => {
            console.log("Messaging History Set:", require("util").inspect(set, {depth:10}))
        })
        socket.ev.on("messages.upsert", onReceiveHandler)
        socket.ev.on("groups.update", async (updates) => {
            for (const update of updates) 
                await store.groupStore.refresh(update.id)
        })
        socket.ev.on("group-participants.update", async (update) => {
            // console.log("Group Participants Update:", require("util").inspect(update, {depth:10}))
            const { id } = update
            await store.groupStore.refresh(id)
        })
        socket.ev.on("connection.update", async (update) => {
            if (update.connection == "close") {
                const reason = update.lastDisconnect?.error?.output?.statusCode;
                if (reason == "401" || reason == "405") {
                    fs.rmSync(authStatePath, { recursive: true });
                    return reject(new Error("Unauthorized"));
                } else if (reason == DisconnectReason.restartRequired) {
                    return resolve({requiresRestart: true});
                }
                else return reject(new Error("Connection closed with reason: " + reason));
            }
            if (update.qr && !requestingPhoneNumber) {
                requestingPhoneNumber = true
                const rl = readline.createInterface({
                    input: process.stdin,
                    output: process.stdout,
                })
                while (!phoneNumber) {
                    phoneNumber = await new Promise(resolve => {
                        rl.question("Enter phone number (ex: 12345678901, 628123456789):", (pn) => {
                            resolve(pn.replace(/\D/g,''))
                        })
                    })
                }
                rl.close()
                const code = await socket.requestPairingCode(phoneNumber)
                console.log("Pairing code:", code.slice(0,4), "-", code.slice(4));
            }
            if (update.receivedPendingNotifications === true) {
                finishSocketStartup()
                await onReceivePendingHandler()
                await onReadyHandler()
                return resolve({socket, requiresRestart: false})
            }
            if (update.connection === "open") {
                await onConnectedHandler()
                console.log("Receiving all pending messages...")
            }
        });
    })
}

function getSocket() {
    if (!socket) console.warn("Warning: Socket is not initialized yet.")
    return socket
}

function getBotInfo() {
    const socket = getSocket()
    if (!socket) return null
    return {
        id: socket.user.id.replace(/:\d+/, ""),
        lid: socket.user.lid?.replace(/:\d+/, ""),
        name: socket.user.name,
    }
}

module.exports = { connect, getSocket, getBotInfo }