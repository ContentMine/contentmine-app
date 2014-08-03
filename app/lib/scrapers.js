
var fs = require("fs")
,   pth = require("path")
,   util = require("util")
,   jn = pth.join
,   scraperDir = jn(__dirname, "../scrapers/scrapers")
,   thresher = require("thresher")
,   ScraperBox = thresher.scraperbox
,   Thresher = thresher.Thresher
,   async = require("async")
;

// returns a list of the available scrapers, including the .json
exports.listScrapers = function (cb) {
    if (!cb) return;
    fs.readdir(scraperDir, function (err, files) {
        files = files.filter(function (f) { return /\.json$/.test(f); });
        cb(err, files);
    });
};

// returns a list of the documents we have in storage
exports.listDocuments = function (dataDir, cb) {
    if (!cb) return;
    var contentDir = jn(dataDir, "scrapes");
    fs.readdir(contentDir, function (err, files) {
        if (err) return cb(err);
        var res = {};
        async.each( files
                ,   function (f, done) {
                        fs.stat(jn(contentDir, f), function (err, stat) {
                            if (err) return done(err);
                            var jsonPath = jn(contentDir, f, "results.json");
                            if (stat.isDirectory() && fs.existsSync(jsonPath)) {
                                res[f] = exports.getDocument(dataDir, f);
                            }
                            done();
                        });
                    }
                ,   function (err) {
                        if (err) return cb(err);
                        cb(null, res);
                    }
        );
    });
};

// get the data for a specific document
exports.getDocument = function (dataDir, doc) {
    var arr = JSON.parse(fs.readFileSync(jn(dataDir, "scrapes", doc, "results.json"), "utf8"))
    ,   res = {}
    ;
    arr.forEach(function (aspect) {
        var k = Object.keys(aspect)[0];
        if (res[k]) {
            if (util.isArray(res[k])) res[k].push(aspect[k]);
            else res[k] = [res[k], aspect[k]];
        }
        else res[k] = aspect[k];
    });
    return res;
};

// XXX
//  much of the below would work better if it were possible to encapsulate the whole threshing
//  inside a worker (since communication is through events, we can just use postMessage). Notably,
//  it would allow us to terminate the processing early when the user asks for it

// produce a properly configued ScraperBox
exports.getScraperBox = function (data) {
    var SB = new ScraperBox(data.scraper === "*" ? scraperDir : null);
    if (data.scraper !== "*") SB.addScraper(jn(scraperDir, data.scraper));
    var sbEvents = {
        scrapersLoaded: true
    ,   warn:           true
    ,   gettingScraper: true
    ,   scraperFound:   true
    };
    return {
        sb:         SB
    ,   urls:       data.urls
    ,   rate:       data.rate
    ,   dataDir:    data.dataDir
    ,   outputDir:  jn(data.dataDir, "scrapes")
    ,   owd:        null
    ,   listeners:  {}
    ,   url2dir:    {}
    // delegate for now, may revisit this approach later (either worker or proper EE)
    ,   on:     function (name, cb) {
            if (name === "error") {
                this.listeners.error = cb;
                return this.sb.on("error", cb);
            }
            else if (sbEvents[name]) return this.sb.on(name, cb);
            else this.listeners[name] = cb;
        }
    ,   run:    function () {
            if (!fs.existsSync(this.outputDir)) fs.mkdirSync(this.outputDir);
            this.owd = process.cwd();
            var self = this;
            // crude rate-limiting
            var mintime = 60000 / this.rate
            ,   lasttime
            ;
            var processURL = function () {
                if (!self.urls.length) return;
                lasttime = new Date().getTime();
                var url = self.urls.shift()
                ,   def = self.sb.getScraper(url)
                ;
                try {
                    var dir = jn(self.outputDir, url.replace(/\/+/g, '_').replace(/:/g, ''));
                    if (!fs.existsSync(dir)) fs.mkdirSync(dir);
                    process.chdir(dir);
                    var t = new Thresher();
                    t.on("end", function () {
                        self.url2dir[url] = dir;
                        process.chdir(self.owd);
                        // do throttling, call next
                        var now = new Date().getTime()
                        ,   diff = now - lasttime
                        ,   timeleft = Math.max(mintime - diff, 0);
                        setTimeout(processURL, timeleft + 1000);
                    });
                    for (var k in self.listeners) {
                        if (self.listeners.hasOwnProperty(k)) t.on(k, self.listeners[k]);
                    }
                    t.scrape(url, def.elements, true);
                }
                catch (e) {
                    if (self.listeners.error) self.listeners.error(e);
                    return;
                }
            };
            processURL();
        }
    };
};
