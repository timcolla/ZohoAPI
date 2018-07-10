// server.js
var express = require('express');
var bodyParser = require('body-parser');
var request = require('request');
var MongoClient = require('mongodb').MongoClient;

var app = express();

// set the view engine to ejs
app.set('view engine', 'ejs');

// create application/json parser
var jsonParser = bodyParser.json()
 
// create application/x-www-form-urlencoded parser
var urlencodedParser = bodyParser.urlencoded({ extended: false })

var authToken = ""
var email = ""

// MongoDB setup
var dbUrl = "mongodb://localhost:27017/hackathon";
var dbName = "hackathon";
var credentialsCollection = "credentials";
var favouritesCollection = "favourites"

MongoClient.connect(dbUrl, { useNewUrlParser: true }, function(err, db) {
	if (err) throw err;

	var dbo = db.db(dbName);

	dbo.collection(credentialsCollection).findOne({}, function(err, result) {
	    if (err) throw err;
	    if (result == null) {
	    	console.log("Database not created yet. Run createDB.js first.")
	    } else {
	    	authToken = result.authToken;
	    	email = result.user;
	    	// Start the server
	    	setupServer();
	    }
    	db.close();
	});
});

function setupServer() {

	function isJSONRequest(req) {
		return req.headers["content-type"] == 'application/json';
	}

	// index page 
	app.get('/', function(req, res) {
	    res.redirect('/setup');//.render('pages/index');
	});

	// about page 
	app.get('/about', function(req, res) {
	    res.render('pages/about');
	});

	// setup page 
	app.get('/setup', function(req, res) {
	    res.render('pages/setup', { email: email, authToken: authToken});
	});

	app.post('/setup', urlencodedParser, function(req, res) {
		if (!req.body.user || !req.body.authToken) return res.sendStatus(400)

		authToken = req.body.authToken;
		email = req.body.user;
	    res.render('pages/setup', { email: email, authToken: authToken});

	    MongoClient.connect(dbUrl, { useNewUrlParser: true }, function(err, db) {
		  if (err) throw err;
		  var dbo = db.db(dbName);
		  var myquery = {};
		  var newvalues = { $set: {user: email, authToken: authToken } };
		  dbo.collection(credentialsCollection).updateOne(myquery, newvalues, function(err, res) {
		    if (err) throw err;
		    console.log("1 document updated");
		    db.close();
		  });
		});
	});

	// Projects page
	function getProjects(authToken, callback) {
		request('https://people.zoho.eu/people/api/timetracker/getprojects?authtoken='+authToken, function (error, response, body) {

			if (!error) {
				var json = JSON.parse(body);
				if (!json.response.result) {
					callback( { error: "Something went wrong with the Zoho API request." } );
				} else {
					callback( { projects: json.response.result } );
				}

			} else {
				console.log('error:', error); // Print the error if one occurred
				callback( { error: error } );
			}
		});
	}

	app.get('/projects', function(req, res) {
		if (isJSONRequest(req)) {
			authToken = encodeURIComponent(req.query.authToken) || authToken;

			if (authToken == "") return res.send({ error: "authToken isn't set."});

			getProjects(authToken, function(result) {
				res.send(result);
			});
		} else {
			if (authToken == "") return res.render('pages/projects', { error: "authToken not set, go to /setup first." });

			getProjects(authToken, function(result) {
				res.render('pages/projects', result);
			});
		}
	});

	app.post('/projects', function(req, res) {
		authToken = encodeURIComponent(req.query.authToken) || authToken;

		if (authToken == "") return res.send({ error: "authToken isn't set."});

		getProjects(authToken, function(result) {
			res.send(result);
		});
	});

	// Project page
	function getJobs(authToken, email, projectID, callback) {
		var authToken = encodeURIComponent(authToken);
		var email = encodeURIComponent(email);
		var projectID = encodeURIComponent(projectID);

		request('http://people.zoho.eu/people/api/timetracker/getjobs?authtoken='+authToken+'&assignedTo='+email+'&projectId='+projectID+'&jobStatus=all', function (error, response, body) {

			if (!error) {
				try {
					var json = JSON.parse(body);
				} catch(parseError) {
					return callback( { error: "Something went wrong with parsing the Zoho API response." });
				}

				if (!json.response.result) {
					return callback( { error: "Something went wrong with the Zoho API request." });
				} else {
					return callback( { jobs: json.response.result, 
										projectName: json.response.result[0]["projectName"],
										projectID: projectID });
				}

			} else {
				console.log('error:', error); // Print the error if one occurred
				return callback( { error: error });
			}
		});
	}

	app.get(['/project', '/project/:project'], function(req, res) {
		if (!isJSONRequest(req)) {
			var page = "pages/project";
			if (authToken == "") return res.render(page, { error: "authToken not set, go to /setup first." });
			if (email == "") return res.render(page, { error: "email not set, go to /setup first." });
			if (!req.params.project) return res.render(page, { error: "Project id missing. Go to /project/<ProjectId>." });

			var projectID = req.params.project;

			getJobs(authToken, email, projectID, function(result) {
				res.render(page, result);
			});
		} else {
			authToken = req.query.authToken || authToken;
			email = req.query.user || email;
			var projectID = req.query.projectID || "";

			if (authToken == "") return res.send({ error: "authToken isn't set."});
			if (email == "") return res.send({ error: "user isn't set."});
			if (projectID == "") return res.send({ error: "projetID isn't set."});

			getJobs(authToken, email, projectID, function(result) {
				res.send(result);
			});
		}
	});

	app.post('/project', function(req, res) {
		authToken = req.query.authToken || authToken;
		email = req.query.user || email;
		var projectID = req.query.projectID || "";

		if (authToken == "") return res.send({ error: "authToken isn't set."});
		if (email == "") return res.send({ error: "user isn't set."});
		if (projectID == "") return res.send({ error: "projetID isn't set."});

		getJobs(authToken, email, projectID, function(result) {
			res.send(result);
		});
	});

	app.get('/getjobs', function(req, res) {
		var params = {authToken: (req.query.authToken || authToken),
									email: (req.query.user || email),
									projectID: (req.query.projectID || "")};

		if (params.authToken == "") return res.send({ error: "authToken isn't set."});
		if (params.email == "") return res.send({ error: "user isn't set."});
		if (params.projectID == "") return res.send({ error: "projetID isn't set."});

		getJobs(params.authToken, params.email, params.projectID, function(result) {
			res.send(result);
		});
	});

	// Add timelog
	app.post('/addtimelog', function(req, res) {
		var params = encodeURIObject({authToken: (req.query.authToken || authToken),
									email: (req.query.user || email),
									projectID: (req.query.projectID || ""),
									jobID: (req.query.jobID || ""),
									workDate: (req.query.workDate || ""),
									hours: (req.query.hours || ""),
									billingStatus: (req.query.billingStatus || ""),
									description: (req.query.description || "")});

		if (params.authToken == "") return res.send({ error: "authToken isn't set."});
		if (params.email == "") return res.send({ error: "user isn't set."});
		if (params.projectID == "") return res.send({ error: "projetID isn't set."});
		if (params.jobID == "") return res.send({ error: "jobID isn't set."});
		if (params.workDate == "") return res.send({ error: "workDate isn't set."});
		if (params.hours == "") return res.send({ error: "hours isn't set."});
		if (params.billingStatus == "") return res.send({ error: "billable isn't set."});

		request('https://people.zoho.eu/people/api/timetracker/addtimelog?authtoken='+params.authToken+'&user='+params.email+'&projectId='+params.projectID+'&jobId='+params.jobID+'&workDate='+params.workDate+'&hours='+params.hours+'&billingStatus='+params.billingStatus+'&description='+params.description, 
			function (error, response, body) {

			if (!error) {
				console.log(body);
				var json = JSON.parse(body);
				console.log(json);
				if (!json.response.result) {
					res.send( { error: "Something went wrong with the Zoho API request." });
				} else {
					res.send( { timeLogID: json.response.result[0].timeLogId });
				}

			} else {
				console.log('error:', error); // Print the error if one occurred
				res.send( { error: error });
			}
		});
	});

	// Favourites
	app.post('/add_favourite', jsonParser, function(req, res) {
		console.log(req.body);
		var jobID = req.query.jobID || req.body.jobID;
		var jobName = req.query.jobName || req.body.jobName;
		var projectID = req.query.projectID || req.body.projectID;
		var projectName = req.query.projectName || req.body.projectName;

		if (jobID && jobName && projectID && projectName) {
			MongoClient.connect(dbUrl, { useNewUrlParser: true }, function(err, db) {
				if (err) throw err;
				var dbo = db.db(dbName);
				var myquery = { jobID: jobID };
				var newvalues = { $set: {jobID: jobID, 
										jobName: jobName,
										projectID: projectID,
										projectName: projectName } };
				dbo.collection(favouritesCollection).updateOne(myquery, newvalues, { upsert: true }, function(err, result) {
					if (err) throw err;
					console.log(jobID+" added as favourite.");
					db.close();

					return res.send({status: 200, message: jobID+" added as favourite."});
				});
			});
		} else {
			return res.send({ error: "jobID or jobName isn't set."});
		}
	});

	app.post('/delete_favourite', jsonParser, function(req, res) {
		var jobID = req.query.jobID || req.body.jobID;

		if (jobID) {
			MongoClient.connect(dbUrl, { useNewUrlParser: true }, function(err, db) {
				if (err) throw err;
				var dbo = db.db(dbName);
				var myquery = { jobID: ""+jobID };
				console.log(myquery);
				dbo.collection(favouritesCollection).deleteOne(myquery, function(err, result) {
					if (err) throw err;
					console.log("Deleted "+jobID+".");
					// console.log(result);
					db.close();

					return res.send({status: 200, message: "Deleted "+jobID+"."});
				});
			});
		} else {
			return res.send({ error: "jobID isn't set."});
		}
	});

	app.get('/favourites', function (req, res) {
		MongoClient.connect(dbUrl, { useNewUrlParser: true }, function(err, db) {
			if (err) throw err;
			var dbo = db.db(dbName);

			dbo.collection(favouritesCollection).find({}).toArray(function(err, result) {
				if (err) throw err;
				db.close();

				if (!isJSONRequest(req)) {
					res.render("pages/favourites", {favourites: result});
				} else {
					return res.send(result);
				}
			});
		});
	});

	function encodeURIObject(object) {
		for (var key in object) {
		   if (object.hasOwnProperty(key)) {
				object[key] = encodeURIComponent(object[key]);
		   }
		}

		return object;
	}

	var os = require('os');
	var ifaces = os.networkInterfaces();
	var ifname = 'en0';
	var ip = "192.168.1.?"
	ifaces[ifname].forEach(function (iface) {
	    if ('IPv4' !== iface.family || iface.internal !== false) {
	      // skip over internal (i.e. 127.0.0.1) and non-ipv4 addresses
	      return;
	    }
	    ip = iface.address;
	  });
	// });

	var port = 8080;
	app.listen(port);
	console.log('Listening on: '+ip+':'+port);
}