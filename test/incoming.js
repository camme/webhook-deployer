var webdep = require("../index.js");
var should = require('should');
var http = require('http');
var fs = require('fs');
var path = require('path');
var dumpFile = path.resolve(__dirname, "temp.txt");
var now, deploys;

describe("Incoming", function() {

    beforeEach(function(done) {

        now = Date.now();
        deploys = [{
            "name": "Webhook Deployer",
            "type": "github",
            "repo": "https://github.com/camme/temp",
            "basepath": __dirname,
            "command": "echo " + now + " > " + dumpFile,
            "branch": "master"
        }];

        webdep.init({deploys: deploys, logToConsole: false, port: 8808}, function(err) {
            done();
        });

    });

    afterEach(function(done) {
        if (fs.existsSync(dumpFile)) {
            fs.unlinkSync(dumpFile);
        }
        webdep.stop(function() {
            done();
        });
    });

    it("a post to the incoming endpoint will result in an error if the data submited is wrong", function(done) {
        var options = { host: 'localhost', port: 8808, path: '/incoming/test', method: "POST" };
        http.request(options, function(res) {
            res.statusCode.should.equal(500);
            done();
        }).end();
    });

    it("a post to the incoming endpoint will give a 200 status if the correct data is sent to a github deploy type", function(done) {
        var options = { deploys: deploys, host: 'localhost', port: 8808, path: '/incoming/test', method: "POST" };
        var req = http.request(options, function(res) {
            res.statusCode.should.equal(200);
            done();
        });
        req.write("payload=" + JSON.stringify({ref:"data/maskin/master", repository: {url: deploys[0].repo}}));
        req.end();
    });

    it("a second post to the incoming endpoint will give a 200 status if the correct data is sent to a github deploy type", function(done) {
        var options = { deploys: deploys, host: 'localhost', port: 8808, path: '/incoming/test', method: "POST" };
        var payload = JSON.stringify({ref:"data/maskin/master", repository: {url: deploys[0].repo}});
        var req1 = http.request(options, function(res1) {
            var req2 = http.request(options, function(res2) {
                res2.statusCode.should.equal(200);
                done();
            });
            req2.write("payload=" + payload);
            req2.end();
        });
        req1.write("payload=" + payload);
        req1.end();
    });


    it("a post to the incoming endpoint will give run a deploy command for a github deploy type", function(done) {
        var options = { host: 'localhost', port: 8808, path: '/incoming/test', method: "POST" };
        var req = http.request(options, function(res) {
            res.statusCode.should.equal(200);
            setTimeout(function() {
                var content = fs.readFileSync(dumpFile, 'utf8').replace(/\n/, "");
                content.should.equal(now.toString());
                done();
            }, 100);
        });
        req.write("payload=" + JSON.stringify({ref:"data/maskin/master", repository: {url: deploys[0].repo}}));
        req.end();
    });


});

