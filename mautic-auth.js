// auth.js
// Used for getting authentication tokens from the Mautic API
var exports = module.exports = {};
var request = require('request');
var config = require('./mautic-config.js');
var readline = require('readline');
var fs = require('fs');

// Check whether authorisation is already in place
exports.checkAuth = function(callback) {
    var jsonAuthFile = fs.readFile("token.json", "utf8", function(err, data) {
        if (err) {
            exports.generateAuthUrl(callback);
        } else {
            var auth = JSON.parse(data);
            config.auth_object = auth;
            exports.testCall(callback);
        }
    });
};

exports.generateAuthUrl = function(callback) {
    var authUrl = config.base_url + "/oauth/v2/authorize?client_id=" + config.public_key + "&grant_type=authorization_code&redirect_uri=" + config.redirect_uri + "&response_type=code&state=" + config.state;
    console.log("You've not yet authorised this app - please access the link below to generate two tokens in the URL it redirects to, State - to ensure that the request hasn't been tampered with, and 'code', which you'll need to copy and paste into this window to continue.");
    console.log(authUrl);
    var cliinput = readline.createInterface({
        input: process.stdin,
        output: process.stdout
    });
    cliinput.question("Please paste the code into this prompt and press enter to continue", function(code) {
        console.log("Token Accepted");
        config.code = code;
        exports.getAccessToken(code,callback);
    })
};

exports.getAccessToken = function(code,callback) {
    var postBody = {
        code: config.code,
        client_id: config.public_key,
        client_secret: config.secret_key,
        grant_type: "authorization_code",
        redirect_uri: config.redirect_uri,
    }
    var tokenUrl = encodeURI(config.base_url + "/oauth/v2/token?client_id=" + config.public_key + "&client_secret=" + config.secret_key + "&grant_type=authorization_code&redirect_uri=" + config.redirect_uri + "&code=" + config.code);
    request.post({
        headers: { 'content-type': 'application/x-www-form-urlencoded' },
        url: tokenUrl,
        form: postBody
    }, function(err, httpResponse, body) {
        if (err) {
            callback(err);
        } else {
            var resObject = JSON.parse(body);
            if (resObject.errors) {
                callback(resObject.errors);
            } else {
                var responseObject = JSON.parse(body);
                config.auth_object = responseObject;
                var jsonObject = JSON.stringify(config.auth_object);
                fs.writeFile('token.json', jsonObject, 'utf-8', function() {
                    exports.checkAuth(callback);
                });
            }
        }
    })
}

exports.refreshToken = function(callback) {
    var postBody = {
        refresh_token: config.auth_object.refresh_token,
        client_id: config.public_key,
        client_secret: config.secret_key,
        grant_type: "refresh_token",
        redirect_uri: config.redirect_uri,
    }
    var tokenUrl = encodeURI(config.base_url + "/oauth/v2/token?refresh_token=" + config.auth_object.refresh_token + "&client_id=" + config.public_key + "&client_secret=" + config.secret_key + "&grant_type=refresh_token&redirect_uri=" + config.redirect_uri);
    request.post({
        headers: { 'content-type': 'application/x-www-form-urlencoded' },
        url: tokenUrl,
        form: postBody
    }, function(err, httpResponse, body) {
        if (err) {
            callback(err);
        } else {
            var responseObject = JSON.parse(body);
            if (responseObject.errors) {
                callback(responseObject.errors);
            } else {
                config.auth_object = responseObject;
                var jsonObject = JSON.stringify(config.auth_object);
                fs.writeFile('token.json', jsonObject, 'utf-8', function() {
                    exports.checkAuth(callback);
                });
            }
        }
    })
}

exports.testCall = function(callback) {
    var testPostBody = {
        access_token: config.auth_object.access_token,
        json: true
    };
    request.get({
        url: config.api_endpoint + '/campaigns?access_token=' + config.auth_object.access_token
    }, function(err, httpResponse, body) {
        if (err) {
        	exports.refreshToken(callback);
        } else {
            var objectBody = JSON.parse(body);
            if (objectBody.errors) {
                if (objectBody.errors[0].message == "The access token provided has expired." || objectBody.errors[0].message == "The access token provided is invalid.") {
                    exports.refreshToken(callback);
                }
            } else {
                callback(config);
            }
        }
    })
}