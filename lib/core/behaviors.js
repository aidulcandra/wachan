const { Message } = require("../classes/message");

function setUpBehaviors(socket, receivers, settings) {
    socket.ev.on("messages.upsert", async (update) => {
        if (!settings.processOfflineMessages && update.type === "append") return;
        for (const m of update.messages) {
            const message = new Message(m, update.type === "notify");
            for (const { receiver, callback } of receivers) {
                const testResult = await receiver.test(message);
                if (testResult) {
                    if (callback) {
                        const v = await callback(message);
                        if (typeof v === "string") await message.reply(v);
                        else if (v?.text) await message.reply(v.text)
                    }
                }
            }
        }
    });
}        

module.exports = { setUpBehaviors }