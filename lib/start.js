
exports.control = function(options) {
    return function index(req, res, next) {
        res.render("index.html");
    };
};
