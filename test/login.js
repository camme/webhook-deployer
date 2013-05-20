var webdep = require("../index.js");
var should = require('should');
var webdriverjs = require('webdriverjs');
var http = require('http');
var fs = require('fs');
var path = require('path');
var cp = require('child_process');
var nunt = require('nunt');
var userConfig = null;

describe("Login", function() {

    this.timeout(10000);
    var client = {};
    var wdServerProcess = null;

    before(function(done){
        var wdInit = false;
        var args = ["-jar", path.resolve(__dirname, "../node_modules/webdriverjs/bin/selenium-server-standalone-2.31.0.jar")];
        wdServerProcess = cp.spawn("java", args);
        wdServerProcess.stdout.on("data", function(result) {
            if (!wdInit && result.toString().indexOf("Started HttpContext") > -1) {
                client = webdriverjs.remote({ logLevel: 'silent', desiredCapabilities: {browserName: 'phantomjs'} });
                client.init();
                done();
                wdInit = true;
            }
        });
    });

    after(function(done) {
        client.end(function() {
            wdServerProcess.on("close", function() { console.log(":hej"); });
            wdServerProcess.kill('SIGHUP');
            done();
        });
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
            done();
        });

    });

    afterEach(function(done) {
        webdep.stop(function() {
            done();
        });
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
            nunt.removeListener('login-error', cb);
        }

        nunt.on("login-error", cb);

        // fake client
        var mockClient = {handshake: {session: {} }};
        nunt.send("login", {username: "1", password: "2", _client: mockClient});
    });

    it("with the correct info will send an login event", function(done) {

        function cb() {
            done();
            nunt.removeListener('login-succeded', cb);
        }

        nunt.on("login-succeded", cb);

        // fake client
        var mockClient = {handshake: {session: {} }};
        nunt.send("login", {username: "hi", password: "hello", _client: mockClient});
    });

    it("from the site works correclty", function(done) {

        function cb() {
            done();
            nunt.removeListener('login-succeded', cb);
        }

        nunt.on("login-succeded", cb);

        client
            .url('http://localhost:8808')
            .pause(500)
            .setValue("#username", "hi")
            .setValue("#password", "hello")
            .click("button");

    });


    it("a config with a different user/password works as well", function(done) {

        var hasFailed = false;
        function cb() {
            hasFailed.should.equal(true);
            nunt.removeListener('login-succeded', cb);
            done();
        }

        function cbError() {
            hasFailed = true;
            nunt.removeListener('login-error', cbError);
            var mockClient = {handshake: {session: {} }};
            nunt.send("login", {username: "data", password: "maskin", _client: mockClient});
        }


        nunt.on("login-succeded", cb);
        nunt.on("login-error", cbError);

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

                // fake client
                var mockClient = {handshake: {session: {} }};
                nunt.send("login", {username: "hi", password: "hello", _client: mockClient});

            });
        });

    });

});
