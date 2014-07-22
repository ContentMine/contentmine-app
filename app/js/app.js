/*globals page*/

var scrapers = require("../lib/scrapers")
,   partials = {}
,   $app
;

// load up all partials at start-up, *before* doing anything to the routing

// simple partials handling
function setView (html, cb) {
    console.log("setting up view");
    $app.html(html);
    if (cb) cb();
}

function loadPartial (name, cb) {
    console.log("loading partial " + name + ", " + document.location);
    if (partials[name]) setView(partials[name], cb);
    $.get(name + ".html", function (html) {
        console.log("got html");
        partials[name] = html;
        setView(partials[name], cb);
    });
}

// load scraper UI
function showScraper () {
    console.log("showing scraper");
    loadPartial("scraper", function () {
        console.log("result from loadPartial");
        scrapers.listScrapers(function (err, names) {
            // XXX need a friendly alert dialog instead
            if (err) return alert(err);
            var $scraperSel = $("#scraper");
            $scraperSel.empty();
            $.each(names, function (i, n) {
                $("<option></option>")
                    .attr("value", n)
                    .text(n.replace(/\.json$/, ""))
                    .appendTo($scraperSel)
                ;
            });
        });
    });
}

// load documents UI
function showDocuments () {
    loadPartial("documents");
}

// load JournalTOCs UI
function showJTOCs () {
    loadPartial("journal-tocs");
}




// routing - let's get this party started!
$(function () {
    console.log("starting up");
    console.log(document.location);
    $app = $("#app");
    page("/", showScraper);
    page("/documents", showDocuments);
    page("/journal-tocs", showJTOCs);
    page();
    page("/");
});
