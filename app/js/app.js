
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

// in-app navigation
function loadPartial (name) {
    if (!routes[name]) return;
    if (routes[name].partial) return routes[name].partial;
    routes[name].partial = fs.readFileSync(pth.join("views", name + ".html"), "utf8");
    return routes[name].partial;
}
function navigate (route, data, $link) {
    var partial = loadPartial(route);
    if (!partial) alert("Broken link!"); // XXX better error dialog
    $app.html(partial);
    if (routes[route].onload) routes[route].onload(data);
    if ($link && $link.parent("li")) {
        $(".active").removeClass("active");
        $link.parent("li").addClass("active");
    }
}

// the scraper UI
routes.scraper.onload = function () {
    // put the scrapers in the form
    scrapers.listScrapers(function (err, names) {
        // XXX need a friendly alert dialog instead
        if (err) return alert(err);
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
    
    // handle submissions
    $("#scraper-form").submit(function (ev) {
        ev.preventDefault();
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
        ;
        scraperBox.run();
    });
};

// routing - let's get this party started!
$(function () {
    $app = $("#app");
    $("body").on("click", "a.navigate", function (ev) {
        var $a = $(ev.currentTarget)
        ,   href = $a.attr("href")
        ,   data = ev.currentTarget.dataSet || {}
        ;
        ev.preventDefault();
        navigate(href, data, $a);
    });
    navigate("scraper", {}, $("ul.nav > li > a[href='scraper']"));
});
