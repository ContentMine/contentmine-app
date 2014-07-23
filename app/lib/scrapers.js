
var fs = require("fs")
,   pth = require("path")
,   scraperDir = pth.join(__dirname, "../scrapers/scrapers")
,   thresher = require("thresher")
,   ScraperBox = thresher.scraperbox
;

// returns a list of the available scrapers, including the .json
exports.listScrapers = function (cb) {
    if (!cb) return;
    fs.readdir(scraperDir, function (err, files) {
        files = files.filter(function (f) { return /\.json$/.test(f); });
        cb(err, files);
    });
};

// produce a properly configued ScraperBox
exports.getScraperBox = function (data) {
    var SB = new ScraperBox(data.scraper === "*" ? scraperDir : null);
    if (data.scraper !== "*") SB.addScraper(pth.join(scraperDir, data.scraper));
    return {
        sb:         SB
    ,   urls:       data.urls
    ,   rate:       data.rate
    ,   dataDir:    data.dataDir
    ,   outputDir:  pth.join(data.dataDir, "scrapes")
    ,   owd:        null
    ,   run:    function () {
            if (!fs.existsSync(this.outputDir)) fs.mkdirSync(this.outputDir);
            this.owd = process.cwd();
            var self = this;
            // crude rate-limiting
            var mintime = 60000 / this.rate
            ,   lasttime
            ;

            var processURL = function () {
                if (!self.urls.length) return; // XXX emit end
                lasttime = new Date().getTime();
                var url = self.urls.shift()
                ,   def = self.sb.getScraper(url)
                ;
                try {
                    var dir = pth.join(self.outputDir, url.replace(/\/+/g, '_').replace(/:/g, ''));
                    if (!fs.existsSync(dir)) fs.mkdirSync(dir);
                    process.chdir(dir);
                    thresher.scrape.scrape(url, def.elements, function () {
                            process.chdir(self.owd);
                            // do throttling, call next
                            var now = new Date().getTime()
                            ,   diff = now - lasttime
                            ,   timeleft = Math.max(mintime - diff, 0);
                            setTimeout(processURL, timeleft + 1000);
                        });
                }
                catch (e) {
                    // XXX emit error
                }
                
            };
        }
    };
};
