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

## Settings File
### Default Settings
When first run, a default settings file is created if it's not there.
```json
{
  "receiveOfflineMessages": true,
}
```
These settings can be altered in the meantime by accessing `bot.settings`. To save the changes so that it will take effect next run, use `bot.settings.save()`. Explanation on each item:
- `receiveOfflineMessages`: If set to `true`, will allow messages received when offline to be processed by `bot.onReceive`.

## Message Handler Function
You can use a function as the response to a message. The first argument is `message` and the second argument is `captures` (if available).
```js
bot.onReceive("test", async function (message, captures) {
    // Code here
})
```
### Message Object
`message`: Wachan message object
- `message.room` - ID of the chat room
- `message.sender` - Sender object
    - `message.sender.id` - ID of the sender
    - `message.sender.isMe` - `true` if the sender is the bot itself
    - `message.sender.name` - Username of the sender.
    - `message.sender.isAdmin` - `true`/`false` if the sender is an admin/not an admin of this group chat. `null` if this message is a private message. (not in a group)
- `message.text` - Text or caption of the message.
- `message.receivedOnline` - `true` if this message is received when bot is online.
- `message.toBaileys()` - Return the original baileys message object.

## Custom Functionality
Exposed are these items for programming custom functionalities.
1. Baileys' socket object: `bot.getSocket()`
2. Message's original object: `message.toBaileys()`