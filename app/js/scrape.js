
var scrapers = require("../lib/scrapers")
;
scrapers.listScrapers(function (err, names) {
    console.log(err, names);
});