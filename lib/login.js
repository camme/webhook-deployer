
var fs = require('fs');
var webdep = require('./webdep');

exports.control = function(options) {

    return function index(req, res) {
        res.render("login.html", {
            version: webdep.packageInformation.version,
            log: log,
            deploys: deploys
        });
    };

};

exports.process = function(options) {

    return function index(req, res) {
        res.render("login.html", {
            version: webdep.packageInformation.version,
            log: log,
            deploys: deploys
        });
    };

};
