var hashPepper = 'edd8ff41-7fcf-45bc-9e2f-1aa488167f3b'; //DO NOT CHANGE. I CAN'T STRESS THIS ENOUGH, IF THIS IS CHANGED, THE DATABASE WILL BE USELESS!!!!!

var { createHash } = require('crypto');
//Example hash: createHash('sha256').update('message' + hashPepper).digest('hex');
var express = require('express');
var fs = require('fs');
var mysql = require('mysql');

var dbConnection = mysql.createConnection({
    host: "localhost",
    user: "root",
    password: "root",
    database: "mml"
});

dbConnection.connect((err) => {
    if (err) throw err;

    console.log("Connected to database!");
})

var app = express();

app.listen('8080', () => {
    console.log('Webserver open on port 8080!');
});

app.use(express.urlencoded({
    extended: true
}));

app.get('/', function(req, res) {
    console.log('/ requested!');
    fs.readFile('site/index.html', (err, data) => {
        res.writeHead(200, {'Content-Type': 'text/html'});
        res.write(data);
        return res.end();
    });
});
app.get('/main.js', (req, res) => {
    console.log('/main.js requested!');
    fs.readFile('site/main.js', function(err, data) {
        res.writeHead(200, {'Content-Type': 'text/plain'});
        res.write(data);
        return res.end();
    });
});
app.get('/login.html', (req, res) => {
    console.log('/login.html requested!');
    fs.readFile('site/login.html', function(err, data) {
        res.writeHead(200, {'Content-Type': 'text/html'});
        res.write(data);
        return res.end();
    });
});



const {body, validationResult} = require('express-validator');

app.post(
    '/login',
    body('email').isEmail(),
    body('password').isLength({min: 5}),
    (req, res) => {
    let errors = validationResult(req);
    if (!errors.isEmpty()) {
        return res.status(400).json({errors: errors.array()});
    }

    let sql = 'SELECT * FROM users WHERE email = "' + req.body.email + '";';
    dbConnection.query(sql, (err, result, fields) => {
        if (err) throw err;
        
        //Check the hashed value from db with the hashed value of inputted password
        let dbHash = result[0].phash;
        let hash = createHash('sha256').update(req.body.password + hashPepper).digest('hex');

        if (dbHash == hash) {
            res.send("Logged in!");
        } else {
            res.send("Password mismatch!");
        }
    });
});