const fs = require("fs")

const { NextSignal } = require("../lib/classes/next-signal")
const bot = require("../index")
const { onReceive, settings } = bot

const prefixes = settings.commandPrefixes ??= ["/"]

const commandList = []
const commandSections = {}

const preCommandCallbacks = []

function beforeEach(callback) {
    if (callback.length > 2) {
        console.warn("Deprecation Warning: beforeEach callback function's arguments will be simplified into only 2 arguments (context, next) in the next major version. See documentation for details.".yellow)
    }
    preCommandCallbacks.push(callback)
}

function add(commandName, response, options = {}) {
    const names = [commandName, ...options.aliases||[]]
    const prefixRegex = prefixes.map(escapeRegExp).join("|")
    const nameRegex = names.map(escapeRegExp).join("|")
    const pattern = `^(?<prefix>${prefixRegex})\\s*(?<commandName>${nameRegex})\\b(?:\\s+(?<paramString>.+))?`
    const commandRegex = new RegExp(pattern, "is")
    const c = {
        ...options,
        name: commandName,
        description: options.description || "",
        aliases: options.aliases || [],
        hidden: options.hidden || false,
    }
    if (options.sectionName) {
        commandSections[options.sectionName] ??= []
        commandSections[options.sectionName].push(c)
    } else {
        commandList.push(c)
    }
    return onReceive(commandRegex, async function (context, next, group) {
        const { prefix, commandName, paramString } = context.captures
        const separator = options.separator || " "
        const params = paramString?.split(separator) || []

        // Combine into a command context
        const commandContext = {
            ...context.message,
            message: context.message,
            command: {
                prefix,
                usedName: commandName,
                parameters: params,
                ...c
            }
        }

        // Combine params into next function for backward compatibility
        const nextProxy = new Proxy(next, {
            get(target, prop, receiver) {
                if (params[prop]) {
                    console.warn("Deprecation Warning: Accessing command parameters via 'next' is deprecated and will be removed in the next major version. Please access parameters via 'context.command.parameters' instead.".yellow)
                    return params[prop]
                }
                return Reflect.get(...arguments)
            }
        })

        for (const callback of preCommandCallbacks) {
            
            try {
                // old: callback(message, params, commandName, prefix, group, bot, next)
                return await callback(commandContext, nextProxy, commandName, prefix, group, bot, next)
            } catch (e) {
                if (e instanceof NextSignal) continue
                throw e
            }
        }

        return typeof response === "function"
            ? await response(commandContext, nextProxy, commandName, prefix, group, bot)
            : response
    })
}

function fromFile(commandName, filePath, sectionName) {
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
        const options = command.options || {}
        if (sectionName) options.sectionName = sectionName
        const r = add(commandName, command.response, options)
        console.log(`Loaded command "${commandName}" from file "${filePath}".`.blue)
        return r
    } catch (error) {
        console.error(`wachan/commands/fromFile: Error loading command file "${filePath}":`.red, error.stack.red)
    }
}

function fromFolder(folderPath, sectionName) {
    if (!fs.existsSync(folderPath)) {
        console.error(`Wachan/Commands: Commands folder "${folderPath}" does not exist.`.red)
        return
    }
    const files = fs.readdirSync(folderPath)
    const receivers = []
    for (const file of files) {
        if (file.endsWith(".js")) {
            const commandName = file.slice(0, -3)
            const filePath = `${folderPath}/${file}`
            const r = fromFile(commandName, filePath, sectionName)
            receivers.push(r)
        }
    }
    return receivers
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

function escapeRegExp(text) {
  return text.replace(/[-[\]{}()*+?.,\\^$|#\s]/g, "\\$&");
}

function generateMenu(options = {}) {
    const prefix = options.prefix ?? (settings.commandPrefixes[0] || "")
    const header = options.header ?? "> COMMAND LIST:\n\n"
    const sectionTitleFormat = options.sectionTitleFormat ?? "# <<section>>\n"
    const sectionFooter = options.sectionFooter ?? ""
    const commandFormat = options.commandFormat ?? "- `<<prefix>><<name>>`: <<description>>"
    const commandSeparator = options.commandSeparator ?? "\n"
    const sectionSeparator = options.sectionSeparator ?? "\n\n"
    const unsectionedFirst = options.unsectionedFirst ?? false
    const noDescriptionPlaceholder = options.noDescriptionPlaceholder ?? "No description"
    const formatter = options.formatter

    let menu = header
    const buildCommandList = (list) => {
        return list.filter(c => !c.hidden)
        .map(c => {
            return formatter && formatter(c) || commandFormat
                .replace("<<prefix>>", prefix)
                .replace("<<name>>", c.name)
                .replace("<<description>>", c.description || noDescriptionPlaceholder || "")
        }).join(commandSeparator).trim()
    }
    const unsectioned = buildCommandList(commandList)
    const sectioned = Object.entries(commandSections)
    .filter(([_, commands]) => commands.some(c => !c.hidden))
    .map(([sectionName, commands]) => {
        const sectionTitle = sectionTitleFormat.replace("<<section>>", sectionName)
        const commandListStr = buildCommandList(commands)
        return `${sectionTitle}${commandListStr}${sectionFooter}`
    }).join(sectionSeparator).trim()
    if (unsectionedFirst) {
        if (unsectioned) menu += unsectioned + sectionSeparator
        if (sectioned) menu += sectioned
    } else {
        if (sectioned) menu += sectioned + sectionSeparator
        if (unsectioned) menu += unsectioned
    }
    return menu.trim()
}

function getCommandInfo(name) {
    return commandList.find(c => c.name === name || c.aliases.includes(name))
        || Object.values(commandSections).flat().find(c => c.name === name)
}

function getCommands() {
    return JSON.parse(JSON.stringify({
        unsectioned: commandList,
        sections: commandSections
    }))
}

module.exports = { 
    beforeEach,
    add, fromFile, fromFolder, 
    addPrefix, removePrefix, 
    generateMenu, getCommandInfo, getCommands 
}