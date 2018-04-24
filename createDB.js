var MongoClient = require('mongodb').MongoClient;
// MongoDB setup
var dbUrl = "mongodb://localhost:27017/hackathon";

MongoClient.connect(dbUrl, function(err, db) {
  if (err) throw err;

  var dbo = db.db("hackathon");
  var collection = "credentials";
  dbo.createCollection(collection, function(err, res) {
    if (err) throw err;

	var myobj = { user: "", authToken: "" };	

	dbo.collection(collection).findOne({}, function(err, result) {
	    if (err) throw err;
	    if (result == null) {
	    	dbo.collection(collection).insertOne(myobj, function(err, res) {
				if (err) throw err;
				console.log("Collection created!");
				console.log("Database created!");
				console.log("1 document inserted");
				db.close();
			});
	    } else {
	    	console.log("Database already created")
	    	db.close();
	    }
  });
  });
});
//