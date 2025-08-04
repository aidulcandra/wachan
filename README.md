English | [Bahasa Indonesia](./README.id.md)

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

// When wachan succesfully connected (processed before offline messages)
bot.onConnected(async () => {
    await bot.sendText(targetId, "Wachan is connected!")
})

// When wachan is ready (processed after offline messages)
bot.onReady(async () => {
    await bot.sendText(targetId, "Finished reading all unread messages!")
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
These settings can be altered in the meantime by accessing `bot.settings`. To save the changes so that it will take effect next run, use `bot.settings.save()`.
#### Explanation on each item:
- `receiveOfflineMessages`: If set to `true`, will allow messages received when offline to be processed by `bot.onReceive`.

## Bot Object
This is what wachan module exports:<br><br>
`bot`: Wachan bot object
- `bot.onConnected(callback)` - Set up the action to be taken when wachan is succesfully connected to whatsapp, <b>before</b> processing offline messages.
- `bot.onReady(callback)` - Set up the action to be taken <b>after</b> processing offline messages.
- `bot.onReceive(input, response)` - Set up a receiver that responds to incoming messages of specified input.
    - `input`: can be a string, regex, or function.
        - string: will match the exact string of the message text
        - regex: will match the pattern of the message text
        - function, `input(message)`: will filter the message based on the return value
    - `response`: can be a string, an object, or a function.
        - string: will reply to (and quote) the received message with the string as the text
        - object: will reply to (and quote) the received message with `response.text` if it's there
        - function: `response(message, captures)`, will execute the function. [Explanation here](#response-function)
- `bot.sendMessage(targetId, message)` - Send a message
    - `targetId` - the ID of the chatroom to send to
    - `message` - can be a string / object
        - string: send a text message
        - object: can send a message with more options
            - `message.text`: text/caption to send
            - `message.quoted`: message to be quoted
- `bot.start()` - Start the bot.
- `bot.settings` - Settings for the bot. See [here](#explanation-on-each-item)
    - `bot.settings.receiveOfflineMessages`
    - `bot.settings.save()` - Save the settings. Do this after modifying the settings programmatically.
- `bot.getSocket()` - Get the original baileys' socket object.

## Response Function
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
- `message.reply(response)` - Reply to the message.
    - `response` - Can be a string / object
        - string: reply with this text
        - object: can use more options
            - `response.text` - Reply with this text/caption
            - `response.quoted` - Message to quote (by default, the received message). If set to `null`, it will not quote anything.
- `message.toBaileys()` - Return the original baileys message object.

### Captures
The second argument, `captures` is an object <b>(not an array)</b> of captured text from regex inputs.

The keys depend on the regex. If using regular capturing using brackets, then the result is stored with numeric keys (starting from 0). If using <i>named capture</i>, then the key is a string.

Input Regex|Received message text|`captures`
-|-|-
`/My name is (\S+)\. I live in (\S+)\./` | `"My name is Wachan. I live in NPM."` | `{"0":"Wachan", "1":"NPM"}`
`/My name is (?<name>\S+)\. I live in (?<location>\S+)\./` | `"My name is Wachan. I live in NPM."` | `{"name":"Wachan", "location":"NPM"}`
<hr>

`captures.toArray()` returns the array of the captures with numeric keys. Useful for doing array operations on it.

### Returned Value
In the response function, you can return a string/object:
- string: Reply to the received message with this text.<br>Example:
```js
bot.onReceive("test", async () => {
    const a = "bro"
    return `Hello, ${a}!`
})

bot.onReceive("test", async (msg) => `Hello, ${msg.sender.name}!`)
```
- object: Can use more options.<br>Example:
```js
bot.onReceive("test", async () => {
    return {text: "Text"}
})
```
Available options, assuming `r` is the returned value:

- `r` - The returned object
    - `r.text` - Text/caption to be sent
    - `r.quoted` - Message to be quoted. By default it's the received message. Can be changed or set to `null`.

<b>Note:</b> Since `bot.sendMessage()` and `message.reply()` return a message object which contains a `text` property, returning the result of these functions can make your bot send message twice. For example:
```js
bot.onReceive("test", async (msg) => {
    // this will send 2 messages
    // 1. from the effect of the msg.reply()
    // 2. from returning the resulting message object created by msg.reply()
    return await msg.reply("ok")
})
```

## Custom Functionality
Exposed are these items for programming custom functionalities.
1. Baileys' socket object: `bot.getSocket()`
2. Message's original object: `message.toBaileys()`