(function() {

    nunt.on(nunt.CONNECTED, function() {

        nunt.on("log", function(e) {

            var logDom = document.getElementById("log");
            logDom.innerHTML = e.log;

        });

    });

})();
