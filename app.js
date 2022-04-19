var { createHash } = require('crypto');
//Example hash: createHash('sha256').update('message' + hashPepper).digest('hex');
var express = require('express');
var fs = require('fs');
var mysql = require('mysql');

const configData = JSON.parse(fs.readFileSync('config.json'));

var dbConnection;
dbConnection = mysql.createConnection(configData.dbOptions);
dbConnection.connect((err) => {
    if (err) throw err;

    console.log("Connected to database!");
});



var app = express();
app.listen('8080', () => {
    console.log('Webserver open on port 8080!');
});
app.use(express.urlencoded({
    extended: true
}));

app.get('/', (req, res) => {
    console.log('/ requested!');

    //Generate grid of movies as html using bootstrap of course
    let movieGrid = '';
    dbConnection.query('SELECT * FROM movies', (err, result, fields) => {
        if (err) throw err;

        for (let row = 0; row < result.length/4; row++) {
            //Start row
            movieGrid += '<div class="row">'

            //Add four movies
            for (let i = 0; i < 4; i++) {
                if (i + row*4 < result.length) {
                    //Add movie
                    movieGrid += '\n\t<div class="col-sm-3">\n\t\t<button class="btn" type="button" onclick="movieClicked(' + result[row*4 + i].id + ')">\n\t\t\t<img src="' + result[row*4 + i].imageURL + '" style="width:100%">\n\t\t</button>\n\t</div>';
                } else {
                    //Index out of bounds
                    break;
                }
            }

            //End row
            movieGrid += '\n</div>'
        }

        //Insert grid into index.html
        fs.readFile('site/index.html', 'utf-8', (err, data) => {
            res.writeHead(200, {'Content-Type': 'text/html'});
            
            data = data.replace('{0}', movieGrid);

            res.write(data);
            return res.end();
        });
    });
});
app.get('/main.js', (req, res) => {
    console.log('/main.js requested!');
    fs.readFile('site/main.js', (err, data) => {
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
        let hash = createHash('sha256').update(req.body.password + configData.hashPepper).digest('hex');

        if (dbHash == hash) {
            res.send("Logged in!");
        } else {
            res.send("Password mismatch!");
        }
    });
});