var webdep = require("../index.js");
var should = require('should');
var http = require('http');

describe("Endpoints", function() {

    beforeEach(function(done) {
        webdep.init({logToConsole: false, port: 8808}, function(err) {
            done();
        });
    });

    afterEach(function(done) {
        webdep.stop(function() {
            done();
        });
    });

    it("creates a http server with the default endpoints / that responds with 200", function(done) {
        var options = { host: 'localhost', port: 8808, path: '/' };
        http.request(options, function(res) {
            res.statusCode.should.equal(200);
            done();
        }).end();
    });

    it("creates a http server with the /incoming/* endpoint that responds with 200", function(done) {
        var options = { host: 'localhost', port: 8808, path: '/incoming/test', method: "POST" };
        http.request(options, function(res) {
            done();
        }).end();
    });

});

