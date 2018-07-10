# ZohoAPI
A NodeJS server to talk to the ZohoAPI

# Generate Auth Token
https://accounts.zoho.eu/apiauthtoken/create?SCOPE=zohopeople/peopleapi

# Set up Mongo
- Create dir: mongo/data/db
- Go to root dir
- `./mongo/bin/mongod --dbpath ./mongo/data/db`
  - Or if you have mongo installed on your mac run that
- `npm install`
- `node server.js`
