const fs = require("fs");

const PATH = "./settings.json";

const defaultSettings = {
  receiveOfflineMessages: true,
  defaultBotName: "Wachan"
};

const settings = {}
loadSettings()
settings.save = saveSettings

function loadSettings() {
    if (!fs.existsSync(PATH)) {
        console.log(`${PATH} not found. Creating default settings file.`.blue);
        fs.writeFileSync(PATH, JSON.stringify(defaultSettings, null, 2));
    }
    try {
        const data = JSON.parse(fs.readFileSync(PATH).toString())
        Object.assign(settings, data);
        for (const key in defaultSettings) {
            if (settings[key] === undefined) settings[key] = defaultSettings[key]
        }
        for (const key in settings) {
            if (defaultSettings[key] === undefined) {
                console.warn(`Warning: Unknown setting "${key}" in ${PATH}. It will be removed.`.yellow);
                delete settings[key]
            }
        }
    } catch {
        console.log(`Error reading ${PATH}, creating a new default settings file.`.red);
        fs.writeFileSync(PATH, JSON.stringify(defaultSettings, null, 2));
        Object.assign(settings, JSON.parse(JSON.stringify(defaultSettings)));
    }
    return settings;
}

function saveSettings() {
  return fs.writeFileSync(PATH, JSON.stringify(settings, null, 2))
}

module.exports = { settings }