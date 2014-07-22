
var fs = require("fs")
,   pth = require("path")
,   scraperDir = pth.join(__dirname, "../scrapers/scrapers")
;

// returns a list of the available scrapers, including the .json
exports.listScrapers = function (cb) {
    if (!cb) return;
    fs.readdir(scraperDir, function (err, files) {
        files = files.filter(function (f) { return /\.json$/.test(f); });
        cb(err, files);
    });
};
