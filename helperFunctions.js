const { createHash } = require('crypto');

const sha256 = function(input) {
    return createHash('sha256').update(input).digest('hex');
}

const getDate = function() {
    const date = new Date();
    return '' + date.getFullYear() + '_' + (date.getMonth()+1) + '_' + date.getDate();
}

const generatePasswordHash = function(password, hashPepper) {
    return sha256(password + hashPepper);
}

const generateSessionToken = function(userID, sessionTokenPepper) {
    return sha256(userID + getDate() + sessionTokenPepper);
}

const updateDatabaseURL = async function(url, movieID, dbConnection) {
    let query = dbConnection.query('UPDATE movies SET imageURL = ? WHERE movieID = ?;', [url, movieID]);
    query.on('error', (err) => {});
}

const getRandomInt = function(min, range) {
    return Math.round(Math.pow(Math.random(), 3) * range + min);
}

const getLoginOptions = function(sessionToken, userID, configData) {
    let loginOptions = '<ul class="nav nav-pills">\n<li class="nav-item">\n<a href="login.html" class="nav-link active" aria-current="page">Log ind</a>\n</li>\n<li class="nav-item">\n<a href="signup.html" class="nav-link" aria-current="page">Opret bruger</a>\n</li>\n</ul>';

    if (sessionToken) {
        const generatedToken = generateSessionToken(userID, configData.sessionTokenPepper);
        if (sessionToken == generatedToken) {
            //sessionToken is valid
            loginOptions =  '<div class="dropdown">';
            loginOptions += '<button class="btn btn-primary dropdown-toggle" data-bs-toggle="dropdown"><img src="/site?file=images/samuel.png" style="width: 32px;"></button>';
            loginOptions += '<div class="dropdown-menu">';
            loginOptions += '<a class="dropdown-item" href="#">Profile</a>';
            loginOptions += '<a class="dropdown-item" href="/logOut">Log ud</a>';
            loginOptions += '</div>';
        }
    }

    return loginOptions;
}



//Export functions
module.exports = {
    sha256,
    getDate,
    generatePasswordHash,
    generateSessionToken,
    updateDatabaseURL,
    getRandomInt,
    getLoginOptions
};