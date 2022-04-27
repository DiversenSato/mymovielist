exports.processFile = async function(inputName, outputName, sqlBit, condition) {
    const fs = require('fs');
    const events = require('events');
    const readline = require('readline');

    var lineCount = 0;

    const wS = fs.createWriteStream(outputName, {
        encoding: 'utf-8'
    })

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
                
                let newLine = '("' + columns[0] + '","' + columns[8] + '")';

                if (eval(condition)) {
                    valuesArray.push(newLine);
                }
            }

            lineCount++;
        });

        await events.once(rl, 'close');
        console.log('Processed ' + lineCount + ' lines');
        console.log(valuesArray.length + ' resulting rows');
        rl.close();
        
        wS.write('INSERT INTO ' + sqlBit + ' VALUES ' + valuesArray[0]);
        for (let i = 1; i < valuesArray.length; i++) {
            if (i % 500 == 0) {
                //Create new line in .sql
                if (i != 1) {
                    wS.write(';\n');
                }
                wS.write('INSERT INTO ' + sqlBit + ' VALUES ' + valuesArray[i]);
            } else {
                //Append values
                wS.write(',' + valuesArray[i]);
            }
        }
        wS.write(';');

        return 1; //1 is success
    } catch (err) {
        throw err;
        return 0;
    }
}