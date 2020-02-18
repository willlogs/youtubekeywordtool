const fs = require('fs');

const ResetCLR = "\x1b[0m";
const FgRed = "\x1b[31m", FgGreen = "\x1b[32m";

let data = fs.readFileSync('./savedJSON.js');
data = JSON.parse(data);

data.forEach((item) => {
    let views = 0;
    let count = 0;
    item.results.forEach((result) => {
        count++;
        if (result.statistics) {
            views += parseInt(result.statistics.viewCount);
        }
    });
    console.log(FgRed + item.q + ResetCLR + " has " + FgGreen + views + ResetCLR + " views in " + count + " videos => " + FgGreen + (views / count / 100000) + ResetCLR + " * 10^5 views for each video");
});