var fs = require('fs');
var path = require('path');
var webdep = require('./webdep');

exports.control = function(options) {

    return function index(req, res, next) {

        if (req.url.indexOf(".js")) {
            res.setHeader("Content-Type", "text/javascript");
        }

        var file = path.join(webdep.publicPath, req.url);

        // Just make sure we dont try to get outside the public folder
        if (file.indexOf(webdep.publicPath) > -1) {

            fs.exists(file, function(exists) {

                if (exists) {

                    fs.readFile(file, 'utf8', function(err, fileContent) {
                        if (err) throw err;
                        res.write(fileContent);
                        res.end();
                    });

                }
                else {
                    res.render("404.html", 404);
                }

            });

        }
        else {
            res.render("404.html", 404);
        }

    };

};
