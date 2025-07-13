# wachan
Simpler way to code baileys.

## Installation
```bash
npm install wachan
```

## Example
```javascript
const bot = require("wachan")

// Receving a message with the exact text "Hello", then reply with "Hi"
bot.onReceive("Hello", "Hi")

// Use a function as response, first argument is message
bot.onReceive("Hi", async (message) => {
    // Can reply using message.reply()
    await message.reply(`Hi, ${message.sender.name}!`)
    // Can also return a string to reply with a text
    return `Hi, ${message.sender.name}!`
})

// Use a function as input, first argument is also message. This can be used as a filter
bot.onReceive(
    (message) => message.sender.name == "Don",
    "You again"
)

// Start the bot
bot.start()
```