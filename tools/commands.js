const fs = require("fs")

const { onReceive, settings } = require("../index")

const prefixes = settings.commandPrefixes ??= ["/"]

function add(commandName, response, options = {}) {
    const names = [commandName, ...options.aliases||[]]
    const prefixRegex = prefixes.map(escapeRegExp).join("|")
    const nameRegex = names.map(escapeRegExp).join("|")
    const pattern = `^(?<prefix>${prefixRegex})\\s*(?<commandName>${nameRegex})\\b(?:\\s+(?<paramString>.+))?`
    const commandRegex = new RegExp(pattern, "i")
    return onReceive(commandRegex, async function (message, captures) {
        const { prefix, commandName, paramString } = captures
        const separator = options.separator || " "
        const params = paramString?.split(separator) || []
        return typeof response === "function"
            ? response(message, params, commandName, prefix)
            : response
    })
}

function fromFile(commandName, filePath) {
    if (!filePath) {
        console.error("wachan/commands/fromFile: Required arguments: commandName, filePath".red)
        return
    }
    if (!fs.existsSync(filePath)) {
        console.error(`wachan/commands/fromFile: Command file "${filePath}" does not exist.`.red)
        return
    }
    try {
        const command = require(process.cwd() + "/" + filePath)
        if (!command.response) {
            console.error(`wachan/commands/fromFile: Command file "${filePath}" does not export a response function.`.red)
            return
        }
        add(commandName, command.response, command.options)
        console.log(`Loaded command "${commandName}" from file "${filePath}".`.blue)
    } catch (error) {
        console.error(`wachan/commands/fromFile: Error loading command file "${filePath}":`.red, error.message.red)
    }
}

function addPrefix(prefix) {
    if (!settings.commandPrefixes.includes(prefix)) settings.commandPrefixes.push(prefix)
    settings.save()
}

function removePrefix(prefix) {
    const pos = settings.commandPrefixes.indexOf(prefix)
    if (pos !== -1) settings.commandPrefixes.splice(pos, 1)
    settings.save()
}

function fromFolder(folderPath) {
    if (!fs.existsSync(folderPath)) {
        console.error(`Wachan/Commands: Commands folder "${folderPath}" does not exist.`.red)
        return
    }
    const files = fs.readdirSync(folderPath)
    for (const file of files) {
        if (file.endsWith(".js")) {
            const commandName = file.slice(0, -3)
            const filePath = `${folderPath}/${file}`
            fromFile(commandName, filePath)
        }
    }
}

function escapeRegExp(text) {
  return text.replace(/[-[\]{}()*+?.,\\^$|#\s]/g, "\\$&");
}

module.exports = { add, fromFile, fromFolder, addPrefix, removePrefix }