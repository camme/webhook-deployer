var defaultOptions = {
    port: 8080,
    config: "deploys.json"
};

var http = require("http");
var fs = require("fs");
var path = require("path");
var querystring = require("querystring");
var exec  = require('child_process').exec;
var lastInfo = "";

var packageInformation = {};

if (fs.existsSync(path.join(__dirname, '../package.json'))) {
    packageInformation = JSON.parse(fs.readFileSync(path.join(__dirname, '../package.json'), 'utf8'));
}

exports.packageInformation = packageInformation;

exports.init = function(newOptions) {

    // extend the options
    var options = {};
    for(var key in defaultOptions) {
        options[key] = defaultOptions[key];
    }

    for(var key in newOptions) {
        options[key] = newOptions[key];
    }

    var server = http.createServer(function(req, res) {

        var data = "";
        req.on("data", function(chunk) {
            data += chunk;
        });

        req.on("end", function() {

            if (req.method == "POST") {

                req.params = querystring.parse(data);


                // this stuf is to handle multipart

                //var boundaryData = /--([\w\d]+)$/.exec(req.headers['content-type']);
                //var boundary = boundaryData && boundaryData[1];

                //var dataList = data.split(boundary);
                //dataList.pop();

                //console.log(dataList);


                //if (data.match(/content-disposition: form-data;/i)) {
                //var formDataRe = /content-disposition: form-data;([.\W]*?)/gi;
                //var formData = formDataRe.exec(data);
                //console.log(formData);
                //}

            }
            else {
                req.params = {};
            }

            for(var i = 0, ii = routes.length; i < ii; i++){
                var route = routes[i];
                var match  = route.route.exec(req.url);
                if (match) {
                    req.params.urlData = match && match.length > 0 ? match[1] : null;
                    route.action(req, res); 
                    break;
                }
            };

            res.end();

        });

    });

    server.listen(options.port);

    console.log("");
    console.log("Started webhook-deployer server app version %s with port %s", packageInformation.version, options.port);
    console.log("");

}

function incoming(req, res) {


    lastInfo = "Incoming " + req.params.urlData + " - " + (new Date()).toString() + "\n\n";

    var exists = fs.existsSync(options.config);

    if (!exists) {
        console.error("No config file found at %s", options.config);
        lastInfo += "NO CONFIG FILE FOUND AT " + path.resolve(__dirname, options.config);
        res.write(lastInfo);
        return;
    }
    var deployConfig = JSON.parse(fs.readFileSync(options.config, 'utf8'));


    deployConfig.deploys.forEach(function(deploy) {

        if (deploy.type == "github") {

            var repoData = JSON.parse(req.params.payload);

            console.log("Checking incoming repo %s ...", repoData.repository.url);
            lastInfo += "Checking incoming repo " + repoData.repository.url + "...\n";

            if (repoData.repository.url == deploy.repo) {

                var branch = repoData.ref.split("/").pop();

                console.log("  Checking branch '%s' ...", branch);
                lastInfo += ">  Checking branch '" + branch + "' ...\n";
                if (branch == deploy.branch) {

                    console.log("\n");
                    console.log("Run %s with branch '%s'", deploy.name, branch);
                    console.log("");

                    lastInfo += ">  Run " + deploy.name + " with branch " + branch + "\n";
                    lastInfo += "\n";

                    var localPath = path.resolve(deploy.basepath);

                    var cmd = exec(deploy.command, {
                        cwd: localPath
                    }, function(error, stdout, stderr) {
                        if (error) {
                            lastInfo += ">  ERROR (error): " + error + "\n";
                        }
                        if (stderr) {
                            lastInfo += ">  ERROR (stderr): " + stderr + "\n";
                        }
                        lastInfo += ">  DONE!";
                    });
                    cmd.stdout.on('data', function(data) {
                        lastInfo += data.toString() + "\n";
                        process.stdout.write(data.toString());
                    });
                    cmd.stdout.on('close', function(data) {
                        lastInfo += "CLOSE: " + data.toString() + "\n";
                        process.stdout.write(data.toString());
                    });
                    cmd.stdout.on('exit', function(data) {
                        lastInfo += "EXIT: " + data.toString() + "\n";
                        process.stdout.write(data.toString());
                    });
                    cmd.stdout.on('disconnect', function(data) {
                        lastInfo += "DISCONNECT: " + data.toString() + "\n";
                        process.stdout.write(data.toString());
                    });
                    cmd.stdout.on('message', function(data) {
                        lastInfo += "MESSAGE: " + data.toString() + "\n";
                        process.stdout.write(data.toString());
                    });
                    cmd.stderr.on('data', function(data) {
                        lastInfo += ">  ERROR (on): " + data.toString() + "\n";
                        process.stdout.write("ERROR " +  data.toString());
                    });


                }
                else {
                    console.log("  No, wrong branch, nothing to do");
                    lastInfo += ">  No, wrong branch, nothing to do\n";
                }
            }
            else {
                console.log("No, wrong repo, nothing to do");
                lastInfo += "No, wrong repo, nothing to do\n";
            }

        }
    });

}

function index(req, res) {
    res.write("Webhook deployer version " + packageInformation.version + "\n\n");
    res.write(path.join(__dirname, '../package.json'));
    res.write(__dirname);
    res.write(lastInfo);
};

var routes = [{
    route: /^\/incoming\/(.*?)($|\/$)/gi,
    action: incoming
},{
    route: /^\/$/g,
    action: index
}]



