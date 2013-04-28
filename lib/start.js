
var webdep = require('./webdep');

exports.control = function(options) {

    return function index(req, res) {
        res.write("Webhook deployer version " + webdep.packageInformation.version + "\n\n");
        res.write(webdep.log());
    };

};
