const { createHash } = require('crypto');
//Example hash: createHash('sha256').update('message' + hashPepper).digest('hex');
const express = require('express');
const cookieParser = require('cookie-parser');
const https = require('https');
const url = require('url');
const fs = require('fs');
const mysql = require('mysql');
const {sha256} = require('./sha256');

const configData = JSON.parse(fs.readFileSync('config.json'));

//Connect application to database
var dbConnection;
dbConnection = mysql.createConnection(configData.dbOptions);
dbConnection.connect((err) => {
    if (err) throw err;
});



//Start web application
var app = express();
app.listen('8080', () => { 
});
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser());

//Set routes
app.get('/', (req, res) => {
    //Validate user sessionToken
    const cookies = req.cookies;
    console.log(cookies);

    let loginButtons = '<ul class="nav nav-pills">\n<li class="nav-item">\n<a href="login.html" class="nav-link active" aria-current="page">Log ind</a>\n</li>\n<li class="nav-item">\n<a href="login.html" class="nav-link" aria-current="page">Opret bruger</a>\n</li>\n</ul>'
    if (cookies) {
        //Check if session cookie is in there
        const sessionToken = cookies.sessionToken;
        if (sessionToken) {
            const generatedToken = sha256(cookies.userID + getDate() + configData.sessionTokenPepper);
            if (sessionToken == generatedToken) {
                //sessionToken is valid
                loginButtons = '<div class="flex-shrink-0 dropdown">\n<a href="#" class="d-block line-dark text-decoration-none dropdown-toggle" id="userDropdown" data-bs-toggle="dropdown" aria-expanded="false">\n<img src="imageNotFound.png" width="32" height="32" class="rounded-circle">\n::after\n</a>\n<ul class="dropdown-menu text-small shadow show" aria-labelledby="userDropdown" style="position: absolute; inset: 0px 0px auto auto; margin: 0px; transform: translate(0px, 34px);" data-popper-placement="bottom-end">\n<li>\n<a class="dropdown-item" href="#">Profile</a>\n</li>\n</ul>\n</div>';
            }
        }
    }

    //Generate grid of movies as html using bootstrap of course
    let movieGrid = '';
    //Get random set of 48 movies
    dbConnection.query('SELECT * FROM movies ORDER BY voteCount DESC LIMIT ' + getRandomInt(0, 130)*48 + ', 48;', async (err, result, fields) => {
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

                    movieGrid += '\n\t<div class="col-sm">\n\t\t<a class="btn" href="/title/' + movieID + '" title="' + movieName + '\n' + rating + '/10 on IMDB">\n\t\t\t<img src="' + url + '" style="width:100%">\n\t\t</a>\n\t</div>';
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
            data = data.replace('{1}', loginButtons);

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
                //API where poster urls might not have the url
                //In which case just delete the movie from db
                dbConnection.query('DELETE FROM movies WHERE movieID = ?;', [movieID], (err, result) => {});

                //However the browser or whoever is still expecting an image
                res.status(404);
                res.sendFile('C:\\Users\\diver\\Documents\\GitHub\\mymovielist\\site\\imageNotFound.png');
                res.end();
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
            res.cookie('sessionToken', sha256(result[0].id + getDate() + configData.sessionTokenPepper));
            res.cookie('userID', result[0].id);
            res.redirect(302, '/');
        } else {
            res.send("Password mismatch!");
            res.end();
        }
    });
});



async function updateDatabaseURL(url, movieID) {
    let query = dbConnection.query('UPDATE movies SET imageURL = "' + url + '" WHERE movieID = "' + movieID + '";');
    query.on('error', (err) => {});
}

function getRandomInt(min, range) {
    return Math.round(Math.pow(Math.random(), 1) * range + min);
}

function getDate() {
    const date = new Date();
    return '' + date.getFullYear() + '_' + (date.getMonth()+1) + '_' + date.getDate();
}