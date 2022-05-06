const { processFile } = require('./QueryGen');

//processFile('imdb data/ratings.tsv', 'imdb data/ratingsQuery.sql', 'ratings(movieID, rating, voteCount)', 'true');
//processFile('imdb data/moviesRaw.tsv', 'imdb data/moviesQuery.sql', 'movies(movieID, name)', "columns[1] == 'movie' && columns[4] == 0 && columns[5] >= 1970 && columns[7] >= 80 && columns[7] <= 240 && columns[8].split(',').length > 0");
//processFile('imdb data/actorsRaw.tsv', 'imdb data/actorsQuery.sql', 'actors(movieID, actorID)', 'columns[1] == 1 && columns[3] == "actor"');
//processFile('imdb data/actorNamesRaw.tsv', 'imdb data/actorNamesQuery.sql', 'actorNames(actorID, name)', 'true');
//processFile('imdb data/moviesRaw.tsv', 'imdb data/genresQuery.sql', 'genres(movieID, genres)', 'columns[8] != "\\N" && !columns[8].includes("documentary")')
//processFile('imdb data/crewRaw.tsv', 'imdb data/directorQuery.sql', 'directors(movieID, directorID)');
processFile('imdb data/namesRaw.tsv', 'imdb data/namesQuery.sql', 'allNames(nameID, name)');