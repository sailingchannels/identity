const express = require("express");
const compress = require("compression");
const jsonfile = require("jsonfile");
const cookieParser = require("cookie-parser");
const bodyParser = require("body-parser");
const mongodb = require("mongodb");
const youtube = require("youtube-api");
const setGlobals = require("./globals");
const package = require("../package.json");

const argv = require("./argv");
const port = require("./port");
const logger = require("./logger");

const me = require("./handler/me");
const auth = require("./handler/auth");
const channel = require("./handler/channel");

const tag = process.env.TAG || "dev";
global.tag = tag;

(async () => {
	var app = express();

	app.use(bodyParser.json());
	app.use(cookieParser());
	app.use(compress());
	app.use(
		bodyParser.urlencoded({
			extended: false
		})
	);
	app.use(function(req, res, next) {
		// add tag to response
		res.set("X-Version", package.version);
		next();
	});

	const CREDENTIALS = jsonfile.readFileSync("client_id.json");
	global.oauth = youtube.authenticate({
		type: "oauth",
		client_id: CREDENTIALS.web.client_id,
		client_secret: CREDENTIALS.web.client_secret,
		redirect_url:
			tag === "dev" ? CREDENTIALS.web.redirect_uris[1] : CREDENTIALS.web.redirect_uris[0]
	});

	app.get("/", (req, res) => {
		return res.end("sailing-channels.com Identity-Server v" + package.version);
	})

	// OAUTH2CALLBACK
	app.get("/oauth2callback", auth.oauth2callback);

	// LOGOUT
	app.get("/logout", auth.logout);

	// API / ME
	app.get("/api/me/subscriptions", me.subscriptions);

	// API / CHANNEL
	app.post("/api/channel/subscribe", channel.subscribe);
	app.post("/api/channel/unsubscribe", channel.unsubscribe);

	var mongodbDatabaseName = "sailing-channels";
	var mongodbHost = process.env.MONGODB || "mongodb://localhost:27017";

	// mongodb connect
	const db = await mongodb.connect(mongodbHost + "/" + mongodbDatabaseName);

	// set collection globals
	setGlobals(db);

	// get the intended host and port number, use localhost and port 3000 if not provided
	const customHost = argv.host || process.env.HOST;
	const host = customHost || null; // Let http.Server use its default IPv6/4 host
	const prettyHost = customHost || "localhost";

	// Start your app.
	app.listen(port, host, (err) => {
		if (err) {
			return logger.error(err.message);
		}

		logger.appStarted(port, prettyHost);
	});
})();
