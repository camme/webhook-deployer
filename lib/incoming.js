var webdep = require('./webdep');
var fs = require("fs");
var path = require("path");
var exec  = require('child_process').exec;

exports.control = function(options) {

    return function incoming(req, res, next) {

        webdep.clearLog();
        webdep.log("Incoming " + (new Date()).toString());

        var deploysList = webdep.getDeployList();
        var error = false;

        var repoData = {};
        try {
            repoData = JSON.parse(req.body.payload);
        }
        catch (err) {
            repoData = { error: err };
            error = true;
        }

        deploysList.forEach(function(deploy) {

            if (deploy.type == "github") {

                if (!repoData.error && !repoData.repository) {
                    webdep.log("Webhook payload was not for a push.");
                    return;
                }

                if (!repoData.error) {

                    webdep.log("Checking incoming repo " + repoData.repository.url + "...");

                    // remove .git from the repo string, since the hook will not have that address when it comes from github
                    // so instead of explaining that you shouldnt enter ".git", we just remove it here.
                    if (repoData.repository.url == deploy.repo.replace(".git", "")) {

                        var branch = repoData.ref.split("/").pop();

                        webdep.log(">  Checking branch '" + branch + "' ...");

                        if (branch == deploy.branch) {

                            runDeploy(deploy);

                        }
                        else {
                            webdep.log(">  No, wrong branch, nothing to do");
                            webdep.log(">  Got:");
                            webdep.log(">  " + branch);
                            webdep.log(">  But expected:");
                            webdep.log(">  " + deploy.branch);
                        }
                    }
                    else {
                        webdep.log("No, wrong repo, nothing to do");
                        webdep.log("Got:");
                        webdep.log(repoData.repository.url);
                        webdep.log("But expected:");
                        webdep.log(deploy.repo.replace(".git", ""));
                    }

                }
                else {
                    webdep.log("");
                    webdep.log("Error while parsing post body");
                }
            }
        });

        if (error) {
            res.statusCode = 500;
            res.write("ERROR");
        }
        else {
            res.write("OK");
        }
        next();




    }

};


function runDeploy(deploy) {

    webdep.log(">  Run " + deploy.name + " with branch " + deploy.branch);

    var localPath = path.resolve(deploy.basepath);

    var cmd = exec(deploy.command, {
        cwd: localPath
    }, function(error, stdout, stderr) {
        if (error) {
            webdep.log(">  ERROR (error): " + error);
        }
        if (stderr && error) {
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
        webdep.log(data.toString());
    });

}

exports.runDeploy = runDeploy;

