class Receiver {
    constructor(options) {
        if (options?.text) this.inputText = options.text
        if (options?.filter) this.filter = options.filter
    }

    async test (message) {
        if (this.inputText && message.text !== this.inputText) return false
        if (this.filter && !await this.filter(message)) return false
        return true
    }
}

module.exports = { Receiver }