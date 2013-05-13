var webdep = require("./lib/webdep.js");

var runningScript = process.argv.length > 1 ? process.argv[1] : "";
if (runningScript == __filename) {
    webdep.init();
}
else {
    module.exports = webdep;
}
