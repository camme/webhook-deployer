var webdep = require("../index.js");
var should = require('should');
var webdriverio = require('webdriverio');
var http = require('http');
var fs = require('fs');
var path = require('path');
var cp = require('child_process');
var userConfig = null;

describe("Login", function() {

    this.timeout(10000);

    var client = {};
    var wdServerProcess = null;
    var socket;

    before(function(done){
        var wdInit = false;
        var seleniumServerPath = path.join(__dirname, "../node_modules/selenium-standalone/.selenium/2.43.1/server.jar");
        var args = ["-jar", seleniumServerPath];
        wdServerProcess = cp.spawn("java", args);

        function next(result) {
            if (!wdInit && result.toString().indexOf("Started HttpContext") > -1) {
                client = webdriverio.remote({ logLevel: 'silent', desiredCapabilities: {browserName: 'phantomjs'} });
                client.init(done);
                wdInit = true;
            }
        }

        wdServerProcess.stdout.on("data", next);
        wdServerProcess.stderr.on("data", next);

    });

    after(function(done) {
        wdServerProcess.kill('SIGHUP');
        wdServerProcess.on("close", function() { console.log(":hej"); });
        client.end(function() { });
        setTimeout(done, 1000);
    });

    beforeEach(function(done) {

        var deploys = [{
            "name": "Webhook Deployer",
            "type": "github",
            "repo": "https://github.com/camme/temp",
            "basepath": __dirname,
            "command": "ls",
            "branch": "master"
        }];

        webdep.init({deploys: deploys, logToConsole: false, port: 8808}, function(err) {
            socket = require('socket.io-client')('http://localhost:8808');
            done();
        });

    });

    afterEach(function(done) {
        webdep.stop(done);
    });

    it("when loading the info page the first time, you are not loged in.", function(done) {
        client
            .url('http://localhost:8808')
            .pause(500)
            .getText("#log", function(err, result) {
                result.should.equal("Please login!");
            })
            .call(done);
    });

    it("with incorrect info will send an error event", function(done) {

        function cb() {
            done();
        }

        socket.once("login-error", cb);
        socket.emit("login", {username: "1", password: "2"});

    });

    it("with the correct info will send a login event", function(done) {

        function cb() {
            done();
        }

        socket.once("login-succeded", cb);

        // fake client
        socket.emit("login", {username: "hi", password: "hello"});
    });

    it("from the site works correclty", function(done) {

        client
            .url('http://localhost:8808')
            .call(function() { console.log("d"); })
            .pause(500)
            .call(function() { console.log("d"); })
            .waitForVisible("#username", 5000)
            .call(function() { console.log("d"); })
            .setValue("#username", "hi")
            .setValue("#password", "hello")
            .click("button")
            .waitForVisible("table", 5000)
            .call(function() { console.log("d"); })
            .call(done);

    });


    it("a config with a different user/password works as well", function(done) {

        var hasFailed = false;
        function cb() {
            hasFailed.should.equal(true);
            done();
        }

        function cbError() {
            hasFailed = true;
            socket.emit("login", {username: "data", password: "maskin"});
        }


        socket.once("login-succeded", cb);
        socket.once("login-error", cbError);

        var deploys = [{
            "name": "Webhook Deployer",
            "type": "github",
            "repo": "https://github.com/camme/temp",
            "basepath": __dirname,
            "command": "ls",
            "branch": "master"
        }];

        webdep.stop(function() {

            webdep.init({username: "data", password: "maskin", deploys: deploys, logToConsole: false, port: 8808}, function(err) {

                socket.emit("login", {username: "hi", password: "hello"});

            });
        });

    });

});
