var webdep = require("../index.js");
var should = require('should');
var webdriverjs = require('webdriverjs');
var http = require('http');
var fs = require('fs');
var path = require('path');
var cp = require('child_process');
var nunt = require('nunt');

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

    it("login in with incorrect info will send an error event", function(done) {
        nunt.on("login-error", function() {
            done();
        });

        // fake client
        var mockClient = {handshake: {session: {} }};
        nunt.send("login", {username: "1", password: "2", _client: mockClient});
    });

    it("login in with the correct info will send an login event", function(done) {
        nunt.on("login-succeded", function() {
            done();
            nunt.removeListener('login-succeded');
        });

        // fake client
        var mockClient = {handshake: {session: {} }};
        nunt.send("login", {username: "hi", password: "hello", _client: mockClient});
    });

    it("login in from the site works correclty", function(done) {

        nunt.on("login-succeded", function() {
            done();
        });

        client
            .url('http://localhost:8808')
            .pause(500)
            .setValue("#username", "hi")
            .setValue("#password", "hello")
            .click("button");

    });


});
