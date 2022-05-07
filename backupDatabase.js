const fs = require('fs');
const mysql = require('mysql');

const configData = JSON.parse(fs.readFileSync('config.json'));
const outputFileName = 'databaseBackups/databaseBackup ' + getFormattedDate() + '.tsv';

var dbConnection;
dbConnection = mysql.createConnection(configData.dbOptions);
dbConnection.connect((err) => {
    if (err) throw err;

    dbConnection.query('SELECT * FROM movies;', (err, result, fields) => {
        if (err) throw err;

        //Write header
        fs.appendFileSync(outputFileName, 'movieID\tname\trating\tvoteCount\tmainActorName\tdirectorName\tgenres\timageURL\n', (err) => {
            if (err) throw err;
        });

        //Write data
        for (let i = 0; i < result.length; i++) { //Loop through every row
            const r = result[i];
            let row = r.movieID + '\t' + r.name + '\t' + r.rating + '\t' + r.voteCount + '\t';
            row += r.mainActorName + '\t' + r.directorName + '\t' + r.genres + '\t' + r.imageURL + '\n';

            fs.appendFileSync(outputFileName, row, (err) => {
                if (err) throw err;
            });
        }

        dbConnection.end();
    });
});

function getFormattedDate() {
    const date = new Date();
    return date.getFullYear() + '.' + date.getMonth() + '.' + date.getDate() + ' ' + date.getHours() + '_' + date.getMinutes() + '_' + date.getSeconds();
}