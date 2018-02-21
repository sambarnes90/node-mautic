var mautic = require('./mautic-api.js');
var request = require('request');

mautic.config.base_url = "https://example.mautic.com";
mautic.config.redirect_uri = "https://www.mautic.com";
mautic.config.public_key = "EXAMPLE_PUBLIC_KEY";
mautic.config.secret_key = "EXAMPLE_SECRET_KEY";
mautic.config.state = "RANDOM_STATE";
mautic.config.api_endpoint = "https://example.mautic.com/api";


var logResult = function (asset) {
	console.log(asset.contact.fields.core);
};

var testFunction = function(config){
	if (config.auth_object) {
	 	mautic.contacts.getContact(config,820004,logResult);
	}
};

mautic.auth.checkAuth(testFunction);