
var scrapers = require("../lib/scrapers")
;

// XXX currently triggered on load, may likely move to whatever route triggers it
$(function () {
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
