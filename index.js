// Include config object
var mauticconfig = require('./mautic-config.js');
var mauticauth = require('./mautic-auth.js');
var mautic = require('./mautic-api.js');
var request = require('request');

var logResult = function (asset) {
	console.log(asset);
};

var testFunction = function(config){
	if (config.auth_object) {
	 	mautic.assets.getAsset(config,6,logResult);
	}
};

mauticauth.checkAuth(testFunction);