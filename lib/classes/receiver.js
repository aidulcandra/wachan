class Receiver {
    constructor(options) {
        if (options?.text) this.inputText = options.text
        if (options?.filter) this.filter = options.filter
        if (options?.regex) this.regex = options.regex
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