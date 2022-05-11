const { createHash } = require('crypto');
//Example hash: createHash('sha256').update('message' + hashPepper).digest('hex');
const express = require('express');
const cookieParser = require('cookie-parser');
const https = require('https');
const url = require('url');
const fs = require('fs');
const path = require('path');
const mysql = require('mysql');
const {exec} = require('child_process');
const {sha256} = require('./sha256');

const configData = JSON.parse(fs.readFileSync('config.json'));

//Set DNS IP address to servers ip
let shellCommands = 'sudo iptables -t nat -A PREROUTING -p tcp --dport 80 -j REDIRECT --to-ports 8080\ncurl -s -u "' + configData.DNSAccountName + ':' + configData.DNSApiKey + '" -X POST "https://api.simply.com/2/ddns/?domain=mymovielist.dk&hostname=@"';
fs.writeFile('setIP.sh', shellCommands, (err) => {
    if (err) throw err;
    console.log('Created file with contents: ' + shellCommands);
    return;
    exec('sh setIP.sh', (error, stdout, stderr) => {
        if (error !== null) {
		    console.log('Couldn\'t update DNS');
	    }
        console.log('Posted IP');   
    });
});

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

    let loginButtons = '<ul class="nav nav-pills">\n<li class="nav-item">\n<a href="login.html" class="nav-link active" aria-current="page">Log ind</a>\n</li>\n<li class="nav-item">\n<a href="login.html" class="nav-link" aria-current="page">Opret bruger</a>\n</li>\n</ul>'
    if (cookies) {
        //Check if session cookie is in there
        const sessionToken = cookies.sessionToken;
        if (sessionToken) {
            const generatedToken = sha256(cookies.userID + getDate() + configData.sessionTokenPepper);
            if (sessionToken == generatedToken) {
                //sessionToken is valid
                loginButtons =  '<div class="dropdown">';
                loginButtons += '<button class="btn btn-primary dropdown-toggle" data-bs-toggle="dropdown"><img src="/site?file=samuel.png" style="width: 32px;"></button>';
                loginButtons += '<div class="dropdown-menu">';
                loginButtons += '<a class="dropdown-item" href="#">Profile</a>';
                loginButtons += '<a class="dropdown-item" href="/logOut">Log ud</a>';
                loginButtons += '</div>';
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

                    movieGrid += '\n\t<div class="col-sm">\n\t\t<a class="btn" href="/title?movieID=' + movieID + '" title="' + movieName + '\n' + rating + '/10 on IMDB">\n\t\t\t<img src="' + url + '" style="width:100%">\n\t\t</a>\n\t</div>';
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
app.get('/rate.js', (req, res) => {
    fs.readFile('site/rate.js', (err, data) => {
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
                res.sendFile(path.resolve('site/imageNotFound.png'));
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

app.get('/site', (req, res) => {
    const file = url.parse(req.url, true).query.file;
    const options = {
        root: path.resolve('site/')
    }
    res.sendFile(file, options, (err) => {
        if (err) throw err;
    });
});

app.get('/title', (req, res) => {
    const movieID = url.parse(req.url, true).query.movieID;
    fs.readFile('site/rate.html', 'utf-8', (err, data) => {
        let movieTitle = 'Movie title not found!';

        if (movieID) {
            dbConnection.query('SELECT * FROM movies WHERE movieID = ?', [movieID], (err, result) => {
                movieTitle = result[0].name;
                data = data.replace('{0}', movieTitle);
                res.send(data);
            });
        } else {
            data = data.replace('{0}', movieTitle);
            res.send(data);
        }
    });
});



const {body, validationResult} = require('express-validator');
const { request } = require('http');

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

app.get('/logOut', (req, res) => {
    res.clearCookie('sessionToken');
    res.clearCookie('userID');
    res.redirect(302, '/');
});



async function updateDatabaseURL(url, movieID) {
    let query = dbConnection.query('UPDATE movies SET imageURL = "' + url + '" WHERE movieID = "' + movieID + '";');
    query.on('error', (err) => {});
}

function getRandomInt(min, range) {
    return Math.round(Math.pow(Math.random(), 8) * range + min);
}

function getDate() {
    const date = new Date();
    return '' + date.getFullYear() + '_' + (date.getMonth()+1) + '_' + date.getDate();
}