var defaultOptions = {
    port: 8080,
    config: "deploys.json"
};

var http = require("http");
var fs = require("fs");
var path = require("path");
var querystring = require("querystring");
var log = "";

var packageInformation = {};

if (fs.existsSync(path.join(__dirname, '../package.json'))) {
    packageInformation = JSON.parse(fs.readFileSync(path.join(__dirname, '../package.json'), 'utf8'));
}

exports.packageInformation = packageInformation;
exports.defaultOptions = defaultOptions;

exports.init = function(newOptions, callback) {

    // extend the options
    var options = {};
    for(var key in defaultOptions) {
        options[key] = defaultOptions[key];
    }

    for(var key in newOptions) {
        options[key] = newOptions[key];
    }

    var deploysConfigFile = path.resolve(process.cwd(), options.config);

    if (!fs.existsSync(deploysConfigFile) || (!options.repo && !options.branch && !options.command)) {
        if (typeof callback == "function") {
            callback({error: "no config file found"});
            return;
        }
        else {
            console.error("No config file found at %s and not repo configured in the options.", deploysConfigFile);
            return;
        }
    }

    var routes = [{
        route: /^\/incoming\/(.*?)($|\/$)/gi,
        action: require('./incoming').control(options)
    },{
        route: /^\/$/g,
        action: require('./start').control(options)
    }]

    var server = http.createServer(function(req, res) {

        var data = "";
        req.on("data", function(chunk) {
            data += chunk;
        });

        req.on("end", function() {

            if (req.method == "POST") {
                req.params = querystring.parse(data);
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

    server.on('error', function(err) {
        console.log("error", err);
    });

    server.listen(options.port, function(err) {
        if (!err) {
            console.log("Started webhook-deployer server app version %s with port %s", packageInformation.version, options.port);
        }
        else{
            process.exit(err);
        }
    });

}

exports.clearLog = function() {
    log = "";
};

exports.log = function(message){
    if (arguments.length == 0) {
        return log;
    }
    if (process.stdout.isTTY) {
        console.log(message);
    }
    log += message + "\n";
    return exports;
};

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


