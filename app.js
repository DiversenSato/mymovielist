var express = require('express');
var fs = require('fs');

var app = express();

app.listen('8080', function() {
    console.log('Webserver open on port 8080!');
});

app.get('/', function(req, res) {
    console.log('/ requested!');
    fs.readFile('index.html', function(err, data) {
        res.writeHead(200, {'Content-Type': 'text/html'});
        res.write(data);
        return res.end();
    });
});
app.get('/main.js', function(req, res) {
    console.log('/main.js requested!');
    fs.readFile('main.js', function(err, data) {
        res.writeHead(200, {'Content-Type': 'text/plain'});
        res.write(data);
        return res.end();
    });
});