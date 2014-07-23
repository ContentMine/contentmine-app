
var scrapers = require("../lib/scrapers")
,   fs = require("fs")
,   pth = require("path")
,   $app
,   routes = {
        scraper:        {}
    ,   documents:      {}
    ,   "journal-tocs": {}
    }
;

// error messages
function error (msg) {
    $("#msg-error")
        .find("span.message").text(msg).end()
        .show()
    ;
}

// in-app navigation
function loadPartial (name) {
    if (!routes[name]) return;
    if (routes[name].partial) return routes[name].partial;
    routes[name].partial = fs.readFileSync(pth.join("views", name + ".html"), "utf8");
    return routes[name].partial;
}
function navigate (route, data) {
    var partial = loadPartial(route);
    if (!partial) return error("Broken link, no partial!");
    $app.html(partial);
    if (routes[route].onload) routes[route].onload(data);
    $(".active").removeClass("active");
    $("ul.nav > li > a[href='" + route + "']").parent().addClass("active");
}

// the scraper UI
routes.scraper.onload = function () {
    // put the scrapers in the form
    scrapers.listScrapers(function (err, names) {
        if (err) return error("Failed to list scrapers: " + err);
        var $scraperSel = $("#scraper");
        $scraperSel.empty();
        $("<option value='*'>All</option>").appendTo($scraperSel);
        $.each(names, function (i, n) {
            $("<option></option>")
                .attr("value", n)
                .text(n.replace(/\.json$/, ""))
                .appendTo($scraperSel)
            ;
        });
    });
    
    // form state toggling
    var $submit = $("#submit")
    ,   $cancel = $("#cancel")
    ,   $running = $("#running")
    ,   $log = $("#log")
    ;
    
    function stop () {
        $cancel.attr("disabled", "disabled");
        $submit.removeAttr("disabled");
        $running.hide();
    }
    
    // cancel stuff
    //  WARNING: this does not actually stop the threshing, it only resets the UI
    //  We could stop the thresher, see mentions of worker in lib/scrapers.js
    $cancel.click(function () {
        stop();
        $log.hide();
    });

    // handle submissions
    $("#scraper-form").submit(function (ev) {
        ev.preventDefault();
        $submit.attr("disabled", "disabled");
        $cancel.removeAttr("disabled");
        $running.show();
        var data = {
                urls:       $("#inputURLs")
                                .val()
                                .split("\n")
                                .filter(function (url) {
                                    return /^http/i.test(url);
                                })
            ,   scraper:    $("#scraper").val()
            ,   rate:       $("#rate").val() || 3
            ,   dataDir:    require("nw.gui").App.dataPath
            }
        ,   scraperBox = scrapers.getScraperBox(data)
        ,   finished = 0
        ,   total = data.urls.length
        ,   $ul = $log.find("ul")
        ,   addLine = function (level, msg) {
                return $("<li></li>").addClass("text-" + level).text(msg).prependTo($ul);
            }
        ;
        $ul.empty();
        $log.show();
        addLine("info", "Running scrape...");
        if (!data.urls.length) {
            addLine("danger", "No URLs!");
            return stop();
        }
        
        scraperBox.on("scrapersLoaded", function (num) { addLine("info", "Loaded " + num + " scrapers"); });
        scraperBox.on("gettingScraper", function (url) { addLine("info", "Getting scraper for " + url); });
        scraperBox.on("scraperFound", function () { addLine("info", "Found scraper"); });
        scraperBox.on("scrapeStart", function () { addLine("info", "Starting to scrape"); });
        scraperBox.on("pageRendered", function () { addLine("info", "Rendered HTML page"); });
        scraperBox.on("pageDownload", function () { addLine("info", "Downloaded HTML page"); });
        scraperBox.on("elementCaptured", function (data) {
            var info = Object.keys(data).join(", ");
            addLine("info", "Captured information: " + info);
        });
        scraperBox.on("scrapeScraperJSONResults", function () { addLine("info", "Generated JSON results"); });
        scraperBox.on("scrapeHtmlResults", function () { addLine("info", "Generated HTML results"); });
        scraperBox.on("scrapeResults", function () { addLine("info", "Results completed"); });
        scraperBox.on("downloadCompleted", function (url) { addLine("info", "Downloaded " + url); });
        scraperBox.on("end", function () {
            finished++;
            var $sucLI = addLine("success", "Success! (" + finished + "/" + total + ")");
            if (finished === total) {
                stop();
                var $docsUL = $("<ul></ul>");
                for (var url in scraperBox.url2dir) {
                    if (scraperBox.url2dir.hasOwnProperty(url)) {
                        $("<li><a></a></li>")
                            .find("a")
                                .attr({ href: "documents", "data-dir": scraperBox.url2dir[url] })
                                .addClass("navigate")
                                .text(url)
                            .end()
                            .appendTo($docsUL)
                        ;
                    }
                }
                $sucLI.append($docsUL);
            }
        });
        // in sickness and in health
        scraperBox.on("error", function (err) {
            addLine("danger", "ERROR: " + err);
            stop();
        });
        scraperBox.on("warn", function (warn) { addLine("warning", "WARNING: " + warn); });
        scraperBox.on("elementCaptureFailed", function (def) { addLine("warning", "Failed to capture data element: " + JSON.stringify(def, null, 1)); });
        scraperBox.on("downloadError", function (err) { addLine("warning", "Failed to download content: " + err); });
        
        scraperBox.run();
    });
};

// the documents UI
routes.documents.onload = function (data) {
    // listing a specific document, with the directory provided
    if (data.dir) {
        
    }
    // listing all docs
    else {
        
    }
};


// routing - let's get this party started!
$(function () {
    $app = $("#app");
    $("body").on("click", "a.navigate", function (ev) {
        var $a = $(ev.currentTarget)
        ,   href = $a.attr("href")
        ,   data = {}
        ;
        // for some reason data set does not seem to work
        for (var i = 0, n = ev.currentTarget.attributes.length; i < n; i++) {
            var attr = ev.currentTarget.attributes.item(i);
            if (/^data-/.test(attr.name)) data[attr.name.replace("data-", "")] = attr.value;
        }
        ev.preventDefault();
        navigate(href, data);
    });
    navigate("scraper", {});
});
