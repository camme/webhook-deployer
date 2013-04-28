var fs = require("fs");
var path = require("path");

var packageInformation = JSON.parse(fs.readFileSync(path.join(__dirname, './package.json'), 'utf8'));

var program = require('commander');

program
  .version(packageInformation.version)
  .option('-p, --port [port]', 'Set the port number to use. Defaults to 8080')
  .option('-c, --configfile [configfile]', 'Set the path to the config file to be used. Default to ./deploys.json')
  .option('-d, --daemon', 'Run the webhook-deployer as a deamon with forever')
  .option('-s, --stop', 'Stop webhook-deployer that was run as a deamon')
  .option('-t, --test', "test")
  .parse(process.argv);

var options = {};

console.log("TEST", program.test);

if (program.port) {
    options.port = program.port;
}

if (program.configfile) {
    options.config = program.configfile;
}


console.log(__dirname);
//var path = require("path");
//var webdepPath = path.resolve(__dirname, "../lib
var webdep = require("./lib/webdep.js");
webdep.init();
