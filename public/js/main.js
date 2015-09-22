(function() {

    var socket = io(); 

    socket.on("log", function(e) {
        var logDom = document.getElementById("log");
        logDom.innerHTML = e.log;
    });

    socket.on("deploys", function(e) {
        var template = "{{#deploys}}<tr data-id='{{deploy.id}}'><td><button>DEPLOY</button><td>{{deploy.repo}}</td><td>{{deploy.branch}}</td></tr>{{/deploys}}";
        var html = Mustache.to_html(template, e);
        document.querySelector(".deploys-box tbody").innerHTML = html;

        var buttons = document.querySelectorAll(".deploys-box button");
        for(var i = 0, ii = buttons.length; i < ii; i++) {
            var button = buttons[i];
            button.addEventListener("click", function() {
                var id = this.parentNode.parentNode.getAttribute("data-id");
                console.log("TJENA", id);
                socket.emit("run-deploy", {id: id});
            }, false);
        }
    });

    socket.on("not-logged-in", function(e) {

        var logDom = document.getElementById("log");
        logDom.innerHTML = "Please login!";
        var logContainer = document.querySelector(".login-box");
        logContainer.style.display = "block";

        document.querySelector(".deploys-box").style.display = "none";
        document.querySelector(".login-box .error").style.display = "none";

        document.querySelector(".login-box button").addEventListener("click", function() {
            document.getElementById("log").innerHTML = "Trying to log in...";
            var username = document.querySelector(".login-box #username").value;
            var password = document.querySelector(".login-box #password").value;
            socket.emit("login", {username: username, password: password});
        }, false);

    });

    socket.on("login-error", function(e) {
        document.getElementById("log").innerHTML = "Login error";
        document.querySelector(".login-box .error").style.display = "block";
    });

    socket.on("login-succeded", function(e) {
        document.querySelector(".login-box button").removeEventListener("click");
        document.querySelector(".login-box").style.display = "none";
        document.querySelector(".deploys-box").style.display = "block";
    });

})();
