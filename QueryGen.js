exports.processFile = async function(inputName, outputName, sqlBit, condition) {
    const fs = require('fs');
    const events = require('events');
    const readline = require('readline');

    var lineCount = 0;

    try {
        const rl = readline.createInterface({
            input: fs.createReadStream(inputName),
            crlfDelay: Infinity
        });

        const valuesArray = [];

        rl.on('line', (line) => {
            if (lineCount < 10) {
                console.log(line);
            }
            if (lineCount != 0) {
                const columns = line.split('\t');
                
                let newLine = '("' + columns[0] + '","' + columns[1] + '")';

                if (columns[1] != '\\N') {
                    valuesArray.push(newLine);
                }
            }

            lineCount++;
        });

        await events.once(rl, 'close');
        console.log('Processed ' + lineCount + ' lines');
        console.log(valuesArray.length + ' resulting rows');
        rl.close();
        
        fs.appendFileSync(outputName, 'INSERT INTO ' + sqlBit + ' VALUES ' + valuesArray.shift());
        let counter = 0;
        while (valuesArray.length > 0) {
            const element = valuesArray.shift();
            if (counter % 500 == 0) {
                //Create new line in .sql
                if (counter != 1) {
                    fs.appendFileSync(outputName, ';\n');
                }
                fs.appendFileSync(outputName, 'INSERT INTO ' + sqlBit + ' VALUES ' + element);
            } else {
                //Append values
                fs.appendFileSync(outputName, ',' + element);
            }
            if (counter % 2000 == 0) {
                console.log(valuesArray.length);
            }

            counter++;
        }
        fs.appendFileSync(outputName, ';');

        return 1; //1 is success
    } catch (err) {
        throw err;
        return 0;
    }
}