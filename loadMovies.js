//Purpose of this script is to load movies from movies.tsv into database

const fs = require('fs');
const csv = require('csvtojson');
const mysql = require('mysql');

const configData = JSON.parse(fs.readFileSync('config.json'));

var dbConnection;
dbConnection = mysql.createConnection(configData.dbOptions);
dbConnection.connect(async (err) => {
    if (err) throw err;

    console.log("Connected to database!");

    //Convert movies.tsv to json
    //const moviesJSON = await csv({delimiter: '\t'}).fromFile('imdb data/movies.tsv');
    const movieRatingsJSON = await csv({delimiter: '\t'}).fromFile('imdb data/ratings.tsv')
    console.log('Movies and ratings loaded!');
    
    for (let i = 10001; i <= 100000; i++) {
        dbConnection.query('INSERT INTO ratings (tID, rating, count) VALUES ("' + movieRatingsJSON[i].tconst + '", "' + movieRatingsJSON[i].averageRating + '", "' + movieRatingsJSON[i].numVotes + '");', (err, result) => {
            console.log(i);
            if (i == 99999) {
                dbConnection.end();
            }
        });
    }
});