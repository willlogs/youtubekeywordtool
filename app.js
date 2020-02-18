'use strict';

const readline = require('readline');
const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout
});

var fs = require('fs');
var axios = require('axios');
var { google } = require('googleapis');
var OAuth2 = google.auth.OAuth2;

const autoCompleteAPI = "http://suggestqueries.google.com/complete/search?client=youtube&ds=yt&client=firefox&q=";

// If modifying these scopes, delete your previously saved credentials
// at ~/.credentials/youtube-nodejs-quickstart.json
var SCOPES = ['https://www.googleapis.com/auth/youtube.readonly'];
var TOKEN_DIR = (process.env.HOME || process.env.HOMEPATH ||
    process.env.USERPROFILE) + '/.credentials/';
var TOKEN_PATH = TOKEN_DIR + 'youtube-nodejs-quickstart.json';

// Load client secrets from a local file.
fs.readFile('client_secret.json', function processClientSecrets(err, content) {
    if (err) {
        console.log('Error loading client secret file: ' + err);
        return;
    }
    // Authorize a client with the loaded credentials, then call the YouTube API.
    authorize(JSON.parse(content), doTheJob);
});

/**
 * Create an OAuth2 client with the given credentials, and then execute the
 * given callback function.
 *
 * @param {Object} credentials The authorization client credentials.
 * @param {function} callback The callback to call with the authorized client.
 */
function authorize(credentials, callback) {
    var clientSecret = credentials.installed.client_secret;
    var clientId = credentials.installed.client_id;
    var redirectUrl = credentials.installed.redirect_uris[0];
    var oauth2Client = new OAuth2(clientId, clientSecret, redirectUrl);

    // Check if we have previously stored a token.
    fs.readFile(TOKEN_PATH, function (err, token) {
        if (err) {
            getNewToken(oauth2Client, callback);
        } else {
            oauth2Client.credentials = JSON.parse(token);
            rl.question("Gimme a video title: ", (answer) => {
                callback(oauth2Client, answer);
            });            
        }
    });
}

/**
 * Get and store new token after prompting for user authorization, and then
 * execute the given callback with the authorized OAuth2 client.
 *
 * @param {google.auth.OAuth2} oauth2Client The OAuth2 client to get token for.
 * @param {getEventsCallback} callback The callback to call with the authorized
 *     client.
 */
function getNewToken(oauth2Client, callback) {
    var authUrl = oauth2Client.generateAuthUrl({
        access_type: 'offline',
        scope: SCOPES
    });
    console.log('Authorize this app by visiting this url: ', authUrl);
    var rl = readline.createInterface({
        input: process.stdin,
        output: process.stdout
    });
    rl.question('Enter the code from that page here: ', function (code) {
        rl.close();
        oauth2Client.getToken(code, function (err, token) {
            if (err) {
                console.log('Error while trying to retrieve access token', err);
                return;
            }
            oauth2Client.credentials = token;
            storeToken(token);
            callback(oauth2Client);
        });
    });
}

/**
 * Store token to disk be used in later program executions.
 *
 * @param {Object} token The token to store to disk.
 */
function storeToken(token) {
    try {
        fs.mkdirSync(TOKEN_DIR);
    } catch (err) {
        if (err.code != 'EEXIST') {
            throw err;
        }
    }
    fs.writeFile(TOKEN_PATH, JSON.stringify(token), (err) => {
        if (err) throw err;
        console.log('Token stored to ' + TOKEN_PATH);
    });
}

function getStatisticsOfQuery(service, keywords, index, callBack) {
    let videoSet = [];
    let ids = [];
    let query = keywords[index];
    console.log(query);

    service.search.list(
        {
            part: 'snippet',
            q: query,
            maxResults: 50
        },
        (err, data) => {
            if (err) {
                console.log(err);
            }
            else {
                let data_ = data.data;

                let i = 0, j = -1;
                data_.items.forEach((item) => {
                    videoSet.push(item.snippet);
                    if (i++ % 25 == 0) {
                        j++;
                        ids.push("");
                    }
                    ids[j] += item.id.videoId + ',';
                });

                j = 0;
                i = 0;
                ids.forEach((id) => {
                    service.videos.list({
                        part: "statistics",
                        id: id
                    }, (err, d) => {
                        if (err) {
                            console.log(err);
                        }
                        else {
                            d.data.items.forEach((item) => {
                                videoSet[j++].statistics = item.statistics;
                            });
                            i++;
                            if (i == 2) callBack(videoSet, index, keywords);
                        }
                    });
                });
            }
        }
    );
}

/**
 * Lists the names and IDs of up to 10 files.
 *
 * @param {google.auth.OAuth2} auth An authorized OAuth2 client.
 */
function doTheJob(auth, query) {
    var service = google.youtube({
        version: 'v3',
        auth: "%Copy your token here%"
    });

    // code here!
    let numberOfSuggestions;
    let vsdata = [];
    let cb = (vs, index, keywords) => {
        console.log(index);
        vsdata.push({ q: keywords[index], results: [...vs] })
        if (++index < keywords.length) {
            getStatisticsOfQuery(service, keywords, index, cb);
        }
        else {
            fs.writeFileSync('savedJSON.js', JSON.stringify(vsdata));
        }
    }

    axios.get(autoCompleteAPI + query)
        .then((response) => {
            response.data[1].unshift(query);
            numberOfSuggestions = response.data[1].length;
            getStatisticsOfQuery(service, response.data[1], 0, cb);
        })
        .catch((err) => {
            console.log(err);
        });    
}

function postProcessInformation(videoSet, suggestions) {
    console.log(videoSet);
    console.log("you could also search for: " + suggestions.map(item => item));
}