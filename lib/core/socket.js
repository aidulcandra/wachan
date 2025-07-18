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
let connectionState = "closed";
let receivedPending = false;
let finishSocketStartup;
queue(
  "socket",
  null,
  () => new Promise((resolve) => (finishSocketStartup = resolve))
);

async function connect(options) {
    const authStatePath = options?.authStatePath || "./wachan/state";
    const { state, saveCreds } = await useMultiFileAuthState(authStatePath);
    return await new Promise((resolve, reject) => {
        const store = options?.store || {}
        let requestingPhoneNumber = false
        let phoneNumber = null

        socket = makeWASocket({
            auth: state,
            browser: Browsers.windows("Chrome"),
            cachedGroupMetadata: store.getGroup,
            getMessage: store.getMessage
        });
        socket.ws.config.logger.level = "silent"
        socket.ev.on("creds.update", saveCreds);
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
            if (update.connection) connectionState = update.connection;
            if (update.receivedPendingNotifications != undefined) receivedPending = update.receivedPendingNotifications;

            if (receivedPending && connectionState == "open") {
                finishSocketStartup();
                return resolve({socket});
            }
        });
    })
}

function getSocket() {
    if (!socket) console.warn("Warning: Socket is not initialized yet.")
    return socket
}

module.exports = { connect, getSocket }