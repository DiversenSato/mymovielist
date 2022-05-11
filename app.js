const { createHash } = require('crypto');
//Example hash: createHash('sha256').update('message' + hashPepper).digest('hex');
const express = require('express');
const cookieParser = require('cookie-parser');
const https = require('https');
const url = require('url');
const fs = require('fs');
const path = require('path');
const mysql = require('mysql');
const crypto = require('crypto');
const {exec} = require('child_process');
const {sha256} = require('./sha256');

const configData = JSON.parse(fs.readFileSync('config.json'));

//Set DNS IP address to servers ip
let shellCommands = 'sudo iptables -t nat -A PREROUTING -p tcp --dport 80 -j REDIRECT --to-ports 8080\ncurl -s -u "' + configData.DNSAccountName + ':' + configData.DNSApiKey + '" -X POST "https://api.simply.com/2/ddns/?domain=mymovielist.dk&hostname=@"';
fs.writeFile('setIP.sh', shellCommands, (err) => {
    if (err) throw err;
    return;
    exec('sh setIP.sh', (error, stdout, stderr) => {
        if (error !== null) {
		    console.log('Couldn\'t update DNS');
            return;
	    }
        console.log('Posted IP');   
    });
});

//Connect application to database
var dbConnection;
dbConnection = mysql.createConnection(configData.dbOptions);
dbConnection.connect((err) => {
    if (err) throw err;
    console.log('Connected to database!');
});



//Start web application
var app = express();
app.listen('8080');
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser());

//Set routes
app.get('/', (req, res) => {
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

                    movieGrid += '\n\t<div class="col-sm">\n\t\t<a class="btn" href="/rate?movieID=' + movieID + '" title="' + movieName + '\n' + rating + '/10 on IMDB">\n\t\t\t<img src="' + url + '" style="width:100%">\n\t\t</a>\n\t</div>';
                } else {
                    //Index out of bounds
                    break;
                }
            }

            //End row
            movieGrid += '\n</div>';
        }

        fs.readFile('site/template.html', 'utf-8', (err, data) => {
            //Replace parts of template
            data = data.replace('{loginOptions}', getLoginOptions(req));
            data = data.replace('{body}', fs.readFileSync('site/index.html', {encoding: 'utf8'}).replace('{movieGrid}', movieGrid));
    
            //Send back result
            res.send(data);
        });
    });
});
app.get('/main.js', (req, res) => {
    fs.readFile('site/main.js', (err, data) => {
        return res.send(data);
    });
});

app.get('/signup.html', (req, res) => {
    fs.readFile('site/template.html', 'utf-8', (err, data) => {
        //Replace parts of template
        data = data.replace('{loginOptions}', getLoginOptions(req));
        data = data.replace('{body}', fs.readFileSync('site/signup.html'));

        //Send back result
        res.send(data);
    });
});

app.get('/rate.js', (req, res) => {
    res.sendFile(path.resolve('site/rate.js'));
});
app.get('/login.html', (req, res) => {
    fs.readFile('site/template.html', 'utf-8', (err, data) => {
        //Replace parts of template
        data = data.replace('{loginOptions}', getLoginOptions(req));
        data = data.replace('{body}', fs.readFileSync('site/login.html'));

        //Send back result
        res.send(data);
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
    fs.readFile('site/' + file, (err, data) => {
        if (err) {
            console.log('File not found: ' + file);
            res.status(404);
            res.end();
        } else {
            res.send(data);
        }
    });
});

app.get('/rate', (req, res) => {
    const movieID = url.parse(req.url, true).query.movieID;
    if (movieID) {
        fs.readFile('site/template.html', 'utf-8', (err, data) => {
            let movieTitle = 'Movie title not found!';
    
            dbConnection.query('SELECT * FROM movies WHERE movieID = ?', [movieID], (err, result) => {
                if (err) throw err;
                if (result.length == 0) {
                    res.redirect(302, '/');
                    return;
                }
    
                movieTitle = result[0].name;
            
                //Replace parts of template
                data = data.replace('{loginOptions}', getLoginOptions(req));
                data = data.replace('{body}', fs.readFileSync('site/rate.html', {encoding: 'utf-8'}));
                data = data.replace('{movieTitle}', movieTitle);
                data = data.replace('{movieID}', movieID);
    
                //Send back result
                res.send(data);
            });
        });
    } else {
        return res.status(404).end();
    }
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

    let sql = 'SELECT * FROM users WHERE email = ?;';
    dbConnection.query(sql, [req.body.email], (err, result, fields) => {
        if (err) throw err;
        if (result.length == 0) {
            return res.status(400).end('No account found under email: ' + req.body.email + '!');
        }
        
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

app.post('/signup',
body('email').isEmail(),
body('password').isLength({min: 5}),
body('password2').isLength({min: 5}),
(req, res) => {
    let errors = validationResult(req);
    if (!errors.isEmpty()) {
        return res.status(400).json({errors: errors.array()});
    }
    if (req.body.password != req.body.password2) {
        return res.status(400).end('Password mismatch!');
    }

    //Check if user is duplicate by seeing if the email is in the database
    dbConnection.query('SELECT * FROM users WHERE email = ?', [req.body.email], (err, result) => {
        if (err) throw err;
        if (result.length > 0) {
            return res.status(400).end('Duplicate email found!');
        }

        //If everything is ok, create user in the database and set user cookies
        let sql = 'INSERT INTO users(id, name, email, phash) VALUES(?, ?, ?, ?);';
        let parameters = [crypto.randomUUID(), req.body.username, req.body.email, generatePasswordHash(req.body.password)];
        dbConnection.query(sql, parameters, (err, result, fields) => {
            if (err) throw err;
    
            res.cookie('sessionToken', generateSessionToken(parameters[0].id));
            res.cookie('userID', parameters[0].id);
            res.redirect(302, '/');
        });
    })
});

//Log the user out if they send a logOut request
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

function getLoginOptions(req) {
    const cookies = req.cookies;

    let loginOptions = '<ul class="nav nav-pills">\n<li class="nav-item">\n<a href="login.html" class="nav-link active" aria-current="page">Log ind</a>\n</li>\n<li class="nav-item">\n<a href="signup.html" class="nav-link" aria-current="page">Opret bruger</a>\n</li>\n</ul>';
    if (cookies) {
        //Check if session cookie is in there
        const sessionToken = cookies.sessionToken;
        if (sessionToken) {
            const generatedToken = sha256(cookies.userID + getDate() + configData.sessionTokenPepper);
            if (sessionToken == generatedToken) {
                //sessionToken is valid
                loginOptions =  '<div class="dropdown">';
                loginOptions += '<button class="btn btn-primary dropdown-toggle" data-bs-toggle="dropdown"><img src="/site?file=samuel.png" style="width: 32px;"></button>';
                loginOptions += '<div class="dropdown-menu">';
                loginOptions += '<a class="dropdown-item" href="#">Profile</a>';
                loginOptions += '<a class="dropdown-item" href="/logOut">Log ud</a>';
                loginOptions += '</div>';
            }
        }
    }

    return loginOptions;
}

function generateSessionToken(userID) {
    return sha256(userID + getDate() + configData.sessionTokenPepper);
}

function generatePasswordHash(password) {
    return sha256(password + configData.hashPepper);
}