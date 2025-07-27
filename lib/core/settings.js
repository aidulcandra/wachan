const fs = require("fs");

const defaultSettings = {
  receiveOfflineMessages: true,
};

const settings = {}
loadSettings()
settings.save = saveSettings

function loadSettings(path = "./settings.json") {
    if (!fs.existsSync(path)) {
        console.log(`${path} not found. Creating default settings file.`.blue);
        fs.writeFileSync(path, JSON.stringify(defaultSettings, null, 2));
    }
    try {
        const data = JSON.parse(fs.readFileSync(path).toString())
        Object.assign(settings, data);
        for (const key in defaultSettings) {
            if (settings[key] === undefined) settings[key] = defaultSettings[key]
        }
        for (const key in settings) {
            if (defaultSettings[key] === undefined) {
                console.warn(`Warning: Unknown setting "${key}" in ${path}. It will be removed.`.yellow);
                delete settings[key]
            }
        }
    } catch {
        console.log(`Error reading ${path}, creating a new default settings file.`.red);
        fs.writeFileSync(path, JSON.stringify(defaultSettings, null, 2));
        Object.assign(settings, JSON.parse(JSON.stringify(defaultSettings)));
    }
    return settings;
}

function saveSettings(path = "./settings.json") {
  return fs.writeFileSync(path, JSON.stringify(settings, null, 2))
}

module.exports = { settings }