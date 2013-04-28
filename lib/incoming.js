var webdep = require('./webdep');
var fs = require("fs");
var path = require("path");
var exec  = require('child_process').exec;


exports.control = function(options) {


    return function incoming(req, res) {

        webdep.clearLog();
        webdep.log("Incoming " + (new Date()).toString());

        var exists = fs.existsSync(options.config);

        if (!exists) {
            webdep.log("NO CONFIG FILE FOUND AT " + path.resolve(__dirname, '../', options.config));
            res.write(webdep.log());
            return;
        }

        var deployConfig = JSON.parse(fs.readFileSync(options.config, 'utf8'));

        deployConfig.deploys.forEach(function(deploy) {

            if (deploy.type == "github") {

                var repoData = JSON.parse(req.params.payload);

                webdep.log("Checking incoming repo " + repoData.repository.url + "...");

                if (repoData.repository.url == deploy.repo) {

                    var branch = repoData.ref.split("/").pop();

                    webdep.log(">  Checking branch '" + branch + "' ...");

                    if (branch == deploy.branch) {

                        webdep.log(">  Run " + deploy.name + " with branch " + branch);

                        var localPath = path.resolve(deploy.basepath);

                        var cmd = exec(deploy.command, {
                            cwd: localPath
                        }, function(error, stdout, stderr) {
                            if (error) {
                                webdep.log(">  ERROR (error): " + error);
                            }
                            if (stderr) {
                                webdep.log(">  ERROR (error): " + error);
                            }
                            webdep.log("--------------------------");
                            webdep.log("> DONE!");
                        });


                        webdep.log("--------------------------");
                        cmd.stdout.on('data', function(data) {
                            webdep.log(data.toString());
                        });
                        cmd.stdout.on('close', function(data) {
                            //webdep.log(data.toString());
                        });
                        cmd.stdout.on('exit', function(data) {
                            //webdep.log(data.toString());
                        });
                        cmd.stdout.on('disconnect', function(data) {
                            //webdep.log(data.toString());
                        });
                        cmd.stdout.on('message', function(data) {
                            webdep.log("MESSAGE: " + data.toString());
                        });
                        cmd.stderr.on('data', function(data) {
                            webdep.log("ERROR: " +  data.toString());
                        });

                    }
                    else {
                        webdep.log(">  No, wrong branch, nothing to do");
                    }
                }
                else {
                    webdep.log("No, wrong repo, nothing to do");
                }

            }
        });


    }

};
