var defaultOptions = {
    port: 8080,
    config: "deploys.json",
    username: "hi",
    password: "hello"
};

var http = require("http");
var nunt = require("nunt");
var fs = require("fs");
var path = require("path");
var querystring = require("querystring");
var log = logStartText = "The log is empty.";
var express = require('express');
var Keygrip = require('keygrip');
var Cookies = require('cookies');
var SessionStore = require('./sessionstore');
var util = require('util');
var server = http.createServer();
var keys = Keygrip(['superhemligakoden']);
var options = {}; // extend the options

if (fs.existsSync(path.join(__dirname, '../package.json'))) {
    packageInformation = JSON.parse(fs.readFileSync(path.join(__dirname, '../package.json'), 'utf8'));
}

exports.packageInformation = packageInformation;
exports.defaultOptions = defaultOptions;
exports.templatePath = templatePath = path.resolve(__dirname, "../public/views");
exports.publicPath = publicPath = path.resolve(__dirname, "../public");

exports.init = function(newOptions, callback) {

    if (typeof newOptions == "function") {
        callback = newOptions;
        delete newOptions;
    }

    for(var key in defaultOptions) {
        options[key] = defaultOptions[key];
    }

    for(var key in newOptions) {
        options[key] = newOptions[key];
    }

    var deploysList = getDeployList();

    var routes = [{
        route: /^\/incoming\/(.*?)($|\/$)/gi,
        action: require('./incoming').control(options)
    },{
        route: /^\/$/g,
        action: require('./start').control(options)
    },{
        route: /^\/js\/main\.js/g,
        action: require('./static').control(options)
    },{
        route: /^\/css\/style\.css/g,
        action: require('./stylus').control(options)
    }];

    server = http.createServer(function(req, res) {

        var cookies = new Cookies(req, res, keys);
        var sessionId = cookies.get("sid");
        var session = sessions.get(sessionId);

        if (!session.active) {
            session = sessions.create();
            sessionId = session.id;
            cookies.set("sid", sessionId, {signed: true});
        }

        // extend to have a render function
        res.render = function(template, data, status) {
            require("./render")(res, template, data, status);
        }

        var data = "";
        req.on("data", function(chunk) {
            data += chunk;
        });

        req.on("end", function() {

            req.params = {};

            if (req.method == "POST") {
                req.body = querystring.parse(data);
            }
            else {
                req.body = {};
            }

            if (res.finished) {
                return;
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

    server.listen(options.port, function(err) {
        if (!err) {
            nunt.init({
                server: server,
                fakeSocket: true,
                silent: true,
                cache: false,
                authorization: security
            });

            exports.log("Started webhook-deployer server app version %s with port %s", packageInformation.version, options.port);
            exports.log("\nConfigured deploys:");
            deploysList.forEach(function(deploy) {
                var repoUrlDetails = deploy.repo.split("/");
                var repoName = repoUrlDetails.pop();
                var userName = repoUrlDetails.pop();
                exports.log("- %s: %s on branch '%s'", deploy.name, deploy.repo, deploy.branch);
            });
            exports.log("");

            if (callback) {
                callback();
            }

        }
        else{
            callback(err);
            process.exit(err);
        }
    });

}

exports.stop = function(callback) {

    var clients = nunt.io.sockets.clients();
    var counter = clients.length;
    clients.forEach(function(socket) {
        socket.disconnect();
    });

    if (counter == 0) {
        server.close(callback);
    }
    else {
        server.close();
        setTimeout(callback, 300);
    }

};

exports.clearLog = function() {
    log = "";
};

exports.log = function(){

    if (arguments.length == 0) {
        return log;
    }

    if (log == logStartText) {
        log = "";
    }

    var message = util.format.apply(this, arguments);

    if (process.stdout.destroyed !== false || process.stdout.isTTY) {
        if (options.logToConsole !== false) {
            console.log(message);
        }
    }
    log += message + "\n";

    // only send the login to those that are authenticated
    var clients = nunt.io.sockets.clients();
    clients.forEach(function(socket) {
        if (socket.handshake.session.authenticated === true) {
            nunt.send("log", {sessionId: socket.id, cache: false, log: log});
        }
    });

    return exports;
};

var sessions = new SessionStore();

function security(handshakeData, next) {

    // connect this connection to the samme session as created with the normal request handle
    var cookies = new Cookies(handshakeData, {}, keys);
    var sessionId = cookies.get("sid");
    var session = sessions.get(sessionId);
    handshakeData.session = session;
    next(null, true);

};

nunt.on(nunt.CLIENT_CONNECTED, function(e) {
    if (!e._client.handshake.session.authenticated === true) {
        nunt.send("not-logged-in", {sessionId: e.sessionId}); 
    }
    else {
        sendLoginInfo(e.sessionId);
    }
});

nunt.on("login", function(e) {

    if (e.username == options.username && e.password == options.password) {

        // create the session 
        e._client.handshake.session.authenticated = true;
        sendLoginInfo(e.sessionId);

    }
    else {

        e._client.handshake.session.authenticated = false;
        nunt.send("login-error");

    }
});

function sendLoginInfo(sessionId) {

    var deploysList = getDeployList();

    var deploys = [];
    deploysList.forEach(function(deploy) {
        var repoUrlDetails = deploy.repo.split("/");
        var repoName = repoUrlDetails.pop();
        var userName = repoUrlDetails.pop();
        deploys.push({
            deploy: deploy,
            repoName: repoName,
            userName: userName
        });
    });

    nunt.send("login-succeded", {sessionId: sessionId});
    nunt.send("log", {log: exports.log(), sessionId: sessionId}); 
    nunt.send("deploys", {deploys: deploys, sessionId: sessionId}); 

}

function cookieSessions(name) {
    return function(req, res, next) {
        req.session = req.signedCookies[name] || {};
        res.on('header', function(){
            res.cookie(name, req.session, { signed: true });
        });
        next();
    }
}

exports.getDeployList = getDeployList = function() {

    var deploysList = {};
    if (options.deploys && options.deploys.constructor == Array) {
        deploysList = options.deploys;
    }
    else {

        // Make sure we have a config file or some other type of config to run from
        var deploysConfigFile = path.resolve(process.cwd(), options.config);
        if (!fs.existsSync(deploysConfigFile) && (!options.repo && !options.branch && !options.command)) {
            if (typeof callback == "function") {
                callback({error: "no config file found"});
                return;
            }
            else {
                console.error("No config file found at %s and not repo configured in the options.", deploysConfigFile);
                return;
            }
        }

        var config = JSON.parse(fs.readFileSync(options.config, 'utf8'));
        if (!config.deploys) {
            return;
        }
        deploysList = config.deploys;
    }
    return deploysList;

}
