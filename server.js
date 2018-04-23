// server.js
var express = require('express');
var bodyParser = require('body-parser');
var request = require('request');

var app = express();

// set the view engine to ejs
app.set('view engine', 'ejs');

// create application/json parser
var jsonParser = bodyParser.json()
 
// create application/x-www-form-urlencoded parser
var urlencodedParser = bodyParser.urlencoded({ extended: false })

var authToken = "2e40ac7bbae44fce1a9a94978c143379"
var email = "tim.colla@marinosoftware.com"

// index page 
app.get('/', function(req, res) {
    res.render('pages/index');
});

// about page 
app.get('/about', function(req, res) {
    res.render('pages/about');
});

// setup page 
app.get('/setup', function(req, res) {
    res.render('pages/setup', { email: email, authtoken: authToken});
});

app.post('/setup', urlencodedParser, function(req, res) {
	if (!req.body.email || !req.body.authtoken) return res.sendStatus(400)

	authToken = req.body.authtoken;
	email = req.body.email;
    res.render('pages/setup', { email: email, authtoken: authToken});
});

// Projects page
function getProjects(authToken, callback) {
	request('https://people.zoho.eu/people/api/timetracker/getprojects?authtoken='+authToken, function (error, response, body) {

		if (!error) {
			var json = JSON.parse(body);
			console.log(json);
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
	if (authToken == "") return res.render('pages/projects', { error: "authToken not set, go to /setup first." });

	getProjects(authToken, function(result) {
		res.render('pages/projects', result);
	});
});

app.post('/projects', function(req, res) {
	if (req.query.authToken) {
		authToken = req.query.authToken;
	} 
	if (authToken == "") return res.send({ error: "Auth token isn't set."});

	getProjects(authToken, function(result) {
		res.send(result);
	});
});

// Project page
function getJobs(authToken, email, projectID, callback) {
	request('http://people.zoho.eu/people/api/timetracker/getjobs?authtoken='+authToken+'&assignedTo='+email+'&projectId='+projectID+'&jobStatus=all', function (error, response, body) {

		if (!error) {
			console.log(body);
			var json = JSON.parse(body);
			console.log(json);
			if (!json.response.result) {
				callback( { error: "Something went wrong with the Zoho API request." });
			} else {
				callback( { jobs: json.response.result, projectName: json.response.result[0]["projectName"] });
			}

		} else {
			console.log('error:', error); // Print the error if one occurred
			callback( { error: error });
		}
	});
}

app.get(['/project', '/project/:project'], function(req, res) {
	var page = "pages/project";
	if (authToken == "") return res.render(page, { error: "authToken not set, go to /setup first." });
	if (!req.params.project) return res.render(page, { error: "Project id missing. Go to /project/<ProjectId>." });

	var projectID = req.params.project;

	getJobs(authToken, email, projectID, function(result) {
		res.render(page, result);
	});
});

app.post('/project', function(req, res) {
	var projectID = "";
	if (req.query.authToken) {
		authToken = req.query.authToken;
	} 
	if (req.query.email) {
		email = req.query.email;
	}
	if (req.query.projectID) {
		projectID = req.query.projectID;
	}
	if (authToken == "") return res.send({ error: "Auth token isn't set."});
	if (email == "") return res.send({ error: "Email isn't set."});
	if (projectID == "") return res.send({ error: "Project isn't set."});

	getJobs(authToken, email, projectID, function(result) {
		res.send(result);
	});
});

// Add timelog
app.post('/addtimelog', function(req, res) {
	authToken = encodeURIComponent(req.query.authToken) || "";
	email = encodeURIComponent(req.query.user) || "";
	var projectID = encodeURIComponent(req.query.projectID) || "";
	var jobID = encodeURIComponent(req.query.jobID) || "";
	var workDate = encodeURIComponent(req.query.workDate) || "";
	var hours = encodeURIComponent(req.query.hours) || "";
	var billingStatus = encodeURIComponent(req.query.billingStatus) || "";
	var description = encodeURIComponent(req.query.description) || "";

	if (authToken == "") return res.send({ error: "Auth token isn't set."});
	if (email == "") return res.send({ error: "Email isn't set."});
	if (projectID == "") return res.send({ error: "projetID isn't set."});
	if (jobID == "") return res.send({ error: "jobID isn't set."});
	if (workDate == "") return res.send({ error: "workDate isn't set."});
	if (hours == "") return res.send({ error: "hours isn't set."});
	if (billingStatus == "") return res.send({ error: "billable isn't set."});
console.log(description);
	request('https://people.zoho.eu/people/api/timetracker/addtimelog?authtoken='+authToken+'&user='+email+'&projectId='+projectID+'&jobId='+jobID+'&workDate='+workDate+'&hours='+hours+'&billingStatus='+billingStatus+'&description='+description, function (error, response, body) {

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

// POST /api/users gets JSON bodies
app.post('/api/users', jsonParser, function (req, res) {
  if (!req.body) return res.sendStatus(400)
  // create user in req.body
})

// var request = require('request');
// request('https://people.zoho.eu/people/api/timetracker/getprojects?authtoken=2e40ac7bbae44fce1a9a94978c143379', function (error, response, body) {
//   console.log('error:', error); // Print the error if one occurred
//   console.log('statusCode:', response && response.statusCode); // Print the response status code if a response was received
//   console.log('body:', body); // Print the HTML for the Google homepage.

//   var json = JSON.parse(body);
//   console.log(json);
// });

app.listen(8080);
console.log('8080 is the magic port');