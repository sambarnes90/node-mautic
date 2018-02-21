'use strict'

var exports = module.exports = {};
var request = require('request');
var fs = require('fs');
var readline = require('readline');

exports.config = {
	base_url: "https://example.mautic.com",
	redirect_uri:"https://example.mautic.com/redirecthere",
	public_key: "EXAMPLE_PUBLIC_KEY",
	secret_key: "EXAMPLE_SECRET_KEY",
	state: "RANDOMSTATE",
	code: "",
	api_endpoint: "https://example.mautic.com/api"
};

exports.auth = {
	checkAuth: function(callback) {
	    var jsonAuthFile = fs.readFile("token.json", "utf8", function(err, data) {
	        if (err) {
	            exports.auth.generateAuthUrl(callback);
	        } else {
	            var auth = JSON.parse(data);
	            exports.config.auth_object = auth;
	            exports.auth.testCall(callback);
	        }
	    })
	},
	generateAuthUrl: function(callback) {
	    var authUrl = exports.config.base_url + "/oauth/v2/authorize?client_id=" + exports.config.public_key + "&grant_type=authorization_code&redirect_uri=" + exports.config.redirect_uri + "&response_type=code&state=" + exports.config.state;
	    console.log("You've not yet authorised this app - please access the link below to generate two tokens in the URL it redirects to, State - to ensure that the request hasn't been tampered with, and 'code', which you'll need to copy and paste into this window to continue.");
	    console.log(authUrl);
	    var cliinput = readline.createInterface({
	        input: process.stdin,
	        output: process.stdout
	    });
	    cliinput.question("Please paste the code into this prompt and press enter to continue", function(code) {
	        console.log("Token Accepted");
	        exports.config.code = code;
	        exports.auth.getAccessToken(code,callback);
	    })
	},
	getAccessToken: function(code,callback) {
	    var postBody = {
	        code: exports.config.code,
	        client_id: exports.config.public_key,
	        client_secret: exports.config.secret_key,
	        grant_type: "authorization_code",
	        redirect_uri: exports.config.redirect_uri,
	    }
	    var tokenUrl = encodeURI(exports.config.base_url + "/oauth/v2/token?client_id=" + exports.config.public_key + "&client_secret=" + exports.config.secret_key + "&grant_type=authorization_code&redirect_uri=" + exports.config.redirect_uri + "&code=" + exports.config.code);
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
	                exports.config.auth_object = responseObject;
	                var jsonObject = JSON.stringify(exports.config.auth_object);
	                fs.writeFile('token.json', jsonObject, 'utf-8', function() {
	                    exports.auth.checkAuth(callback);
	                });
	            }
	        }
	    })
	},
	refreshToken: function(callback) {
	    var postBody = {
	        refresh_token: exports.config.auth_object.refresh_token,
	        client_id: exports.config.public_key,
	        client_secret: exports.config.secret_key,
	        grant_type: "refresh_token",
	        redirect_uri: exports.config.redirect_uri,
	    }
	    var tokenUrl = encodeURI(exports.config.base_url + "/oauth/v2/token?refresh_token=" + exports.config.auth_object.refresh_token + "&client_id=" + exports.config.public_key + "&client_secret=" + exports.config.secret_key + "&grant_type=refresh_token&redirect_uri=" + exports.config.redirect_uri);
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
	                exports.config.auth_object = responseObject;
	                var jsonObject = JSON.stringify(exports.config.auth_object);
	                fs.writeFile('token.json', jsonObject, 'utf-8', function() {
	                    exports.auth.checkAuth(callback);
	                });
	            }
	        }
	    })
	},
	testCall: function(callback) {
	    var testPostBody = {
	        access_token: exports.config.auth_object.access_token,
	        json: true
	    };
	    request.get({
	        url: exports.config.api_endpoint + '/campaigns?access_token=' + exports.config.auth_object.access_token
	    }, function(err, httpResponse, body) {
	        if (err) {
	        	exports.auth.refreshToken(callback);
	        } else {
	            var objectBody = JSON.parse(body);
	            if (objectBody.errors) {
	                if (objectBody.errors[0].message == "The access token provided has expired." || objectBody.errors[0].message == "The access token provided is invalid.") {
	                    exports.auth.refreshToken(callback);
	                }
	            } else {
	                callback(exports.config);
	            }
	        }
	    })
	}
};


exports.assets = {
	getAsset: function(config,assetId,callback){
		request.get({
			url: config.api_endpoint + "/assets/" + assetId + "?access_token=" + config.auth_object.access_token,
		},function(err,res){
			if (err) {
				callback(err);
			} else {
				if (res.body.errors) {
					callback(res.body);
				} else {
					var asset = JSON.parse(res.body);	
					callback(asset);
				}
			}
		})
	},
	listAssets: function(config,queryParameters,callback){
		var url = config.api_endpoint + "/assets";
		if (queryParameters) {
			url = url + "?";
			Object.keys(queryParameters).forEach(function(key){
				url = url + key + "=" + queryParameters[key] + "&";
			});
			url = url + "access_token=" + config.auth_object.access_token;
		} else {
			url = url + "?access_token=" + config.auth_object.access_token;
		}
		request.get({
			url: url,
		},function(err,res){
			if (err) {
				callback(err);
			} else {
				if (res.body.errors) {
					callback(res.body);
				} else {
					var asset = JSON.parse(res.body);	
					callback(asset);
				}
			}
		})
	},
};

exports.campaigns = {
	getCampaign: function(config,campaignId,callback){
		request.get({
			url: config.api_endpoint + "/campaigns/" + campaignId + "?access_token=" + config.auth_object.access_token,
		},function(err,res){
			if (err) {
				callback(err);
			} else {
				if (res.body.errors) {
					callback(res.body);
				} else {
					var asset = JSON.parse(res.body);	
					callback(asset);
				}
			}
		})
	},
	listCampaigns: function(config,queryParameters,callback){
		var url = config.api_endpoint + "/campaigns";
		if (queryParameters) {
			url = url + "?";
			Object.keys(queryParameters).forEach(function(key){
				url = url + key + "=" + queryParameters[key] + "&";
			});
			url = url + "access_token=" + config.auth_object.access_token;
		} else {
			url = url + "?access_token=" + config.auth_object.access_token;
		}
		request.get({
			url: url,
		},function(err,res){
			if (err) {
				callback(err);
			} else {
				if (res.body.errors) {
					callback(res.body);
				} else {
					var asset = JSON.parse(res.body);	
					callback(asset);
				}
			}
		})
	},
	listCampaignContacts: function(config,campaignId,callback){
		var url = config.api_endpoint + "/campaigns/" + campaignId + "/contacts?access_token=" + config.auth_object.access_token;
		request.get({
			url: url,
		},function(err,res){
			if (err) {
				callback(err);
			} else {
				if (res.body.errors) {
					callback(res.body);
				} else {
					var asset = JSON.parse(res.body);	
					callback(asset);
				}
			}
		})
	},
	addContactToCampaign: function(config,campaignId,contactId,callback){
		var url = config.api_endpoint + "/campaigns/" + campaignId + "/contact/" + contactId + "/add?access_token=" + config.auth_object.access_token;
		request.post({
			url: url,
		},function(err,res){
			if (err) {
				callback(err);
			} else {
				if (res.body.errors) {
					callback(res.body);
				} else {
					var asset = JSON.parse(res.body);	
					callback(asset);
				}
			}
		})
	},
	removeContactFromCampaign: function(config,campaignId,contactId,callback){
		var url = config.api_endpoint + "/campaigns/" + campaignId + "/contact/" + contactId + "/remove?access_token=" + config.auth_object.access_token;
		request.post({
			url: url,
		},function(err,res){
			if (err) {
				callback(err);
			} else {
				if (res.body.errors) {
					callback(res.body);
				} else {
					var asset = JSON.parse(res.body);	
					callback(asset);
				}
			}
		})
	}
};

exports.categories = {
	getCategory: function(config,categoryId,callback){
		var url = config.api_endpoint + "/categories/" + categoryId + "?access_token=" + config.auth_object.access_token;
		request.get({
			url:url
		},function(err,res){
			if (err) {
				callback(err);
			} else {
				var asset = JSON.parse(res.body);	
				callback(asset);
			}
		})
	},
	listContactCategories: function(config,callback){
		var url = config.api_endpoint + "/categories?access_token=" + config.auth_object.access_token;
		request.get({
			url:url
		},function(err,res){
			if (err) {
				callback(err);
			} else {
				var asset = JSON.parse(res.body);	
				callback(asset);
			}
		})
	},
	createCategory: function(config,queryParameters,callback){
		var url = config.api_endpoint + "/categories/new?access_token=" + config.auth_object.access_token;
		queryParameters = JSON.stringify(queryParameters);
		request.post({
			url:url,
			body:queryParameters
		},function(err,res){
			if (err) {
				callback(err);
			} else {
				var asset = JSON.parse(res.body);	
				callback(asset);
			}
		})
	},
	editCategory: function(config,method,queryParameters,categoryId,callback){
		var url = config.api_endpoint + "/categories/" + categoryId + "/edit?access_token=" + config.auth_object.access_token;
		queryParameters = JSON.stringify(queryParameters);
		if (method == "PATCH") {
			request.patch({
				url:url,
				body:queryParameters
			},function(err,res){
				if (err) {
					callback(err);
				} else {
					var asset = JSON.parse(res.body);	
					callback(asset);
				}
			})
		}
		if (method == "PUT") {
			request.put({
				url:url,
				body:queryParameters
			},function(err,res){
				if (err) {
					callback(err);
				} else {
					var asset = JSON.parse(res.body);	
					callback(asset);
				}
			})
		}
		if (method !== "PUT" && method !== "PATCH") {
			console.log("Invalid Method");
		}
	},
	deleteCategory: function(config,categoryId,callback){
		var url = config.api_endpoint + "/categories/" + categoryId + "/delete?access_token=" + config.auth_object.access_token;
		request.delete({
			url:url
		},function(err,res){
			if (err) {
				callback(err);
			} else {
				var asset = JSON.parse(res.body);	
				callback(asset);
			}
		})
	}
};

exports.companies = {
	getCompany: function(config,companyId,callback){
		var url = config.api_endpoint + "/companies/" + companyId + "?access_token=" + config.auth_object.access_token;
		request.get({
			url:url
		},function(err,res){
			if (err) {
				callback(err);
			} else {
				var asset = JSON.parse(res.body);	
				callback(asset);
			}
		})
	},
	listContactCompanies: function(config,callback){
		var url = config.api_endpoint + "/companies?access_token=" + config.auth_object.access_token;
		request.get({
			url:url
		},function(err,res){
			if (err) {
				callback(err);
			} else {
				var asset = JSON.parse(res.body);	
				callback(asset);
			}
		})
	},
	createCompany: function(config,queryParameters,callback){
		var url = config.api_endpoint + "/companies/new?access_token=" + config.auth_object.access_token;
		queryParameters = JSON.stringify(queryParameters);
		request.post({
			url:url,
			body:queryParameters
		},function(err,res){
			if (err) {
				callback(err);
			} else {
				var asset = JSON.parse(res.body);	
				callback(asset);
			}
		})
	},
	editCompany: function(config,method,queryParameters,companyId,callback){
		var url = config.api_endpoint + "/companies/" + companyId + "/edit?access_token=" + config.auth_object.access_token;
		queryParameters = JSON.stringify(queryParameters);
		if (method == "PATCH") {
			request.patch({
				url:url,
				body:queryParameters
			},function(err,res){
				if (err) {
					callback(err);
				} else {
					var asset = JSON.parse(res.body);	
					callback(asset);
				}
			})
		}
		if (method == "PUT") {
			request.put({
				url:url,
				body:queryParameters
			},function(err,res){
				if (err) {
					callback(err);
				} else {
					var asset = JSON.parse(res.body);	
					callback(asset);
				}
			})
		}
		if (method !== "PUT" && method !== "PATCH") {
			console.log("Invalid Method");
		}
	},
	deleteCompany: function(config,companyId,callback){
		var url = config.api_endpoint + "/companies/" + companyId + "/delete?access_token=" + config.auth_object.access_token;
		request.delete({
			url:url
		},function(err,res){
			if (err) {
				callback(err);
			} else {
				var asset = JSON.parse(res.body);	
				callback(asset);
			}
		})
	},
	addContactToCompany: function(config,companyId,contactId,callback){
		var url = config.api_endpoint + "/companies/" + companyId + "/contact/" + contactId + "/add?access_token=" + config.auth_object.access_token;
		request.post({
			url: url,
		},function(err,res){
			if (err) {
				callback(err);
			} else {
				if (res.body.errors) {
					callback(res.body);
				} else {
					var asset = JSON.parse(res.body);	
					callback(asset);
				}
			}
		})
	},
	removeContactFromCompany: function(config,companyId,contactId,callback){
		var url = config.api_endpoint + "/companies/" + companyId + "/contact/" + contactId + "/remove?access_token=" + config.auth_object.access_token;
		request.post({
			url: url,
		},function(err,res){
			if (err) {
				callback(err);
			} else {
				if (res.body.errors) {
					callback(res.body);
				} else {
					var asset = JSON.parse(res.body);	
					callback(asset);
				}
			}
		})
	}
};

exports.contacts = {
	getContact: function(config,contactId,callback){
		var url = config.api_endpoint + "/contacts/" + contactId + "?access_token=" + config.auth_object.access_token;
		request.get({
			url:url
		},function(err,res){
			if (err) {
				callback(err);
			} else {
				var asset = JSON.parse(res.body);	
				callback(asset);
			}
		})
	},
	listContacts: function(config,queryParameters,callback){
		var url = config.api_endpoint + "/contacts";
		if (queryParameters) {
			url = url + "?";
			Object.keys(queryParameters).forEach(function(key){
				url = url + key + "=" + queryParameters[key] + "&";
			});
			url = url + "access_token=" + config.auth_object.access_token;
		} else {
			url = url + "?access_token=" + config.auth_object.access_token;
		}
		request.get({
			url:url
		},function(err,res){
			if (err) {
				callback(err);
			} else {
				var asset = JSON.parse(res.body);	
				callback(asset);
			}
		})
	},
	createContact: function(config,queryParameters,callback){
		var url = config.api_endpoint + "/contacts/new?access_token=" + config.auth_object.access_token;
		queryParameters = JSON.stringify(queryParameters);
		request.post({
			url:url,
			body:queryParameters
		},function(err,res){
			if (err) {
				callback(err);
			} else {
				var asset = JSON.parse(res.body);	
				callback(asset);
			}
		})
	},
	editContact: function(config,method,queryParameters,contactId,callback){
		var url = config.api_endpoint + "/contacts/" + contactId + "/edit?access_token=" + config.auth_object.access_token;
		queryParameters = JSON.stringify(queryParameters);
		if (method == "PATCH") {
			request.patch({
				url:url,
				body:queryParameters
			},function(err,res){
				if (err) {
					callback(err);
				} else {
					var asset = JSON.parse(res.body);	
					callback(asset);
				}
			})
		}
		if (method == "PUT") {
			request.put({
				url:url,
				body:queryParameters
			},function(err,res){
				if (err) {
					callback(err);
				} else {
					var asset = JSON.parse(res.body);	
					callback(asset);
				}
			})
		}
		if (method !== "PUT" && method !== "PATCH") {
			console.log("Invalid Method");
		}
	},
	deleteContact: function(config,contactId,callback){
		var url = config.api_endpoint + "/contacts/" + contactId + "/delete?access_token=" + config.auth_object.access_token;
		request.delete({
			url:url
		},function(err,res){
			if (err) {
				callback(err);
			} else {
				var asset = JSON.parse(res.body);	
				callback(asset);
			}
		})
	},
	addPoints: function(config, contactId, queryParameters, points, callback) {
	    var url = config.api_endpoint + "/contacts/" + contactId + "/points/plus/" + points + "?access_token=" + config.auth_object.access_token;
	    if (queryParameters) {
	        queryParameters = JSON.stringify(queryParameters);
	    }
	    request.post({
	        url: url,
	        body: queryParameters
	    }, function(err, res) {
	        if (err) {
	            callback(err);
	        } else {
	            var asset = JSON.parse(res.body);
	            callback(asset);
	        }
	    })
	},
	subtractPoints: function(config, contactId, queryParameters, points, callback) {
	    var url = config.api_endpoint + "/contacts/" + contactId + "/points/minus/" + points + "?access_token=" + config.auth_object.access_token;
	    if (queryParameters) {
	        queryParameters = JSON.stringify(queryParameters);
	    }
	    request.post({
	        url: url,
	        body: queryParameters
	    }, function(err, res) {
	        if (err) {
	            callback(err);
	        } else {
	            var asset = JSON.parse(res.body);
	            callback(asset);
	        }
	    })
	},
	listAvailableOwners: function(config,callback) {
	    var url = config.api_endpoint + "/contacts/list/owners?access_token=" + config.auth_object.access_token;
	    request.get({
	        url: url
	    }, function(err, res) {
	        if (err) {
	            callback(err);
	        } else {
	            var asset = JSON.parse(res.body);
	            callback(asset);
	        }
	    })
	},
	listAvailableFields: function(config,callback) {
	    var url = config.api_endpoint + "/contacts/list/fields?access_token=" + config.auth_object.access_token;
	    request.get({
	        url: url
	    }, function(err, res) {
	        if (err) {
	            callback(err);
	        } else {
	            var asset = JSON.parse(res.body);
	            callback(asset);
	        }
	    })
	},
	listContactNotes: function(config,contactId,queryParameters,callback) {
	    var url = config.api_endpoint + "/contacts/" + contactId + "/notes";
		if (queryParameters) {
			url = url + "?";
			Object.keys(queryParameters).forEach(function(key){
				url = url + key + "=" + queryParameters[key] + "&";
			});
			url = url + "access_token=" + config.auth_object.access_token;
		} else {
			url = url + "?access_token=" + config.auth_object.access_token;
		}
	    request.get({
	        url: url
	    }, function(err, res) {
	        if (err) {
	            callback(err);
	        } else {
	            var asset = JSON.parse(res.body);
	            callback(asset);
	        }
	    })
	},
	getSegmentMemberships: function(config,contactId,callback){
		var url = config.api_endpoint + "/contacts/" + contactId + "/segments?access_token=" + config.auth_object.access_token;
		request.get({
			url:url
		},function(err,res){
			if (err) {
				callback(err);
			} else {
				var asset = JSON.parse(res.body);	
				callback(asset);
			}
		})
	},
	getCampaignMemberships: function(config,contactId,callback){
		var url = config.api_endpoint + "/contacts/" + contactId + "/campaigns?access_token=" + config.auth_object.access_token;
		request.get({
			url:url
		},function(err,res){
			if (err) {
				callback(err);
			} else {
				var asset = JSON.parse(res.body);	
				callback(asset);
			}
		})
	},
	getActivityEventsForContact: function(config,contactId,queryParameters,callback) {
	    var url = config.api_endpoint + "/contacts/" + contactId + "/activity";
		if (queryParameters) {
			url = url + "?";
			Object.keys(queryParameters).forEach(function(key){
				url = url + key + "=" + queryParameters[key] + "&";
			});
			url = url + "access_token=" + config.auth_object.access_token;
		} else {
			url = url + "?access_token=" + config.auth_object.access_token;
		}
	    request.get({
	        url: url
	    }, function(err, res) {
	        if (err) {
	            callback(err);
	        } else {
	            var asset = JSON.parse(res.body);
	            callback(asset);
	        }
	    })
	},
	getContactCompanies: function(config,contactId,callback){
		var url = config.api_endpoint + "/contacts/" + contactId + "/companies?access_token=" + config.auth_object.access_token;
		request.get({
			url:url
		},function(err,res){
			if (err) {
				callback(err);
			} else {
				var asset = JSON.parse(res.body);	
				callback(asset);
			}
		})
	},
	getContactDevices: function(config,contactId,callback){
		var url = config.api_endpoint + "/contacts/" + contactId + "/devices?access_token=" + config.auth_object.access_token;
		request.get({
			url:url
		},function(err,res){
			if (err) {
				callback(err);
			} else {
				var asset = JSON.parse(res.body);	
				callback(asset);
			}
		})
	},
};

exports.dashboard = {
	getAvailableWidgetTypes: function(config,callback){
		var url = config.api_endpoint + "/data?access_token=" + config.auth_object.access_token;
		request.get({
			url:url
		},function(err,res){
			if (err) {
				callback(err);
			} else {
				var asset = JSON.parse(res.body);	
				callback(asset);
			}
		})
	}
};

exports.dynamiccontent = {
	getDynamicContent: function(config,contentId,callback){
		var url = config.api_endpoint + "/dynamiccontents/" + contentId + "?access_token=" + config.auth_object.access_token;
		request.get({
			url:url
		},function(err,res){
			if (err) {
				callback(err);
			} else {
				var asset = JSON.parse(res.body);	
				callback(asset);
			}
		})
	},
	listDynamicContent: function(config,callback){
		var url = config.api_endpoint + "/dynamiccontents?access_token=" + config.auth_object.access_token;
		request.get({
			url:url
		},function(err,res){
			if (err) {
				callback(err);
			} else {
				var asset = JSON.parse(res.body);	
				callback(asset);
			}
		})
	},
	createDynamicContent: function(config,queryParameters,callback){
		var url = config.api_endpoint + "/dynamiccontents/new?access_token=" + config.auth_object.access_token;
		queryParameters = JSON.stringify(queryParameters);
		request.post({
			url: url,
			body: queryParameters
		},function(err,res){
			if (err) {
				callback(err);
			} else {
				var asset = JSON.parse(res.body);	
				callback(asset);
			}
		})
	},
	editDynamicContent: function(config,method,queryParameters,contentId,callback){
		var url = config.api_endpoint + "/dynamiccontents/" + contentId + "/edit?access_token=" + config.auth_object.access_token;
		queryParameters = JSON.stringify(queryParameters);
		if (method == "PATCH") {
			request.patch({
				url:url,
				body:queryParameters
			},function(err,res){
				if (err) {
					callback(err);
				} else {
					var asset = JSON.parse(res.body);	
					callback(asset);
				}
			})
		}
		if (method == "PUT") {
			request.put({
				url:url,
				body:queryParameters
			},function(err,res){
				if (err) {
					callback(err);
				} else {
					var asset = JSON.parse(res.body);	
					callback(asset);
				}
			})
		}
		if (method !== "PUT" && method !== "PATCH") {
			console.log("Invalid Method");
		}
	},
	deleteDynamicContent: function(config,contentId,callback){
		var url = config.api_endpoint + "/dynamiccontents/" + contentId + "/delete?access_token=" + config.auth_object.access_token;
		request.delete({
			url:url
		},function(err,res){
			if (err) {
				callback(err);
			} else {
				var asset = JSON.parse(res.body);	
				callback(asset);
			}
		})
	}
};

exports.emails = {
	getEmail: function(config,emailId,callback){
		var url = config.api_endpoint + "/emails/" + emailId + "?access_token=" + config.auth_object.access_token;
		request.get({
			url:url
		},function(err,res){
			if (err) {
				callback(err);
			} else {
				var asset = JSON.parse(res.body);	
				callback(asset);
			}
		})
	},
	listEmails: function(config,callback){
		var url = config.api_endpoint + "/emails?access_token=" + config.auth_object.access_token;
		request.get({
			url:url
		},function(err,res){
			if (err) {
				callback(err);
			} else {
				var asset = JSON.parse(res.body);	
				callback(asset);
			}
		})
	},
	createEmail: function(config,queryParameters,callback){
		var url = config.api_endpoint + "/emails/new?access_token=" + config.auth_object.access_token;
		queryParameters = JSON.stringify(queryParameters);
		request.post({
			url: url,
			body: queryParameters
		},function(err,res){
			if (err) {
				callback(err);
			} else {
				var asset = JSON.parse(res.body);	
				callback(asset);
			}
		})
	},
	editEmail: function(config,method,queryParameters,emailId,callback){
		var url = config.api_endpoint + "/emails/" + emailId + "/edit?access_token=" + config.auth_object.access_token;
		queryParameters = JSON.stringify(queryParameters);
		if (method == "PATCH") {
			request.patch({
				url:url,
				body:queryParameters
			},function(err,res){
				if (err) {
					callback(err);
				} else {
					var asset = JSON.parse(res.body);	
					callback(asset);
				}
			})
		}
		if (method == "PUT") {
			request.put({
				url:url,
				body:queryParameters
			},function(err,res){
				if (err) {
					callback(err);
				} else {
					var asset = JSON.parse(res.body);	
					callback(asset);
				}
			})
		}
		if (method !== "PUT" && method !== "PATCH") {
			console.log("Invalid Method");
		}
	},
	deleteEmail: function(config,emailId,callback){
		var url = config.api_endpoint + "/emails/" + emailId + "/delete?access_token=" + config.auth_object.access_token;
		request.delete({
			url:url
		},function(err,res){
			if (err) {
				callback(err);
			} else {
				var asset = JSON.parse(res.body);	
				callback(asset);
			}
		})
	},
	sendEmailToContact: function(config,emailId,contactId,callback){
		var url = config.api_endpoint + "/emails/" + emailId + "/contact/" + contactId + "/send?access_token=" + config.auth_object.access_token;
		request.post({
			url: url,
		},function(err,res){
			if (err) {
				callback(err);
			} else {
				if (res.body.errors) {
					callback(res.body);
				} else {
					var asset = JSON.parse(res.body);	
					callback(asset);
				}
			}
		})
	},
	sendEmailToSegment: function(config,emailId,callback){
		var url = config.api_endpoint + "/emails/" + emailId + "/send?access_token=" + config.auth_object.access_token;
		request.post({
			url: url,
		},function(err,res){
			if (err) {
				callback(err);
			} else {
				if (res.body.errors) {
					callback(res.body);
				} else {
					var asset = JSON.parse(res.body);	
					callback(asset);
				}
			}
		})
	}
};

exports.fields = {
	getField: function(config,fieldType,fieldId,callback){
		if (fieldType == "contact"){
			var url = config.api_endpoint + "/fields/contact/" + fieldId + "?access_token=" + config.auth_object.access_token;
		}
		if (fieldType == "company") {
			var url = config.api_endpoint + "/fields/company/" + fieldId + "?access_token=" + config.auth_object.access_token;
		}
		if (fieldType == "company" || fieldType == "contact") {
			request.get({
				url:url
			},function(err,res){
				if (err) {
					callback(err);
				} else {
					var asset = JSON.parse(res.body);	
					callback(asset);
				}
			})	
		} else {
			callback("Please enter either 'company' or 'contact' for the Field Type");
		}
	},
	listContactFields: function(config,fieldType,callback){
		var url = "";
		if (fieldType == "contact"){
			url = config.api_endpoint + "/fields/contact?access_token=" + config.auth_object.access_token;
		}
		if (fieldType == "company") {
			url = config.api_endpoint + "/fields/company?access_token=" + config.auth_object.access_token;
		}
		if (fieldType == "company" || fieldType == "contact") {
			request.get({
				url:url
			},function(err,res){
				if (err) {
					callback(err);
				} else {
					var asset = JSON.parse(res.body);	
					callback(asset);
				}
			})	
		} else {
			callback("Please enter either 'company' or 'contact' for the Field Type");
		}
	},
	createField: function(config,fieldType,queryParameters,callback){
		var url = "";
		if (fieldType == "contact"){
			url = config.api_endpoint + "/fields/contact/new?access_token=" + config.auth_object.access_token;
		}
		if (fieldType == "company") {
			url = config.api_endpoint + "/fields/company/new?access_token=" + config.auth_object.access_token;
		}
		if (fieldType == "company" || fieldType == "contact") {
			queryParameters = JSON.stringify(queryParameters);
			request.post({
				url: url,
				body: queryParameters
			},function(err,res){
				if (err) {
					callback(err);
				} else {
					var asset = JSON.parse(res.body);	
					callback(asset);
				}
			})
		} else {
			console.log("Please enter either 'company' or 'contact' for the Field Type");
			var asset = {
				errors: [
					"Incorrect Field Type"
				]
			};
			callback(asset);
		}
	},
	editField: function(config, method, fieldType, queryParameters, fieldId, callback) {
	    var url = "";
	    if (fieldType == "contact") {
	        url = config.api_endpoint + "/fields/contact/" + fieldId + "/edit?access_token=" + config.auth_object.access_token;
	    }
	    if (fieldType == "company") {
	        url = config.api_endpoint + "/fields/company/" + fieldId + "/edit?access_token=" + config.auth_object.access_token;
	    }	    
	    queryParameters = JSON.stringify(queryParameters);
	    if (fieldType == "contact" || fieldType == "company") {
	        if (method == "PATCH") {
	            request.patch({
	                url: url,
	                body: queryParameters
	            }, function(err, res) {
	                if (err) {
	                    callback(err);
	                } else {
	                    var asset = JSON.parse(res.body);
	                    callback(asset);
	                }
	            })
	        }
	        if (method == "PUT") {
	            request.put({
	                url: url,
	                body: queryParameters
	            }, function(err, res) {
	                if (err) {
	                    callback(err);
	                } else {
	                    var asset = JSON.parse(res.body);
	                    callback(asset);
	                }
	            })
	        }
	        if (method !== "PUT" && method !== "PATCH") {
	            var errors = {errors:["Invalid Method"]}
	            callback(errors);
	        }
	    } else {
			console.log("Please enter either 'company' or 'contact' for the Field Type");
			var asset = {
				errors: [
					"Incorrect Field Type"
				]
			};
			callback(asset);
	    }
	},
	deleteField: function(config, fieldType, fieldId, callback){
		if (fieldType == "contact"){
			var url = config.api_endpoint + "/fields/contact/" + fieldId + "/delete?access_token=" + config.auth_object.access_token;
		}
		if (fieldType == "company") {
			var url = config.api_endpoint + "/fields/company/" + fieldId + "/delete?access_token=" + config.auth_object.access_token;
		}
		if (fieldType == "company" || fieldType == "contact") {
			request.delete({
				url:url
			},function(err,res){
				if (err) {
					callback(err);
				} else {
					var asset = JSON.parse(res.body);	
					callback(asset);
				}
			})	
		} else {
			console.log("Please enter either 'company' or 'contact' for the Field Type");
			var asset = {
				errors: [
					"Incorrect Field Type"
				]
			};
			callback(asset);
		}
	}
};

exports.forms = {
	getForm: function(config,formId,callback){
		var url = config.api_endpoint + "/forms/" + formId + "?access_token=" + config.auth_object.access_token;
		request.get({
			url:url
		},function(err,res){
			if (err) {
				callback(err);
			} else {
				var asset = JSON.parse(res.body);	
				callback(asset);
			}
		})
	},
	listForms: function(config,queryParameters,callback) {
	    var url = config.api_endpoint + "/forms";
		if (queryParameters) {
			url = url + "?";
			Object.keys(queryParameters).forEach(function(key){
				url = url + key + "=" + queryParameters[key] + "&";
			});
			url = url + "access_token=" + config.auth_object.access_token;
		} else {
			url = url + "?access_token=" + config.auth_object.access_token;
		}
	    request.get({
	        url: url
	    }, function(err, res) {
	        if (err) {
	            callback(err);
	        } else {
	            var asset = JSON.parse(res.body);
	            callback(asset);
	        }
	    })
	},
	createForm: function(config,queryParameters,callback){
		var url = config.api_endpoint + "/forms/new?access_token=" + config.auth_object.access_token;
		queryParameters = JSON.stringify(queryParameters);
		request.post({
			url: url,
			body: queryParameters
		},function(err,res){
			if (err) {
				callback(err);
			} else {
				var asset = JSON.parse(res.body);	
				callback(asset);
			}
		})
	},
	editForm: function(config,method,queryParameters,formId,callback){
		var url = config.api_endpoint + "/forms/" + formId + "/edit?access_token=" + config.auth_object.access_token;
		queryParameters = JSON.stringify(queryParameters);
		if (method == "PATCH") {
			request.patch({
				url:url,
				body:queryParameters
			},function(err,res){
				if (err) {
					callback(err);
				} else {
					var asset = JSON.parse(res.body);	
					callback(asset);
				}
			})
		}
		if (method == "PUT") {
			request.put({
				url:url,
				body:queryParameters
			},function(err,res){
				if (err) {
					callback(err);
				} else {
					var asset = JSON.parse(res.body);	
					callback(asset);
				}
			})
		}
		if (method !== "PUT" && method !== "PATCH") {
			console.log("Invalid Method");
			callback("Invalid Method");
		}
	},
	deleteForm: function(config,formId,callback){
		var url = config.api_endpoint + "/forms/" + formId + "/delete?access_token=" + config.auth_object.access_token;
		request.delete({
			url:url
		},function(err,res){
			if (err) {
				callback(err);
			} else {
				var asset = JSON.parse(res.body);	
				callback(asset);
			}
		})
	},
	deleteFormFields: function(config,formId,queryParameters,callback){
		var url = config.api_endpoint + "/forms/" + formId + "/fields/delete";
		if (queryParameters) {
			url = url + "?";
			Object.keys(queryParameters).forEach(function(key){
				url = url + key + "=" + queryParameters[key] + "&";
			});
			url = url + "access_token=" + config.auth_object.access_token;
		} else {
			url = url + "?access_token=" + config.auth_object.access_token;
		}
		request.delete({
			url: url,
		},function(err,res){
			if (err) {
				callback(err);
			} else {
				if (res.body.errors) {
					callback(res.body);
				} else {
					var asset = JSON.parse(res.body);	
					callback(asset);
				}
			}
		})
	},
	deleteFormActions: function(config,formId,queryParameters,callback){
		var url = config.api_endpoint + "/forms/" + formId + "/actions/delete";
		if (queryParameters) {
			url = url + "?";
			Object.keys(queryParameters).forEach(function(key){
				url = url + key + "=" + queryParameters[key] + "&";
			});
			url = url + "access_token=" + config.auth_object.access_token;
		} else {
			url = url + "?access_token=" + config.auth_object.access_token;
		}
		request.delete({
			url: url,
		},function(err,res){
			if (err) {
				callback(err);
			} else {
				if (res.body.errors) {
					callback(res.body);
				} else {
					var asset = JSON.parse(res.body);	
					callback(asset);
				}
			}
		})
	},
	listFormSubmissions: function(config,formId,callback){
		var url = config.api_endpoint + "/forms/" + formId + "/submissions?access_token=" + config.auth_object.access_token;
		request.get({
			url:url
		},function(err,res){
			if (err) {
				callback(err);
			} else {
				var asset = JSON.parse(res.body);	
				callback(asset);
			}
		})
	},
	listFormSubmissionsForContact: function(config,formId,contactId,callback){
		var url = config.api_endpoint + "/forms/" + formId + "/submissions/contact/" + contactId + "?access_token=" + config.auth_object.access_token;
		request.get({
			url: url,
		},function(err,res){
			if (err) {
				callback(err);
			} else {
				if (res.body.errors) {
					callback(res.body);
				} else {
					var asset = JSON.parse(res.body);	
					callback(asset);
				}
			}
		})
	},
	getFormSubmission: function(config,formId,submissionId,callback){
		var url = config.api_endpoint + "/forms/" + formId + "/submissions/" + submissionId + "?access_token=" + config.auth_object.access_token;
		request.get({
			url: url,
		},function(err,res){
			if (err) {
				callback(err);
			} else {
				if (res.body.errors) {
					callback(res.body);
				} else {
					var asset = JSON.parse(res.body);	
					callback(asset);
				}
			}
		})
	},
};

exports.marketingmessages = {
	getMarketingMessage: function(config,messageId,callback){
		var url = config.api_endpoint + "/messages/" + messageId + "?access_token=" + config.auth_object.access_token;
		request.get({
			url:url
		},function(err,res){
			if (err) {
				callback(err);
			} else {
				var asset = JSON.parse(res.body);	
				callback(asset);
			}
		})
	},
	listMarketingMessages: function(config,queryParameters,callback) {
	    var url = config.api_endpoint + "/messages";
		if (queryParameters) {
			url = url + "?";
			Object.keys(queryParameters).forEach(function(key){
				url = url + key + "=" + queryParameters[key] + "&";
			});
			url = url + "access_token=" + config.auth_object.access_token;
		} else {
			url = url + "?access_token=" + config.auth_object.access_token;
		}
	    request.get({
	        url: url
	    }, function(err, res) {
	        if (err) {
	            callback(err);
	        } else {
	            var asset = JSON.parse(res.body);
	            callback(asset);
	        }
	    })
	},
	createMarketingMessage: function(config,queryParameters,callback){
		var url = config.api_endpoint + "/messages/new?access_token=" + config.auth_object.access_token;
		queryParameters = JSON.stringify(queryParameters);
		request.post({
			url: url,
			body: queryParameters
		},function(err,res){
			if (err) {
				callback(err);
			} else {
				var asset = JSON.parse(res.body);
				if (asset.errors) {
					callback(asset.errors);
				} else {
					callback(asset);
				}
			}
		})
	},
	editMarketingMessage: function(config,method,queryParameters,messageId,callback){
		var url = config.api_endpoint + "/messages/" + messageId + "/edit?access_token=" + config.auth_object.access_token;
		queryParameters = JSON.stringify(queryParameters);
		if (method == "PATCH") {
			request.patch({
				url:url,
				body:queryParameters
			},function(err,res){
				if (err) {
					callback(err);
				} else {
					var asset = JSON.parse(res.body);	
					callback(asset);
				}
			})
		}
		if (method == "PUT") {
			request.put({
				url:url,
				body:queryParameters
			},function(err,res){
				if (err) {
					callback(err);
				} else {
					var asset = JSON.parse(res.body);	
					callback(asset);
				}
			})
		}
		if (method !== "PUT" && method !== "PATCH") {
			callback("Invalid Method");
		}
	},
	deleteMarketingMessage: function(config,messageId,callback){
		var url = config.api_endpoint + "/messages/" + messageId + "/delete?access_token=" + config.auth_object.access_token;
		request.delete({
			url:url
		},function(err,res){
			if (err) {
				callback(err);
			} else {
				var asset = JSON.parse(res.body);	
				callback(asset);
			}
		})
	}
};

exports.notes = {
	getNote: function(config,noteId,callback){
		var url = config.api_endpoint + "/notes/" + noteId + "?access_token=" + config.auth_object.access_token;
		request.get({
			url:url
		},function(err,res){
			if (err) {
				callback(err);
			} else {
				var asset = JSON.parse(res.body);	
				callback(asset);
			}
		})
	},
	listContactNotes: function(config, callback) {
	    var url = config.api_endpoint + "/notes?access_token=" + config.auth_object.access_token;
	    if (queryParameters) {
	        url = url + "?";
	        Object.keys(queryParameters).forEach(function(key) {
	            url = url + key + "=" + queryParameters[key] + "&";
	        });
	        url = url + "access_token=" + config.auth_object.access_token;
	    } else {
	        url = url + "?access_token=" + config.auth_object.access_token;
	    }
	    request.get({
	        url: url
	    }, function(err, res) {
	        if (err) {
	            callback(err);
	        } else {
	            var asset = JSON.parse(res.body);
	            callback(asset);
	        }
	    })
	},
	createNote: function(config,queryParameters,callback){
		var url = config.api_endpoint + "/notes/new?access_token=" + config.auth_object.access_token;
		queryParameters = JSON.stringify(queryParameters);
		request.post({
			url: url,
			body: queryParameters
		},function(err,res){
			if (err) {
				callback(err);
			} else {
				var asset = JSON.parse(res.body);
				if (asset.errors) {
					callback(asset.errors);
				} else {
					callback(asset);
				}
			}
		})
	},
	editNote: function(config,method,queryParameters,noteId,callback){
		var url = config.api_endpoint + "/notes/" + noteId + "/edit?access_token=" + config.auth_object.access_token;
		queryParameters = JSON.stringify(queryParameters);
		if (method == "PATCH") {
			request.patch({
				url:url,
				body:queryParameters
			},function(err,res){
				if (err) {
					callback(err);
				} else {
					var asset = JSON.parse(res.body);	
					callback(asset);
				}
			})
		}
		if (method == "PUT") {
			request.put({
				url:url,
				body:queryParameters
			},function(err,res){
				if (err) {
					callback(err);
				} else {
					var asset = JSON.parse(res.body);	
					callback(asset);
				}
			})
		}
		if (method !== "PUT" && method !== "PATCH") {
			callback("Invalid Method");
		}
	},
	deleteNote: function(config,noteId,callback){
		var url = config.api_endpoint + "/notes/" + noteId + "/delete?access_token=" + config.auth_object.access_token;
		request.delete({
			url:url
		},function(err,res){
			if (err) {
				callback(err);
			} else {
				var asset = JSON.parse(res.body);	
				callback(asset);
			}
		})
	}
};

exports.notifications = {
	getNotification: function(config,notificationId,callback){
		var url = config.api_endpoint + "/notifications/" + notificationId + "?access_token=" + config.auth_object.access_token;
		request.get({
			url:url
		},function(err,res){
			if (err) {
				callback(err);
			} else {
				var asset = JSON.parse(res.body);	
				callback(asset);
			}
		})
	},
	listNotifications: function(config,queryParameters,callback) {
	    var url = config.api_endpoint + "/notifications";
	    if (queryParameters) {
	        url = url + "?";
	        Object.keys(queryParameters).forEach(function(key) {
	            url = url + key + "=" + queryParameters[key] + "&";
	        });
	        url = url + "access_token=" + config.auth_object.access_token;
	    } else {
	        url = url + "?access_token=" + config.auth_object.access_token;
	    }
	    request.get({
	        url: url
	    }, function(err, res) {
	        if (err) {
	            callback(err);
	        } else {
	            var asset = JSON.parse(res.body);
	            callback(asset);
	        }
	    })
	},
	createNotification: function(config,queryParameters,callback){
		var url = config.api_endpoint + "/notifications/new?access_token=" + config.auth_object.access_token;
		queryParameters = JSON.stringify(queryParameters);
		request.post({
			url: url,
			body: queryParameters
		},function(err,res){
			if (err) {
				callback(err);
			} else {
				var asset = JSON.parse(res.body);
				if (asset.errors) {
					callback(asset.errors);
				} else {
					callback(asset);
				}
			}
		})
	},
	editNotification: function(config,method,queryParameters,notificationId,callback){
		var url = config.api_endpoint + "/notifications/" + notificationId + "/edit?access_token=" + config.auth_object.access_token;
		queryParameters = JSON.stringify(queryParameters);
		if (method == "PATCH") {
			request.patch({
				url:url,
				body:queryParameters
			},function(err,res){
				if (err) {
					callback(err);
				} else {
					var asset = JSON.parse(res.body);	
					callback(asset);
				}
			})
		}
		if (method == "PUT") {
			request.put({
				url:url,
				body:queryParameters
			},function(err,res){
				if (err) {
					callback(err);
				} else {
					var asset = JSON.parse(res.body);	
					callback(asset);
				}
			})
		}
		if (method !== "PUT" && method !== "PATCH") {
			callback("Invalid Method");
		}
	},
	deleteNotification: function(config,notificationId,callback){
		var url = config.api_endpoint + "/notifications/" + notificationId + "/delete?access_token=" + config.auth_object.access_token;
		request.delete({
			url:url
		},function(err,res){
			if (err) {
				callback(err);
			} else {
				var asset = JSON.parse(res.body);	
				callback(asset);
			}
		})
	}
};

exports.pages = {
	getPage: function(config,pageId,callback){
		var url = config.api_endpoint + "/pages/" + pageId + "?access_token=" + config.auth_object.access_token;
		request.get({
			url:url
		},function(err,res){
			if (err) {
				callback(err);
			} else {
				var asset = JSON.parse(res.body);	
				callback(asset);
			}
		})
	},
	listPages: function(config,queryParameters,callback) {
	    var url = config.api_endpoint + "/pages";
	    if (queryParameters) {
	        url = url + "?";
	        Object.keys(queryParameters).forEach(function(key) {
	            url = url + key + "=" + queryParameters[key] + "&";
	        });
	        url = url + "access_token=" + config.auth_object.access_token;
	    } else {
	        url = url + "?access_token=" + config.auth_object.access_token;
	    }
	    request.get({
	        url: url
	    }, function(err, res) {
	        if (err) {
	            callback(err);
	        } else {
	            var asset = JSON.parse(res.body);
	            callback(asset);
	        }
	    })
	},
	createPage: function(config,queryParameters,callback){
		var url = config.api_endpoint + "/pages/new?access_token=" + config.auth_object.access_token;
		queryParameters = JSON.stringify(queryParameters);
		request.post({
			url: url,
			body: queryParameters
		},function(err,res){
			if (err) {
				callback(err);
			} else {
				var asset = JSON.parse(res.body);
				if (asset.errors) {
					callback(asset.errors);
				} else {
					callback(asset);
				}
			}
		})
	},
	editPage: function(config,method,queryParameters,pageId,callback){
		var url = config.api_endpoint + "/pages/" + pageId + "/edit?access_token=" + config.auth_object.access_token;
		queryParameters = JSON.stringify(queryParameters);
		if (method == "PATCH") {
			request.patch({
				url:url,
				body:queryParameters
			},function(err,res){
				if (err) {
					callback(err);
				} else {
					var asset = JSON.parse(res.body);	
					callback(asset);
				}
			})
		}
		if (method == "PUT") {
			request.put({
				url:url,
				body:queryParameters
			},function(err,res){
				if (err) {
					callback(err);
				} else {
					var asset = JSON.parse(res.body);	
					callback(asset);
				}
			})
		}
		if (method !== "PUT" && method !== "PATCH") {
			callback("Invalid Method");
		}
	},
	deletePage: function(config,pageId,callback){
		var url = config.api_endpoint + "/pages/" + pageId + "/delete?access_token=" + config.auth_object.access_token;
		request.delete({
			url:url
		},function(err,res){
			if (err) {
				callback(err);
			} else {
				var asset = JSON.parse(res.body);	
				callback(asset);
			}
		})
	}
};

exports.pointactions = {
	getPointAction: function(config,pointactionId,callback){
		var url = config.api_endpoint + "/points/" + pointactionId + "?access_token=" + config.auth_object.access_token;
		request.get({
			url:url
		},function(err,res){
			if (err) {
				callback(err);
			} else {
				var asset = JSON.parse(res.body);	
				callback(asset);
			}
		})
	},
	listPointActions: function(config,queryParameters,callback) {
	    var url = config.api_endpoint + "/points";
	    if (queryParameters) {
	        url = url + "?";
	        Object.keys(queryParameters).forEach(function(key) {
	            url = url + key + "=" + queryParameters[key] + "&";
	        });
	        url = url + "access_token=" + config.auth_object.access_token;
	    } else {
	        url = url + "?access_token=" + config.auth_object.access_token;
	    }
	    request.get({
	        url: url
	    }, function(err, res) {
	        if (err) {
	            callback(err);
	        } else {
	            var asset = JSON.parse(res.body);
	            callback(asset);
	        }
	    })
	},
	createPointAction: function(config,queryParameters,callback){
		var url = config.api_endpoint + "/points/new?access_token=" + config.auth_object.access_token;
		queryParameters = JSON.stringify(queryParameters);
		request.post({
			url: url,
			body: queryParameters
		},function(err,res){
			if (err) {
				callback(err);
			} else {
				var asset = JSON.parse(res.body);
				if (asset.errors) {
					callback(asset.errors);
				} else {
					callback(asset);
				}
			}
		})
	},
	editPointAction: function(config,method,queryParameters,pointactionId,callback){
		var url = config.api_endpoint + "/points/" + pointactionId + "/edit?access_token=" + config.auth_object.access_token;
		queryParameters = JSON.stringify(queryParameters);
		if (method == "PATCH") {
			request.patch({
				url:url,
				body:queryParameters
			},function(err,res){
				if (err) {
					callback(err);
				} else {
					var asset = JSON.parse(res.body);	
					callback(asset);
				}
			})
		}
		if (method == "PUT") {
			request.put({
				url:url,
				body:queryParameters
			},function(err,res){
				if (err) {
					callback(err);
				} else {
					var asset = JSON.parse(res.body);	
					callback(asset);
				}
			})
		}
		if (method !== "PUT" && method !== "PATCH") {
			callback("Invalid Method");
		}
	},
	deletePointAction: function(config,pointactionId,callback){
		var url = config.api_endpoint + "/points/" + pointactionId + "/delete?access_token=" + config.auth_object.access_token;
		request.delete({
			url:url
		},function(err,res){
			if (err) {
				callback(err);
			} else {
				var asset = JSON.parse(res.body);	
				callback(asset);
			}
		})
	},
	getPointActionTypes: function(config,callback){
		var url = config.api_endpoint + "/points/actions/types?access_token=" + config.auth_object.access_token;
		request.get({
			url:url
		},function(err,res){
			if (err) {
				callback(err);
			} else {
				var asset = JSON.parse(res.body);	
				callback(asset);
			}
		})
	}
};

exports.pointtriggers = {
	getPointTrigger: function(config,pointtriggerId,callback){
		var url = config.api_endpoint + "/points/triggers/" + pointtriggerId + "?access_token=" + config.auth_object.access_token;
		request.get({
			url:url
		},function(err,res){
			if (err) {
				callback(err);
			} else {
				var asset = JSON.parse(res.body);	
				callback(asset);
			}
		})
	},
	listPointTriggers: function(config,queryParameters,callback) {
	    var url = config.api_endpoint + "/points/triggers";
	    if (queryParameters) {
	        url = url + "?";
	        Object.keys(queryParameters).forEach(function(key) {
	            url = url + key + "=" + queryParameters[key] + "&";
	        });
	        url = url + "access_token=" + config.auth_object.access_token;
	    } else {
	        url = url + "?access_token=" + config.auth_object.access_token;
	    }
	    request.get({
	        url: url
	    }, function(err, res) {
	        if (err) {
	            callback(err);
	        } else {
	            var asset = JSON.parse(res.body);
	            callback(asset);
	        }
	    })
	},
	createPointTrigger: function(config,queryParameters,callback){
		var url = config.api_endpoint + "/points/triggers/new?access_token=" + config.auth_object.access_token;
		queryParameters = JSON.stringify(queryParameters);
		request.post({
			url: url,
			body: queryParameters
		},function(err,res){
			if (err) {
				callback(err);
			} else {
				var asset = JSON.parse(res.body);
				if (asset.errors) {
					callback(asset.errors);
				} else {
					callback(asset);
				}
			}
		})
	},
	editPointTrigger: function(config,method,queryParameters,pointtriggerId,callback){
		var url = config.api_endpoint + "/points/triggers/" + pointtriggerId + "/edit?access_token=" + config.auth_object.access_token;
		queryParameters = JSON.stringify(queryParameters);
		if (method == "PATCH") {
			request.patch({
				url:url,
				body:queryParameters
			},function(err,res){
				if (err) {
					callback(err);
				} else {
					var asset = JSON.parse(res.body);	
					callback(asset);
				}
			})
		}
		if (method == "PUT") {
			request.put({
				url:url,
				body:queryParameters
			},function(err,res){
				if (err) {
					callback(err);
				} else {
					var asset = JSON.parse(res.body);	
					callback(asset);
				}
			})
		}
		if (method !== "PUT" && method !== "PATCH") {
			callback("Invalid Method");
		}
	},
	deletePointTrigger: function(config,pointtriggerId,callback){
		var url = config.api_endpoint + "/points/triggers/" + pointtriggerId + "/delete?access_token=" + config.auth_object.access_token;
		request.delete({
			url:url
		},function(err,res){
			if (err) {
				callback(err);
			} else {
				var asset = JSON.parse(res.body);	
				callback(asset);
			}
		})
	},
	getPointTriggerEventTypes: function(config,callback){
		var url = config.api_endpoint + "/points/triggers/events/types?access_token=" + config.auth_object.access_token;
		request.get({
			url:url
		},function(err,res){
			if (err) {
				callback(err);
			} else {
				var asset = JSON.parse(res.body);	
				callback(asset);
			}
		})
	}
};


exports.roles = {
	getRole: function(config,roleId,callback){
		var url = config.api_endpoint + "/roles/" + roleId + "?access_token=" + config.auth_object.access_token;
		request.get({
			url:url
		},function(err,res){
			if (err) {
				callback(err);
			} else {
				var asset = JSON.parse(res.body);	
				callback(asset);
			}
		})
	},
	listContactRoles: function(config,callback) {
	    var url = config.api_endpoint + "/roles?access_token=" + config.auth_object.access_token;
	    request.get({
	        url: url
	    }, function(err, res) {
	        if (err) {
	            callback(err);
	        } else {
	            var asset = JSON.parse(res.body);
	            callback(asset);
	        }
	    })
	},
	createRole: function(config,queryParameters,callback){
		var url = config.api_endpoint + "/roles/new?access_token=" + config.auth_object.access_token;
		queryParameters = JSON.stringify(queryParameters);
		request.post({
			url: url,
			body: queryParameters
		},function(err,res){
			if (err) {
				callback(err);
			} else {
				var asset = JSON.parse(res.body);
				if (asset.errors) {
					callback(asset.errors);
				} else {
					callback(asset);
				}
			}
		})
	},
	editRole: function(config,method,queryParameters,roleId,callback){
		var url = config.api_endpoint + "/roles/" + roleId + "/edit?access_token=" + config.auth_object.access_token;
		queryParameters = JSON.stringify(queryParameters);
		if (method == "PATCH") {
			request.patch({
				url:url,
				body:queryParameters
			},function(err,res){
				if (err) {
					callback(err);
				} else {
					var asset = JSON.parse(res.body);	
					callback(asset);
				}
			})
		}
		if (method == "PUT") {
			request.put({
				url:url,
				body:queryParameters
			},function(err,res){
				if (err) {
					callback(err);
				} else {
					var asset = JSON.parse(res.body);	
					callback(asset);
				}
			})
		}
		if (method !== "PUT" && method !== "PATCH") {
			callback("Invalid Method");
		}
	},
	deleteRole: function(config,roleId,callback){
		var url = config.api_endpoint + "/roles/" + roleId + "/delete?access_token=" + config.auth_object.access_token;
		request.delete({
			url:url
		},function(err,res){
			if (err) {
				callback(err);
			} else {
				var asset = JSON.parse(res.body);	
				callback(asset);
			}
		})
	}
};

exports.segments = {
	getSegment: function(config,segmentId,callback){
		var url = config.api_endpoint + "/segments/" + segmentId + "?access_token=" + config.auth_object.access_token;
		request.get({
			url:url
		},function(err,res){
			if (err) {
				callback(err);
			} else {
				var asset = JSON.parse(res.body);	
				callback(asset);
			}
		})
	},
	listSegments: function(config,callback) {
	    var url = config.api_endpoint + "/segments?access_token=" + config.auth_object.access_token;
	    request.get({
	        url: url
	    }, function(err, res) {
	        if (err) {
	            callback(err);
	        } else {
	            var asset = JSON.parse(res.body);
	            callback(asset);
	        }
	    })
	},
	createSegment: function(config,queryParameters,callback){
		var url = config.api_endpoint + "/segments/new?access_token=" + config.auth_object.access_token;
		queryParameters = JSON.stringify(queryParameters);
		request.post({
			url: url,
			body: queryParameters
		},function(err,res){
			if (err) {
				callback(err);
			} else {
				var asset = JSON.parse(res.body);
				if (asset.errors) {
					callback(asset.errors);
				} else {
					callback(asset);
				}
			}
		})
	},
	editSegment: function(config,method,queryParameters,segmentId,callback){
		var url = config.api_endpoint + "/segments/" + segmentId + "/edit?access_token=" + config.auth_object.access_token;
		queryParameters = JSON.stringify(queryParameters);
		if (method == "PATCH") {
			request.patch({
				url:url,
				body:queryParameters
			},function(err,res){
				if (err) {
					callback(err);
				} else {
					var asset = JSON.parse(res.body);	
					callback(asset);
				}
			})
		}
		if (method == "PUT") {
			request.put({
				url:url,
				body:queryParameters
			},function(err,res){
				if (err) {
					callback(err);
				} else {
					var asset = JSON.parse(res.body);	
					callback(asset);
				}
			})
		}
		if (method !== "PUT" && method !== "PATCH") {
			callback("Invalid Method");
		}
	},
	deleteSegment: function(config,segmentId,callback){
		var url = config.api_endpoint + "/segments/" + segmentId + "/delete?access_token=" + config.auth_object.access_token;
		request.delete({
			url:url
		},function(err,res){
			if (err) {
				callback(err);
			} else {
				var asset = JSON.parse(res.body);	
				callback(asset);
			}
		})
	},
	addContactToSegment: function(config,segmentId,contactId,callback){
		var url = config.api_endpoint + "/segments/" + segmentId + "/contact/" + contactId + "/add?access_token=" + config.auth_object.access_token;
		request.post({
			url:url
		},function(err,res){
			if (err) {
				callback(err);
			} else {
				var asset = JSON.parse(res.body);	
				callback(asset);
			}
		})
	},
	removeContactFromSegment: function(config,segmentId,contactId,callback){
		var url = config.api_endpoint + "/segments/" + segmentId + "/contact/" + contactId + "/remove?access_token=" + config.auth_object.access_token;
		request.post({
			url:url
		},function(err,res){
			if (err) {
				callback(err);
			} else {
				var asset = JSON.parse(res.body);	
				callback(asset);
			}
		})
	}
};

exports.textmessages = {
	getTextMessage: function(config,textmessageId,callback){
		var url = config.api_endpoint + "/smses/" + textmessageId + "?access_token=" + config.auth_object.access_token;
		request.get({
			url:url
		},function(err,res){
			if (err) {
				callback(err);
			} else {
				var asset = JSON.parse(res.body);	
				callback(asset);
			}
		})
	},
	listTextMessages: function(config,queryParameters,callback) {
	    var url = config.api_endpoint + "/smses";
	    if (queryParameters) {
	        url = url + "?";
	        Object.keys(queryParameters).forEach(function(key) {
	            url = url + key + "=" + queryParameters[key] + "&";
	        });
	        url = url + "access_token=" + config.auth_object.access_token;
	    } else {
	        url = url + "?access_token=" + config.auth_object.access_token;
	    }
	    request.get({
	        url: url
	    }, function(err, res) {
	        if (err) {
	            callback(err);
	        } else {
	            var asset = JSON.parse(res.body);
	            callback(asset);
	        }
	    })
	},
	createTextMessage: function(config,queryParameters,callback){
		var url = config.api_endpoint + "/smses/new?access_token=" + config.auth_object.access_token;
		queryParameters = JSON.stringify(queryParameters);
		request.post({
			url: url,
			body: queryParameters
		},function(err,res){
			if (err) {
				callback(err);
			} else {
				var asset = JSON.parse(res.body);
				if (asset.errors) {
					callback(asset.errors);
				} else {
					callback(asset);
				}
			}
		})
	},
	editTextMessage: function(config,method,queryParameters,textmessageId,callback){
		var url = config.api_endpoint + "/smses/" + textmessageId + "/edit?access_token=" + config.auth_object.access_token;
		queryParameters = JSON.stringify(queryParameters);
		if (method == "PATCH") {
			request.patch({
				url:url,
				body:queryParameters
			},function(err,res){
				if (err) {
					callback(err);
				} else {
					var asset = JSON.parse(res.body);	
					callback(asset);
				}
			})
		}
		if (method == "PUT") {
			request.put({
				url:url,
				body:queryParameters
			},function(err,res){
				if (err) {
					callback(err);
				} else {
					var asset = JSON.parse(res.body);	
					callback(asset);
				}
			})
		}
		if (method !== "PUT" && method !== "PATCH") {
			callback("Invalid Method");
		}
	},
	deleteTextMessage: function(config,textmessageId,callback){
		var url = config.api_endpoint + "/smses/" + textmessageId + "/delete?access_token=" + config.auth_object.access_token;
		request.delete({
			url:url
		},function(err,res){
			if (err) {
				callback(err);
			} else {
				var asset = JSON.parse(res.body);	
				callback(asset);
			}
		})
	}
};

exports.stages = {
	getStage: function(config,stageId,callback){
		var url = config.api_endpoint + "/stages/" + stageId + "?access_token=" + config.auth_object.access_token;
		request.get({
			url:url
		},function(err,res){
			if (err) {
				callback(err);
			} else {
				var asset = JSON.parse(res.body);	
				callback(asset);
			}
		})
	},
	listStages: function(config,callback) {
	    var url = config.api_endpoint + "/stages?access_token=" + config.auth_object.access_token;
	    request.get({
	        url: url
	    }, function(err, res) {
	        if (err) {
	            callback(err);
	        } else {
	            var asset = JSON.parse(res.body);
	            callback(asset);
	        }
	    })
	},
	createStage: function(config,queryParameters,callback){
		var url = config.api_endpoint + "/stages/new?access_token=" + config.auth_object.access_token;
		queryParameters = JSON.stringify(queryParameters);
		request.post({
			url: url,
			body: queryParameters
		},function(err,res){
			if (err) {
				callback(err);
			} else {
				var asset = JSON.parse(res.body);
				if (asset.errors) {
					callback(asset.errors);
				} else {
					callback(asset);
				}
			}
		})
	},
	editStage: function(config,method,queryParameters,stageId,callback){
		var url = config.api_endpoint + "/stages/" + stageId + "/edit?access_token=" + config.auth_object.access_token;
		queryParameters = JSON.stringify(queryParameters);
		if (method == "PATCH") {
			request.patch({
				url:url,
				body:queryParameters
			},function(err,res){
				if (err) {
					callback(err);
				} else {
					var asset = JSON.parse(res.body);	
					callback(asset);
				}
			})
		}
		if (method == "PUT") {
			request.put({
				url:url,
				body:queryParameters
			},function(err,res){
				if (err) {
					callback(err);
				} else {
					var asset = JSON.parse(res.body);	
					callback(asset);
				}
			})
		}
		if (method !== "PUT" && method !== "PATCH") {
			callback("Invalid Method");
		}
	},
	deleteStage: function(config,stageId,callback){
		var url = config.api_endpoint + "/stages/" + stageId + "/delete?access_token=" + config.auth_object.access_token;
		request.delete({
			url:url
		},function(err,res){
			if (err) {
				callback(err);
			} else {
				var asset = JSON.parse(res.body);	
				callback(asset);
			}
		})
	},
	addContactToStage: function(config,stageId,contactId,callback){
		var url = config.api_endpoint + "/stages/" + stageId + "/contact/" + contactId + "/add?access_token=" + config.auth_object.access_token;
		request.post({
			url:url
		},function(err,res){
			if (err) {
				callback(err);
			} else {
				var asset = JSON.parse(res.body);	
				callback(asset);
			}
		})
	},
	removeContactFromStage: function(config,stageId,contactId,callback){
		var url = config.api_endpoint + "/stages/" + stageId + "/contact/" + contactId + "/remove?access_token=" + config.auth_object.access_token;
		request.post({
			url:url
		},function(err,res){
			if (err) {
				callback(err);
			} else {
				var asset = JSON.parse(res.body);	
				callback(asset);
			}
		})
	}
};

exports.themes = {
	getTheme: function(config,themename,callback){
		var url = config.api_endpoint + "/themes/" + themename + "?access_token=" + config.auth_object.access_token;
		request.get({
			url:url
		},function(err,res){
			if (err) {
				callback(err);
			} else {
				var asset = JSON.parse(res.body);	
				callback(asset);
			}
		})
	},
	getListOfThemes: function(config,callback) {
	    var url = config.api_endpoint + "/themes?access_token=" + config.auth_object.access_token;
	    request.get({
	        url: url
	    }, function(err, res) {
	        if (err) {
	            callback(err);
	        } else {
	            var asset = JSON.parse(res.body);
	            callback(asset);
	        }
	    })
	}
};

exports.tweets = {
	getTweet: function(config,tweetId,callback){
		var url = config.api_endpoint + "/tweets/" + tweetId + "?access_token=" + config.auth_object.access_token;
		request.get({
			url:url
		},function(err,res){
			if (err) {
				callback(err);
			} else {
				var asset = JSON.parse(res.body);	
				callback(asset);
			}
		})
	},
	listTweets: function(config,queryParameters,callback){
		var url = config.api_endpoint + "/tweets";
		if (queryParameters) {
			url = url + "?";
			Object.keys(queryParameters).forEach(function(key){
				url = url + key + "=" + queryParameters[key] + "&";
			});
			url = url + "access_token=" + config.auth_object.access_token;
		} else {
			url = url + "?access_token=" + config.auth_object.access_token;
		}
		request.get({
			url:url
		},function(err,res){
			if (err) {
				callback(err);
			} else {
				var asset = JSON.parse(res.body);	
				callback(asset);
			}
		})
	},
	createTweet: function(config,queryParameters,callback){
		var url = config.api_endpoint + "/tweets/new?access_token=" + config.auth_object.access_token;
		queryParameters = JSON.stringify(queryParameters);
		request.post({
			url: url,
			body: queryParameters
		},function(err,res){
			if (err) {
				callback(err);
			} else {
				var asset = JSON.parse(res.body);
				if (asset.errors) {
					callback(asset.errors);
				} else {
					callback(asset);
				}
			}
		})
	},
	editTweet: function(config,method,queryParameters,tweetId,callback){
		var url = config.api_endpoint + "/tweets/" + tweetId + "/edit?access_token=" + config.auth_object.access_token;
		queryParameters = JSON.stringify(queryParameters);
		if (method == "PATCH") {
			request.patch({
				url:url,
				body:queryParameters
			},function(err,res){
				if (err) {
					callback(err);
				} else {
					var asset = JSON.parse(res.body);	
					callback(asset);
				}
			})
		}
		if (method == "PUT") {
			request.put({
				url:url,
				body:queryParameters
			},function(err,res){
				if (err) {
					callback(err);
				} else {
					var asset = JSON.parse(res.body);	
					callback(asset);
				}
			})
		}
		if (method !== "PUT" && method !== "PATCH") {
			callback("Invalid Method");
		}
	},
	deleteTweet: function(config,tweetId,callback){
		var url = config.api_endpoint + "/tweets/" + tweetId + "/delete?access_token=" + config.auth_object.access_token;
		request.delete({
			url:url
		},function(err,res){
			if (err) {
				callback(err);
			} else {
				var asset = JSON.parse(res.body);	
				callback(asset);
			}
		})
	}
};

exports.users = {
	getUser: function(config,userId,callback){
		var url = config.api_endpoint + "/users/" + userId + "?access_token=" + config.auth_object.access_token;
		request.get({
			url:url
		},function(err,res){
			if (err) {
				callback(err);
			} else {
				var asset = JSON.parse(res.body);	
				callback(asset);
			}
		})
	},
	listContactUsers: function(config,callback) {
	    var url = config.api_endpoint + "/users?access_token=" + config.auth_object.access_token;
	    request.get({
	        url: url
	    }, function(err, res) {
	        if (err) {
	            callback(err);
	        } else {
	            var asset = JSON.parse(res.body);
	            callback(asset);
	        }
	    })
	},
	createUser: function(config,queryParameters,callback){
		var url = config.api_endpoint + "/users/new?access_token=" + config.auth_object.access_token;
		queryParameters = JSON.stringify(queryParameters);
		request.post({
			url: url,
			body: queryParameters
		},function(err,res){
			if (err) {
				callback(err);
			} else {
				var asset = JSON.parse(res.body);
				if (asset.errors) {
					callback(asset.errors);
				} else {
					callback(asset);
				}
			}
		})
	},
	editUser: function(config,method,queryParameters,userId,callback){
		var url = config.api_endpoint + "/users/" + userId + "/edit?access_token=" + config.auth_object.access_token;
		queryParameters = JSON.stringify(queryParameters);
		if (method == "PATCH") {
			request.patch({
				url:url,
				body:queryParameters
			},function(err,res){
				if (err) {
					callback(err);
				} else {
					var asset = JSON.parse(res.body);	
					callback(asset);
				}
			})
		}
		if (method == "PUT") {
			request.put({
				url:url,
				body:queryParameters
			},function(err,res){
				if (err) {
					callback(err);
				} else {
					var asset = JSON.parse(res.body);	
					callback(asset);
				}
			})
		}
		if (method !== "PUT" && method !== "PATCH") {
			callback("Invalid Method");
		}
	},
	deleteUser: function(config,userId,callback){
		var url = config.api_endpoint + "/users/" + userId + "/delete?access_token=" + config.auth_object.access_token;
		request.delete({
			url:url
		},function(err,res){
			if (err) {
				callback(err);
			} else {
				var asset = JSON.parse(res.body);	
				callback(asset);
			}
		})
	},
	getSelfUser: function(config,callback) {
	    var url = config.api_endpoint + "/users/self?access_token=" + config.auth_object.access_token;
	    request.get({
	        url: url
	    }, function(err, res) {
	        if (err) {
	            callback(err);
	        } else {
	            var asset = JSON.parse(res.body);
	            callback(asset);
	        }
	    })
	},
	checkUserPermissions: function(config,userId,callback){
		var url = config.api_endpoint + "/users/" + userId + "/permissioncheck?access_token=" + config.auth_object.access_token;
		request.get({
			url:url
		},function(err,res){
			if (err) {
				callback(err);
			} else {
				var asset = JSON.parse(res.body);	
				callback(asset);
			}
		})
	}
};

exports.webhooks = {
	getWebhook: function(config,webhookId,callback){
		var url = config.api_endpoint + "/hooks/" + webhookId + "?access_token=" + config.auth_object.access_token;
		request.get({
			url:url
		},function(err,res){
			if (err) {
				callback(err);
			} else {
				var asset = JSON.parse(res.body);	
				callback(asset);
			}
		})
	},
	listWebhooks: function(config,queryParameters,callback) {
	    var url = config.api_endpoint + "/hooks";
		if (queryParameters) {
			url = url + "?";
			Object.keys(queryParameters).forEach(function(key){
				url = url + key + "=" + queryParameters[key] + "&";
			});
			url = url + "access_token=" + config.auth_object.access_token;
		} else {
			url = url + "?access_token=" + config.auth_object.access_token;
		}
	    request.get({
	        url: url
	    }, function(err, res) {
	        if (err) {
	            callback(err);
	        } else {
	            var asset = JSON.parse(res.body);
	            callback(asset);
	        }
	    })
	},
	createWebhook: function(config,queryParameters,callback){
		var url = config.api_endpoint + "/hooks/new?access_token=" + config.auth_object.access_token;
		queryParameters = JSON.stringify(queryParameters);
		request.post({
			url: url,
			body: queryParameters
		},function(err,res){
			if (err) {
				callback(err);
			} else {
				var asset = JSON.parse(res.body);	
				callback(asset);
			}
		})
	},
	editWebhook: function(config,method,queryParameters,webhookId,callback){
		var url = config.api_endpoint + "/hooks/" + webhookId + "/edit?access_token=" + config.auth_object.access_token;
		queryParameters = JSON.stringify(queryParameters);
		if (method == "PATCH") {
			request.patch({
				url:url,
				body:queryParameters
			},function(err,res){
				if (err) {
					callback(err);
				} else {
					var asset = JSON.parse(res.body);	
					callback(asset);
				}
			})
		}
		if (method == "PUT") {
			request.put({
				url:url,
				body:queryParameters
			},function(err,res){
				if (err) {
					callback(err);
				} else {
					var asset = JSON.parse(res.body);	
					callback(asset);
				}
			})
		}
		if (method !== "PUT" && method !== "PATCH") {
			callback("Invalid Method");
		}
	},
	deleteWebhook: function(config,webhookId,callback){
		var url = config.api_endpoint + "/hooks/" + webhookId + "/delete?access_token=" + config.auth_object.access_token;
		request.delete({
			url:url
		},function(err,res){
			if (err) {
				callback(err);
			} else {
				var asset = JSON.parse(res.body);	
				callback(asset);
			}
		})
	},
	listAvailableWebhookTriggers: function(config,callback) {
	    var url = config.api_endpoint + "/hooks/triggers?access_token=" + config.auth_object.access_token;
	    request.get({
	        url: url
	    }, function(err, res) {
	        if (err) {
	            callback(err);
	        } else {
	            var asset = JSON.parse(res.body);
	            callback(asset);
	        }
	    })
	}
};