var fs = require("fs");
var path = require("path");
var mustache = require('mustache');

module.exports = function render(res, template, data, status) {

    var templateFile = path.resolve(templatePath, template);

    fs.readFile(templateFile, 'utf8', function(err, template) {

        if (!err) {

            // overload hanadling
            if (typeof data == "number") {
                status = data;
                data = null;
            }

            // set the status if we have one
            if (status) {
                res.statusCode = status;
            }

            data = data || {};

            // default info
            var defaultData = {
                version: packageInformation.version
            };

            for(var key in defaultData) {
                data[key] = defaultData[key];
            }

            var html = mustache.to_html(template, data);
            res.write(html);

        }
        else {
            res.write(err);
        }
        res.end();

    });
}


