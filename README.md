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

// Use regex as input
bot.onReceive(/good (morning|afternoon|evening)/i, "to you as well")

// Capture part of text, and put it in the output text using <<number/name>>. Numbering starts from 0.
bot.onReceive(/my name is (\w+)/, "Nice to meet you, <<0>>!")
bot.onReceive(/I live in (?<place>\w+)/, "<<place>> must be a nice place to live!")

// Captured texts go to the second argument of output functions
bot.onReceive(/^translate (.+)/, async (message, captures) => {
    const translation = await translate(captures[0])
    return translation
})
bot.onReceive(/I am (?<name>\w+)/, async (message, captures) => {
    return `${captures.name} is a cool name!`
})

// Start the bot
bot.start()
```