const crypto = require("crypto")

class Receiver {
    constructor(input) {
        this.id = crypto.randomBytes(4).toString("hex")
        if (typeof input === "string") this.inputText = input
        else if (typeof input === "function") this.filter = input
        else if (input instanceof RegExp) this.regex = input
        else if (input === 0) this.regex = /.*/ // match all
        else if (input === 1) this.filter = (m) => !m.isMedia
        else if (input === 2) this.filter = (m) => m.isMedia
        else if (input === 10) this.filter = (m) => m.type === "text"
        else if (input === 11) this.filter = (m) => m.type === "reaction"
        else if (input === 12) this.filter = (m) => m.type === "buttonReply"
        else if (input === 20) this.filter = (m) => m.type === "image"
        else if (input === 21) this.filter = (m) => m.type === "video"
        else if (input === 22) this.filter = (m) => m.type === "gif"
        else if (input === 23) this.filter = (m) => m.type === "audio"
        else if (input === 24) this.filter = (m) => m.type === "sticker"
        else if (input === 25) this.filter = (m) => m.type === "document"
        else throw new Error("Invalid Receiver input")
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