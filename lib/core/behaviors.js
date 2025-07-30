const { Message } = require("../classes/message");
const { store } = require("./store");

function setUpBehaviors(socket, receivers, settings) {
    socket.ev.on("messages.upsert", async (update) => {
        if (!settings.receiveOfflineMessages && update.type === "append") return;
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
                const captures = testResult.captures || []
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
    });
}        

module.exports = { setUpBehaviors }