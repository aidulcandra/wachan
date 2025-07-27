const { Message } = require("../classes/message");

function setUpBehaviors(socket, receivers, settings) {
    socket.ev.on("messages.upsert", async (update) => {
        if (!settings.receiveOfflineMessages && update.type === "append") return;
        for (const m of update.messages) {
            const message = new Message(m, update.type === "notify");
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