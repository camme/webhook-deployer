var defaultOptions = {
    port: 8080,
    config: "deploys.json",
    username: "hi",
    password: "hello",
    webui: true
};

var http = require("http");
var fs = require("fs");
var path = require("path");
var querystring = require("querystring");
var log = logStartText = "The log is empty.";
var Keygrip = require('keygrip');
var Cookies = require('cookies');
var SessionStore = require('./sessionstore');
var util = require('util');
var socketIO = require('socket.io');
var server = http.createServer();
var keys = Keygrip(['superhemligakoden']);
var options = {}; // extend the options
var io;
var incoming = require('./incoming');

if (fs.existsSync(path.join(__dirname, '../package.json'))) {
    packageInformation = JSON.parse(fs.readFileSync(path.join(__dirname, '../package.json'), 'utf8'));
}

exports.packageInformation = packageInformation;
exports.defaultOptions = defaultOptions;
exports.templatePath = templatePath = path.resolve(__dirname, "../public/views");
exports.publicPath = publicPath = path.resolve(__dirname, "../public");

exports.init = function(newOptions, callback) {

    // Handle arguments
    if (typeof newOptions == "function") {
        callback = newOptions;
        delete newOptions;
    }


    // Merge options
    for(var key in defaultOptions) {
        options[key] = defaultOptions[key];
    }

    for(var key in newOptions) {
        options[key] = newOptions[key];
    }


    var deploysList = getDeployList();


    // Define routes, both for web ui and for incoming
    var routes = [];
    
    routes.push({
        route: /^\/incoming\/(.*?)($|\/$)/gi,
        action: incoming.control(options)
    });

    if (options.webui) {
        routes.push({
            route: /^\/$/g,
            action: require('./start').control(options)
        });
    }
    
    routes.push({
        route: /^\/js\/mustache\.js/g,
        action: require('./static').control(options)
    });
    
    routes.push({
        route: /^\/js\/main\.js/g,
        action: require('./static').control(options)
    });

    routes.push({
        route: /^\/css\/style\.css/g,
        action: require('./stylus').control(options)
    });


    // Lets create the server
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

        // Handle requests
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
                var match  = req.url.match(route.route);
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

    // Create socket IO connection
    io = socketIO(server);

    // Handle socket io security
    io.use(function(socket, next) {

        var handshakeData = socket.request;

        // connect this connection to the samme session as created with the normal request handle
        var cookies = new Cookies(handshakeData, {}, keys);
        var sessionId = cookies.get("sid");
        var session = sessions.get(sessionId);
        handshakeData.session = session;

        next(null, true);

    });


    
    // We dont handle login events if the weui is disabled
    if (options.webui) {

    // Handle web socket connections
    io.on('connect', function(socket) {

        // Handler login
        socket.on("login", function(e) {


            if (e.username == options.username && e.password == options.password) {

                // create the session when the user has logged in
                socket.request.session.authenticated = true;
                sendLoginInfo(socket);

            } else {
               socket.request.session.authenticated = false;
               socket.emit("login-error");
            }
        });

        socket.on("run-deploy", function(e) {
            if (socket.request.session.authenticated === true) {
                var deploy = getDeployFromId(e.id);
                if (deploy) {
                    incoming.runDeploy(deploy);
                }
            } else {
               socket.request.session.authenticated = false;
               socket.emit("login-error");
            }
         });

        // Check if the user already has logged in 
        if (socket.request && socket.request.session && socket.request.session.authenticated === true) {
            sendLoginInfo(socket);
        }
        else {
            socket.emit("not-logged-in"); 
        }

    });

    }



    // Start server
    server.listen(options.port, function(err) {
        if (!err) {

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
    server.close();
    setTimeout(callback, 300);
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
    /*if (io) {
        var clients = io.sockets.clients();
        clients.forEach(function(socket) {
            if (socket.handshake.session.authenticated === true) {
                socket.send("log", {sessionId: socket.id, cache: false, log: log});
            }
        });
    }*/

    return exports;

};

var sessions = new SessionStore();

function sendLoginInfo(socket) {

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

    socket.emit("login-succeded");
    socket.emit("log", {log: exports.log()});
    socket.emit("deploys", {deploys: deploys});

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

function getDeployFromId(id) {
    var list = getDeployList();
    for(var i = 0, ii = list.length; i < ii; i++){
        var item = list[i];
        if (id == item.id) {
            console.log("YES");
            return item;
        }
    }
    return null;
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


    deploysList.forEach(function(item) {
        if (!item.id) {
            item.id = item.repo.replace(/[\/:]/g, '').toLowerCase();
        }
    });

    return deploysList;

}


// randomString returns a pseude-random ASCII string which contains at least the specified number of bits of entropy
// the return value is a string of length ⌈bits/6⌉ of characters from the base64 alphabet
function randomString(bits) {
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

