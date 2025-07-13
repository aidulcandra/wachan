const fs = require("fs");

const defaultSettings = {
  ownerIds:[],
  parseMentions: true,
  recordPushnames: true,
  commandPrefixes: ["/"],
  autoRead: false,
  processOfflineMessages: true,
  storeSize: 100,
  commandMenu: {
    menuTemplate:
      "> COMMAND LIST\n\n@categorylist\n\n_Created by: aidulcandra_",
    categoryTemplate: "[@category]----\n@commandlist\n------------",
    categorySeparator: "\n\n",
    commandTemplate: "`/@command` - @description",
    commandSeparator: "\n",
  },
};

const settings = {}
loadSettings()
settings.save = saveSettings

function loadSettings(path = "./settings.json") {
    if (!fs.existsSync(path)) {
        console.log(`${path} not found. Creating default settings file.`);
        fs.writeFileSync(path, JSON.stringify(defaultSettings, null, 2));
    }
    try {
        Object.assign(settings, JSON.parse(fs.readFileSync(path).toString()));
    } catch {
        console.log(`Error reading ${path}, creating a new default settings file.`);
        fs.writeFileSync(path, JSON.stringify(defaultSettings, null, 2));
        Object.assign(settings, JSON.parse(JSON.stringify(defaultSettings)));
    }
    return settings;
}

function saveSettings(path = "./settings.json") {
  return fs.writeFileSync(path, JSON.stringify(settings, null, 2))
}

module.exports = { settings }