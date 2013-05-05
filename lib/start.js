var fs = require('fs');
var path = require('path');
var webdep = require('./webdep');

exports.control = function(options) {

    return function index(req, res, next) {

        var log = webdep.log();
        log = log == "" ? "The log is empty" : log;

        var options = webdep.options;
        var deployConfig = JSON.parse(fs.readFileSync(options.config, 'utf8'));

        var deploys = [];
        deployConfig.deploys.forEach(function(deploy) {
            var repoUrlDetails = deploy.repo.split("/");
            var repoName = repoUrlDetails.pop();
            var userName = repoUrlDetails.pop();
            deploys.push({
                deploy: deploy,
                repoName: repoName,
                userName: userName
            });
        });

        res.render("index.html", {
            version: webdep.packageInformation.version,
            log: log,
            deploys: deploys
        });
 
   };

};
