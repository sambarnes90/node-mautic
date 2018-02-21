# Node.js Wrapper for Mautic API

![Mautic Logo](https://avatars2.githubusercontent.com/u/5257677?s=200&v=4 "Mautic Logo")

**Alpha** version of a basic wrapper to use the Mautic API in Node.js.

## Usage

  - `npm install mautic-api-node`
  - Require the module with `var mautic = require('mautic-api-node')`
  - Update the mautic.config object with relevant details as per below:
	`mautic.config.base_url = "https://example.mautic.com";`
	`mautic.config.redirect_uri = "https://www.mautic.com";`
	`mautic.config.public_key = "EXAMPLE_PUBLIC_KEY";`
	`mautic.config.secret_key = "EXAMPLE_SECRET_KEY";`
	`mautic.config.state = "RANDOM_STATE";`
	`mautic.config.api_endpoint = "https://example.mautic.com/api";`
  - Use `mautic.auth.checkAuth(callback)` to check auth and process the data with callback.
  - Callback will either receive a single parameter from these options:
    - An `asset` object containing the JSON response from the API.
    - An `error` string containing a relevant error message.
    - An `error` object from the request itself.

## Examples

  - Please reference `example.js` for an example.

## Reference

  - Attempted to follow the Mautic API Documentation (https://developer.mautic.org/) as closely as possible.