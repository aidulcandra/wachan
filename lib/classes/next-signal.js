class NextSignal extends Error {
    constructor() {
        super("Next Signal")
        this.name = "NextSignal"
    }
}

module.exports = { NextSignal }