const { onReceive, settings } = require("../index")

const prefixes = settings.commandPrefixes ??= ["/"]

function add(command, response, options = {}) {
    const names = [command, ...options.aliases||[]]
    const prefixRegex = prefixes.map(escapeRegExp).join("|")
    const nameRegex = names.map(escapeRegExp).join("|")
    const pattern = `^(?<prefix>${prefixRegex})\\s*(?<command>${nameRegex})\\b(?:\\s+(?<paramString>.+))?`
    const commandRegex = new RegExp(pattern, "i")
    return onReceive(commandRegex, async function (message, captures) {
        const { prefix, command, paramString } = captures
        const separator = options.separator || " "
        const params = paramString?.split(separator) || []
        return typeof response === "function"
            ? response(message, params, command, prefix)
            : response
    })
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

module.exports = { add, addPrefix, removePrefix }