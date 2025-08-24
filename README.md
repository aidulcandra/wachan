English | [Bahasa Indonesia](./README.id.md)

# wachan
Simpler way to code baileys.

## Contents
- [Installation](#installation)
- [Example](#example)
- [Settings File](#settings-file)
    - [Default Settings](#default-settings)
    - [Explanation](#explanation-on-each-item)
- [Bot Object](#bot-object)
- [Response Function](#response-function)
    - [Message Object](#message-object)
    - [Captures](#captures)
    - [Returned Value](#returned-value)
- [Message Sending Options](#message-sending-options)
- [Custom Functionality](#custom-functionality)
- [Changelog](#changelog)

## Installation
```bash
npm install wachan
```

## Example
3 types of inputs:
```javascript
const bot = require("wachan")

// 1) String Input: Respond to messages that have the exact text.
bot.onReceive("Hello", "Hi")

// 2) Regex Input: Respond to messages that have the pattern in the text.
bot.onReceive(/good (morning|afternoon|evening)/i, "to you as well")

// 3) Function Input: Respond to messages if the function returns true
bot.onReceive((msg)=>msg.sender.id===OWNER_ID, "hello boss")
```

3 Types of responses:
```js
// 1) String response: Text message
bot.onReceive("Marco", "Polo")

// 2) Object response: More sending options
bot.onReceive("send image", {image:"buffer, url, or path", caption:"This is the caption"})
bot.onReceive("send video", {video:"...", caption:"..."})
bot.onReceive("send gif", {gif:"...", caption:"..."}) // must send a video file for it to animate as whatsapp does not support gif files
bot.onReceive("send audio", {audio:"..."})
bot.onReceive("send sticker", {sticker:"..."}) // webp file

// 3) Function response: Custom actions
bot.onReceive("test", async (message, captures) => {
    const options = {...}

    // 3 ways of sending message:
    // 1) Using bot.sendMessage()
    await bot.sendMessage(TARGET_ID, "string for text message")
    await bot.sendMessage(TARGET_ID, options) // more sending options

    // 2) Using message.reply()
    await message.reply("string for text message")
    await message.reply(options) // more sending options

    // 3) Returning a value (equivalent to message.reply)
    return "string for text message"
    return options // more sending options
})
```

Other events:
```js
// When wachan succesfully connected (processed before offline messages)
bot.onConnected(async () => {
    await bot.sendText(targetId, "Wachan is connected!")
})

// When wachan is ready (processed after offline messages)
bot.onReady(async () => {
    await bot.sendText(targetId, "Finished reading all unread messages!")
})
```

Starting the bot:
```js
bot.start()
```

## Settings File
### Default Settings
When first run, a default settings file is created if it's not there.
```json
{
  "receiveOfflineMessages": true,
  "defaultBotName": "Wachan"
}
```
These settings can be altered in the meantime by accessing `bot.settings`. To save the changes so that it will take effect next run, use `bot.settings.save()`.
#### Explanation on each item:
- `receiveOfflineMessages`: If set to `true`, will allow messages received when offline to be processed by `bot.onReceive`.
- `defaultBotName`: Will use this name if bot's own message doesn't have `message.sender.name`

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
        - object: will reply to (and quote) the received message using data from the object. See [here](#message-sending-options)
        - function: `response(message, captures)`, will execute the function. [Explanation here](#response-function)
    - returns: a `Receiver` object. This Receiver can be removed to stop its behavior by calling `receiver.remove()`
- `bot.sendMessage(targetId, options)` - Send a message
    - `targetId` - the ID of the chatroom to send to
    - `options` - can be a string / object
        - string: send a text message
        - object: can send a message with more options. See [here](#message-sending-options)
- `bot.start()` - Start the bot.
- `bot.settings` - Settings for the bot. See [here](#explanation-on-each-item)
    - `bot.settings.receiveOfflineMessages`
    - `bot.settings.defaultBotName`
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
- `message.type` - Type of this message. Can be one of these: `"text"`, `"image"`, `"video"`, `"gif"`, `"audio"`, `"sticker"`, `"document"`
- `message.isMedia` - `true` if this is a media message (type = `"image"`, `"video"`, `"gif"`, `"audio"`, `"sticker"`, or `"document"`)
- `message.text` - Text or caption of the message.
- `message.receivedOnline` - `true` if this message is received when bot is online.
- `message.reply(options)` - Reply to the message.
    - `options` - Can be a string / object
        - string: reply with this text
        - object: can use more options. See [here](#message-sending-options)
- `message.toBaileys()` - Return the original baileys message object.

### Captures
The second argument, `captures` is an object <b>(not an array)</b> of captured text from regex inputs.

The keys depend on the regex. If using regular capturing using brackets, then the result is stored with numeric keys (starting from 0). If using <i>named capture</i>, then the key is a string.

Input Regex|Received message text|`captures`
-|-|-
`/My name is (\S+)\. I live in (\S+)\./` | `"My name is Wachan. I live in NPM."` | `{"0":"Wachan", "1":"NPM"}`
`/My name is (?<name>\S+)\. I live in (?<location>\S+)\./` | `"My name is Wachan. I live in NPM."` | `{"name":"Wachan", "location":"NPM"}`
<hr>

`captures.toArray()` returns the array of the captures. Useful for doing array operations on it.

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
## Message Sending Options
In conclusion, there are 4 methods to send a message:
1. Using `bot.sendMessage(targetId, options)`
2. Using an object in the second parameter of `bot.onReceive(input, response)`, which is the `response`.
3. Using `message.reply(options)`
4. Returning an object inside a response function

If the object is a string, then the message will be sent as a text message. However, if it's an object with properties, then it should support these options in the object:
- `options` - The message sending options
    - `options.text` - Text/caption to be sent
    - `options.quoted` - Message to be quoted. By default it's the received message (if using method 2, 3, 4). Can be changed or set to `null`.
    - `options.image` - Image to send. It can be a buffer, a url or a path.
    - `options.video` - Video to send. It can be a buffer, a url or a path.
    - `options.gif` - Video to send as gif. It can be a buffer, a url or a path. (Whatsapp does not actually support GIF files. If you send a GIF file, it won't animate)
    - `options.audio` - Audio to send. It can be a buffer, a url or a path.
    - `options.sticker` - WebP file to send as sticker (buffer/url/path)
    - `options.document` - A file to send as document. Supporting properties:
        - `options.mimetype` - Mimetype for this document/file
        - `options.fileName` - Filename for this document/file

<b>Note:</b> Since `bot.sendMessage()` and `message.reply()` return a message object which contains a `text` property, returning the result of these functions inside a response function can make your bot send message twice. For example:
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

<hr>
<br>
<br>

# Changelog

## [Unreleased]
### Fixed
- `message.receivedOnline` can now be `false`

## [1.7.0] - 2025-08-23
### Added
- Support sticker message
- Support document message
- `bot.onReceive()` now returns a `Receiver` object.
- `Receiver` objects created from `bot.onReceive()` can be removed using `.remove()` method.
### Fixed
- Sending a message to a @lid id no longer throws an error

## [1.6.0] - 2025-08-12
### Added
- Support video message
- Support gif message
- Support audio message