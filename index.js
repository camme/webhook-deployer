var defaultOptions = {
    port: 8080,
    config: "deploys.json"
};

var options = defaultOptions;

var http = require("http");
var fs = require("fs");
var path = require("path");
var querystring = require("querystring");
var exec  = require('child_process').exec;


var server = http.createServer(function(req, res) {


    var data = "";
    req.on("data", function(chunk) {
        data += chunk;
    });

    req.on("end", function() {

    res.write("hello");

    if (req.method == "POST") {

        req.params = querystring.parse(data);


        // this stuf is to handle multipart

        //var boundaryData = /--([\w\d]+)$/.exec(req.headers['content-type']);
        //var boundary = boundaryData && boundaryData[1];

        //var dataList = data.split(boundary);
        //dataList.pop();

        //console.log(dataList);


        //if (data.match(/content-disposition: form-data;/i)) {
        //var formDataRe = /content-disposition: form-data;([.\W]*?)/gi;
        //var formData = formDataRe.exec(data);
        //console.log(formData);
        //}

    }
    else {
        req.params = {};
    }

    for(var i = 0, ii = routes.length; i < ii; i++){
        var route = routes[i];
        var match  = route.route.exec(req.url);
        if (match) {
            req.params.urlData = match && match.length > 0 ? match[1] : null;
            route.action(req, res); 
            break;
        }
    };

    res.end();

    });

});

function incoming(req, res) {


    var deployConfig = JSON.parse(fs.readFileSync(options.config, 'utf8'));

    deployConfig.deploys.forEach(function(deploy) {

        if (deploy.type == "github") {

            var repoData = JSON.parse(req.params.payload);

            console.log("Checking %s...", repoData.repository.url);

            if (repoData.repository.url == deploy.repo) {

                var branch = repoData.ref.split("/").pop();

                if (branch == deploy.branch) {

                    console.log("\n");
                    console.log("Run %s with branch '%s'", deploy.name, branch);
                    console.log("");

                    var localPath = path.resolve(deploy.basepath);

                    exec(deploy.command, {
                        cwd: localPath
                    }, function(err, result) { 
                    }).stdout.on('data', function(data) {
                        process.stdout.write(data.toString());
                    });

                }
            }

        }
    });

}

function index(req, res, next) {
    //next();
};

var routes = [{
    route: /^\/incoming\/(.*?)($|\/$)/gi,
    action: incoming
},{
    route: /^\/$/g,
    action: index
}]




server.listen(options.port);
