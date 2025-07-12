# wachan
Simpler way to code baileys.

## Installation
```bash
npm i @aidulcandra/wachan
```

## Example
```javascript
const bot = require("@aidulcandra/wachan")

bot.receive("Hello").reply({text:"Hi there!"})

bot.start()
```