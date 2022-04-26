const { createHash } = require('crypto');
//Example hash: createHash('sha256').update('message' + hashPepper).digest('hex');
const express = require('express');
const https = require('https');
const request = require('request');
const url = require('url');
const events = require('events');
const fs = require('fs');
const mysql = require('mysql');

const configData = JSON.parse(fs.readFileSync('config.json'));

//Connect application to database
var dbConnection;
dbConnection = mysql.createConnection(configData.dbOptions);
dbConnection.connect((err) => {
    if (err) throw err;

    console.log("Connected to database!");
});



//Start web application
var app = express();
app.listen('8080', () => {
    console.log('Webserver open on port 8080!');
});
app.use(express.urlencoded({ extended: true }));

//Set routes
app.get('/', (req, res) => {
    //Generate grid of movies as html using bootstrap of course
    let movieGrid = '';
    //Get random set of 48 movies
    dbConnection.query('SELECT * FROM movies JOIN ratings ON movies.movieID = ratings.movieID ORDER BY voteCount DESC LIMIT ' + getRandomInt(0, 187)*48 + ', 48;', async (err, result, fields) => {
        if (err) throw err;

        for (let row = 0; row < result.length/6; row++) {
            //Start row
            movieGrid += '<div class="row">'

            //Add six movies
            for (let i = 0; i < 6; i++) {
                if (i + row*6 < result.length) {
                    let movieIndex = i + row*6;
                    //Add movie
                    let movieID = result[movieIndex].movieID;
                    let url = result[movieIndex].imageURL;
                    let movieName = result[movieIndex].name;
                    let rating = result[movieIndex].rating;

                    if (url == null) {
                        url = '/getImage?movieID=' + movieID;
                    }

                    movieGrid += '\n\t<div class="col-sm">\n\t\t<a class="btn" href="https://www.imdb.com/title/' + movieID + '" title="' + movieName + '\n' + rating + '/10 on IMDB">\n\t\t\t<img src="' + url + '" style="width:100%">\n\t\t</a>\n\t</div>';
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
            data = data.replace('{0}', movieGrid);

            res.send(data);
        });
    });
});
app.get('/main.js', (req, res) => {
    fs.readFile('site/main.js', (err, data) => {
        return res.send(data);
    });
});
app.get('/login.html', (req, res) => {
    fs.readFile('site/login.html', function(err, data) {
        res.type('html');
        res.write(data);
        res.end();
    });
});

app.get('/getImage', (req, res) => {
    const movieID = url.parse(req.url, true).query.movieID;
    let data = '';
    https.get('https://api.themoviedb.org/3/movie/' + movieID + '/images?api_key=' + configData.apiKey, (resp) => {
        resp.on('data', (chunk) => {
            data += chunk;
        });

        resp.on('error', (respErr) => {
            console.error(respErr);
            res.status(500).end();
        });

        resp.on('end', () => {
            let dataJson = JSON.parse(data);
            if (dataJson.posters == undefined || dataJson.posters[0] == undefined) {
                console.log(dataJson);
                url = '';
            } else {
                let imageURL = 'https://image.tmdb.org/t/p/w500' + dataJson.posters[0].file_path;

                //Update database since it doesn't have the url
                updateDatabaseURL(imageURL, movieID);
                res.redirect(302, imageURL);
            }
        });
    });
});



const {body, validationResult} = require('express-validator');

//Handle login posts
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



async function updateDatabaseURL(url, movieID) {
    let query = dbConnection.query('UPDATE movies SET imageURL = "' + url + '" WHERE movieID = "' + movieID + '";');
    query.on('error', (err) => {});
}

function getRandomInt(min, range) {
    return Math.round(Math.random() * range + min);
}