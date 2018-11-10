
String.prototype.replaceAll = function(search, replacement) {
    var target = this;
    return target.replace(new RegExp(search, 'g'), replacement);
};


var express = require('express');
var fs = require('fs');
const fse = require('fs-extra');

const rp = require('request-promise');
const cheerio = require('cheerio');
var app     = express();
var uriAnalizer = require('url');
var fs = require('fs');
var dir = './sites/';
var name;


if (!fs.existsSync(dir)){
    fs.mkdirSync(dir);
}

var pendingLinks = [];
var visitedLinks = [];

app.get('/scrape',function(req, res){
    
    pendingLinks.push(req.query.url);  // Add parent uri to visitedLinks' queue 
    const lib = req.query.url.startsWith('https') ? require('https') : require('http');
    name = uriAnalizer.parse(req.query.url).host+parseInt(Math.random() * 10) + 1
    dir = dir+name;
    res.type("text/html");   // Response type as HTML document
    
    scrapping = () => {
        if(pendingLinks.length > 0){
            
            var url = pendingLinks.pop();
            console.log("\n|| Pendientes ["+pendingLinks.length+"] || Visitados ["+visitedLinks.length+"] ||\n");
            console.log(" -> Creando hilo: Rascando pagina ["+url+"]");

            rp({
                uri: url,
                transform: function (body) {
                    return cheerio.load(body);
                }
            })
            .then(($) => { 
                //var pageTitle = $('title').html();
                var pageTitle = uriAnalizer.parse(url).pathname;
                var host = uriAnalizer.parse(url).host;
                if(pageTitle.substr(-1) == "/") {
                    pageTitle = pageTitle.slice(0, -1)+".html";
                    //console.log(pageTitle);
                }
                else if (!pageTitle.includes(".html") && !pageTitle.includes(".php")) pageTitle += ".html";

                if(pageTitle == ".html") pageTitle = "index.html";

                $('a').each( function () {
                    
                    var link = $(this).attr('href');
                    //console.log(link);
                    let uri = uriAnalizer.parse(link);
                    if(link != undefined ) 
                    if( uri.host == host && !pageTitle.includes(".jpg") && !pageTitle.includes(".png") && !link.includes("?") && !link.includes("#") && !link.includes("tel:")){
                        let absoluteUri = uriAnalizer.resolve(url, link);
                        if(!pendingLinks.includes(absoluteUri) && !visitedLinks.includes(absoluteUri)) pendingLinks.push(absoluteUri);
                    }else{
                        console.log("Se trata de otro sitio ["+link+"] o no es valido");
                    }
                    
                });

                fse.outputFile(dir+"/"+pageTitle, "<!DOCTYPE html><html>"+$('html').html()+"</html>", err => {
                    if(err) {
                      console.log(err);
                    } else {
                      console.log(' -> Cerrando hilo: Archivo creado ['+dir+"/"+pageTitle+']');
                    }
                  })

                visitedLinks.push(url);
                

                setTimeout(scrapping,100);
            })
            .catch((err) => {
                //console.log(err);
                console.log("Error 404: "+url);
                setTimeout(scrapping,100);
            });
        }else{
            console.log("Script Finalizado: No se han detectado otros sitios para clonar.");
            console.log(pendingLinks, visitedLinks);
            //res.redirect("/");
        }
    };

    scrapping();
});

app.get('/', function(req, res){
    res.type("text/html");
    res.send(`
        <form method="get" action="/scrape">
            <p>Introduzca el link a scrapear</p>
            <input name="url" type="text">
            <button type="submit">Continuar</button>
        </form>
    `);
});

app.listen('8081')
console.log('Magic happens on port 8081');
exports = module.exports = app;