var fs = require('fs');
var path = require('path');
var webdep = require('./webdep');
var stylus = require('stylus');

exports.control = function(options) {

    return function index(req, res, next) {

        res.setHeader("Content-Type", "text/css");

        var file = path.join(webdep.publicPath, req.url.replace(".css", ".styl"));

        // Just make sure we dont try to get outside the public folder
        if (file.indexOf(webdep.publicPath) > -1) {

            fs.exists(file, function(exists) {

                if (exists) {
                    fs.readFile(file, 'utf8', function(err, styl) {

                        stylus.render(styl, { filename: 'nesting.css' }, function(err, css){
                            if (err) throw err;
                            res.write(css);
                            res.end();
                        });

                    });

                }
                else {
                    res.render("404.html", status);
                }

            });

        }
        else {
            res.render("404.html", status);
        }


    };

};
