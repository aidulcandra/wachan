const crypto = require("crypto")

class Receiver {
    constructor(input) {
        this.id = crypto.randomBytes(4).toString("hex")
        if (typeof input === "string") this.inputText = input
        else if (typeof input === "function") this.filter = input
        else if (input instanceof RegExp) this.regex = input
    }

    async test (message) {
        const text = message.text || ""
        if (this.inputText && text !== this.inputText) return false
        if (this.filter && !await this.filter(message)) return false
        if (this.regex) {
            const match = text.match(this.regex)
            if (!match) return false
            const captures = {}
            for (let i=0; i<match.length; i++)
                if (i>=1) captures[i-1] = match[i]
            if (match.groups) Object.assign(captures, match.groups)
            captures.toArray = () => match.slice(1)
            return {captures}
        }
        return true
    }
}

module.exports = { Receiver }