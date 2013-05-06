var defaultOptions = {
    port: 8080,
    config: "deploys.json",
    username: "hi",
    password: "hello",
    deploys: []
};

var cons = require('consolidate');
var http = require("http");
var nunt = require("nunt");
var fs = require("fs");
var path = require("path");
var querystring = require("querystring");
var log = "The log is empty.";
var express = require('express');
var mustache = require('mustache');
var Keygrip = require('keygrip');
var Cookies = require('cookies');
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

   for(var key in defaultOptions) {
        options[key] = defaultOptions[key];
    }

    for(var key in newOptions) {
        options[key] = newOptions[key];
    }

    var deploysConfigFile = path.resolve(process.cwd(), options.config);

    options.fullConfigFilePath = deploysConfigFile;
    exports.options = options;

    // Make sure we have a config file or some other type of config to run from
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

    var deployConfig = JSON.parse(fs.readFileSync(options.config, 'utf8'));

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

    var server = http.createServer(function(req, res) {

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
            render(res, template, data);
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

            console.log("Started webhook-deployer server app version %s with port %s", packageInformation.version, options.port);
            console.log("\nConfigured deploys:");
            deployConfig.deploys.forEach(function(deploy) {
                var repoUrlDetails = deploy.repo.split("/");
                var repoName = repoUrlDetails.pop();
                var userName = repoUrlDetails.pop();
                console.log("- %s: %s on branch '%s'", deploy.name, deploy.repo, deploy.branch);
            });
            console.log("");

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

    // only send the login to those that are authenticated
    var clients = nunt.io.sockets.clients();
    clients.forEach(function(socket) {
        if (socket.handshake.session.authenticated === true) {
            nunt.send("log", {sessionId: socket.id, cache: false, log: log});
        }
    });

    return exports;
};

var sessions = new sessionStore();

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

    nunt.send("login-succeded", {sessionId: sessionId});
    nunt.send("log", {log: exports.log(), sessionId: sessionId}); 
    nunt.send("deploys", {deploys: deploys, sessionId: sessionId}); 
}

function sessionStore() {
    this.sessions = {};
}

sessionStore.prototype.get = function(sessionId) {
    var session = this.sessions[sessionId];
    if (session) {
        //&& session.time > Date.now() - 1000 * 60 * 1) {
        session.active = true;
    }
    else {
        session = this.sessions[sessionId] = {};
        session.active = false;
    }
    return session;
}

sessionStore.prototype.create = function() {
    var sessionId = this.randomString(512);
    var session = {
        time: Date.now(),
        active: true,
        id: sessionId
    }
    this.sessions[sessionId] = session;
    return session;
}

sessionStore.prototype.prolong = function(sessionId) {
    var session = this.get(sessionId);
    if (session) {
        this.sessions[sessionId].time = Date.now();
    }
    return valid;
}

// randomString returns a pseude-random ASCII string which contains at least the specified number of bits of entropy
// the return value is a string of length ⌈bits/6⌉ of characters from the base64 alphabet
sessionStore.prototype.randomString = function(bits) {
    var chars,rand,i,ret;

    chars='ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789-_';
    ret='';

    // in v8, Math.random() yields 32 pseudo-random bits (in spidermonkey it gives 53)
    while(bits > 0) {
        rand = Math.floor(Math.random()*0x100000000); // 32-bit integer

        // base 64 means 6 bits per character, so we use the top 30 bits from rand to give 30/6=5 characters.
        for(i=26; i>0 && bits>0; i-=6, bits-=6) ret+=chars[0x3F & rand >>> i];
    }
    return ret;
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

function render(res, template, data, status) {
    var templateFile = path.resolve(templatePath, template);
    fs.readFile(templateFile, 'utf8', function(err, template) {

        if (!err) {

            // overload hanadling
            if (typeof data == "number") {
                status = data;
                data = null;
            }

            // set the status if we have one
            if (status) {
                res.statusCode = status;
            }

            data = data || {};

            // default info
            var defaultData = {
                version: packageInformation.version
            };

            for(var key in defaultData) {
                data[key] = defaultData[key];
            }

            var html = mustache.to_html(template, data);
            res.write(html);

        }
        else {
            res.write(err);
        }
        res.end();

    });
}
