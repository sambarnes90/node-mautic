var config = {};

// The base URL of your Mautic Installation, e.g.
config.base_url = "https://mautic.example.com";
// Public Key from API Credentials in Mautic (Oauth2 Only)
config.public_key = "EXAMPLE_PUBLIC_KEY";
// Secret Key from API Credentials in Mautic (Oauth2 Only)
config.secret_key = "EXAMPLE_SECRET_KEY";
// Redirect URI exactly matching that in the Oauth2 settings in Mautic
config.redirect_uri = "https://app.example.com";
// State that can be used to ensure that requests haven't been tampered with (Not yet implemented)
config.state = "EXAMPLE_STATE";
// Initialise blank variable that can be used to hold token codes with authorizing
config.code = "";
// API Endpoint URL in your Mautic installation
config.api_endpoint = "https://mautic.example.com/api"

module.exports = config;
