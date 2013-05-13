
var webdep = require("../index.js");
var should = require('should');

describe("Start and stop -", function() {

    beforeEach(function(done) {
        done();
    });

    afterEach(function(done) {
        done();
    });

    it("Starting the app calls the init callback when done, and closes it again when calloing stop", function(done) {
        webdep.init(function(err) {
            should.not.exist(err);
            webdep.stop(function() {
                done();
            });
        });
    });

    it("Starting the app with options calls the init callback when done", function(done) {
        webdep.init({logToConsole: false}, function(err) {
            should.not.exist(err);
            webdep.stop(function() {
                done();
            });
        });
    });

    it("Starting the app with an array instead of a file will get the deploys from the array", function(done) {

        var deploysList = [{
            type: "github",
            command: "echo hello",
            branch: "master",
            repo: "http://localhost/"
        }];

        webdep.init({logToConsole: false, deploys: deploysList}, function(err) {
            should.not.exist(err);
            webdep.stop(function() {
                done();
            });
        });
    });


});
   
