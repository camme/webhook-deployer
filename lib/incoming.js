var webdep = require('./webdep');
var fs = require("fs");
var path = require("path");
var exec  = require('child_process').exec;

exports.control = function(options) {
    webdep.clearLog();
    return function incoming(req, res, next) {
        webdep.log("Incoming " + (new Date()).toString());
        var deploysList = webdep.getDeployList();
        var error = false;
        var repoData = {};
        // github type.
        var repoDataStr = req.body.payload;
        // gitlab type
        if(!repoDataStr) {
            for(var i in req.body) {
                if(req.body.hasOwnProperty(i)) {
                    repoDataStr = i;
                    break;
                }
            }
        }
        // parse the post body data.
        try {
            repoData = JSON.parse(repoDataStr);
        }
        catch (err) {
            repoData = { error: err };
            error = true;
        }


        if (!repoData.error && !repoData.repository) {
            webdep.log("Webhook payload was not for a push.");
        }

        if (repoData.error) {
            webdep.log("");
            webdep.log("Error while parsing post body");
        } else {
            webdep.log('Webhook from', repoData.repository.homepage, '(', repoData.repository.description, ').', 'Checking this incoming repo.');
            deploysList.forEach(function(deploy) {
                var branch;
                if (["github", "gitlab"].indexOf(deploy.type) > -1) {
                    // remove .git from the repo string, since the hook will not have that address when it comes from github
                    // so instead of explaining that you shouldnt enter ".git", we just remove it here.
                    if (repoData.repository.url == deploy.repo.replace(".git$", "")) {
                        branch = repoData.ref.split("/").pop();
                        if (branch == deploy.branch) {
                            webdep.log("Match branch", branch, ', begin deploy.');
                            runDeploy(deploy);
                        }
                    }
                }
            });
        }

        if (error) {
            res.statusCode = 500;
            res.write("ERROR");
        } else {
            res.write("OK");
        }
        next();
    };

};


function runDeploy(deploy) {

    webdep.log(">  Begin run " + deploy.name + " with branch " + deploy.branch);

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
        webdep.log("> Deploy done!");
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

