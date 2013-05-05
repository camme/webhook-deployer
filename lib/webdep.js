var defaultOptions = {
    port: 8080,
    config: "deploys.json"
};

var cons = require('consolidate');
var http = require("http");
var nunt = require("nunt");
var fs = require("fs");
var path = require("path");
var querystring = require("querystring");
var log = "";
var express = require('express');
var mustache = require('mustache');
//var app = express();
var server = http.createServer();

if (fs.existsSync(path.join(__dirname, '../package.json'))) {
    packageInformation = JSON.parse(fs.readFileSync(path.join(__dirname, '../package.json'), 'utf8'));
}

exports.packageInformation = packageInformation;
exports.defaultOptions = defaultOptions;
exports.templatePath = templatePath = path.resolve(__dirname, "../public/views");
exports.publicPath = publicPath = path.resolve(__dirname, "../public");

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

    options.fullConfigFilePath = deploysConfigFile;
    exports.options = options;

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

    var deployConfig = JSON.parse(fs.readFileSync(options.config, 'utf8'));

    console.log("\nConfigured deploys:");
    deployConfig.deploys.forEach(function(deploy) {
        var repoUrlDetails = deploy.repo.split("/");
        var repoName = repoUrlDetails.pop();
        var userName = repoUrlDetails.pop();
        console.log("- %s: %s on branch '%s'", deploy.name, deploy.repo, deploy.branch);
    });
    console.log("");

    var routes = [{
        route: /^\/incoming\/(.*?)($|\/$)/gi,
        action: require('./incoming').control(options)
    },{
        route: /^\/$/g,
        action: require('./start').control(options)
    },{
        route: /(.*?).js/g,
        action: require('./static').control(options)
    },{
        route: /(.*?).css/g,
        action: require('./stylus').control(options)
    }];

    var server = http.createServer(function(req, res) {

        // extend to have a render function
        res.render = function(template, data) {
            render(res, template, data);
        }

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

            var foundRoute = false;
            for(var i = 0, ii = routes.length; i < ii; i++){
                var route = routes[i];
                var match  = route.route.exec(req.url);
                if (match) {
                    foundRoute = true;
                    req.params.urlData = match && match.length > 0 ? match[1] : null;
                    route.action(req, res, function() {
                        res.end();
                    });
                    break;
                }
            };

            if (!foundRoute) {
                res.statusCode = 404;
                res.write("404 Not Found");
                res.end();
            }

        });

    });

    server.on('error', function(err) {
        console.log("error", err);
    });

/*
    app.get("/", require('./start').control(options));
    app.get("/login", require('./login').control(options));
    app.post("/login", require('./login').process(options));
    app.post("/incoming/:repo", [express.bodyParser(), require('./incoming').control(options)]);

    // configure it
    app.configure(function(){
        app.use(nunt.middleware());
        app.use(express.methodOverride());
        app.use(express.cookieParser("tjenadatamaskin"));
        app.use(cookieSessions('sid'));
        app.use(security);
        app.use(
            require('stylus').middleware({
            force: false,
            compress: true,
            src: __dirname + "/../public",
            dest: __dirname + "/../public"
        })
        );
        app.engine("html", cons.mustache);
        app.set("view engine", "html");
        app.set("views", path.resolve(__dirname, "../", "public/views"));
        app.use(express.static(__dirname +  '/../public'));
        app.use(app.router);
    });

    */

    server.listen(options.port, function(err) {
        if (!err) {
            nunt.init({
                server: server,
                fakeSocket: true,
                silent: true,
                cache: false
            });
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
    if (process.stdout.destroyed !== false || process.stdout.isTTY) {
        console.log(message);
    }
    log += message + "\n";

    nunt.send("log", {cache: false, log: log});

    return exports;
};

function security(req, res, next) {
    if (req.path == "/login") {
        next();
    }
    else if (!req.session || (req.session && !req.session.loggedin)) {
        res.redirect("/login"); 
    }
    next();
};

function cookieSessions(name) {
    return function(req, res, next) {
        req.session = req.signedCookies[name] || {};
        res.on('header', function(){
            res.cookie(name, req.session, { signed: true });
        });
        next();
    }
}

function render(res, template, data) {
    var templateFile = path.resolve(templatePath, template);
    fs.readFile(templateFile, 'utf8', function(err, template) {
        if (!err) {
            var html = mustache.to_html(template, data);
            res.write(html);
        }
        else {
            res.write(err);
        }
        res.end();
    });
}
