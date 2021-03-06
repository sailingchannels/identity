const express = require("express");
const compress = require("compression");
const jsonfile = require("jsonfile");
const cookieParser = require("cookie-parser");
const bodyParser = require("body-parser");
const mongodb = require("mongodb");
const youtube = require("youtube-api");
const setGlobals = require("./globals");
const package = require("../package.json");
var cors = require("cors");

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

	// CORS
	var whitelist = [
		"http://localhost:4000",
		"https://sailing-channels.com",
		"https://v2.sailing-channels.com",
		undefined
	];
	var corsOptions = {
		origin: function(origin, callback) {
			if (whitelist.indexOf(origin) !== -1) {
				callback(null, true);
			} else {
				console.log("⚠️ rejected cors origin", origin);
				callback(new Error("Not allowed by CORS"));
			}
		},
		credentials: true
	};

	app.use(cors(corsOptions));

	const CREDENTIALS = jsonfile.readFileSync("client_id.json");
	global.credentials = CREDENTIALS;

	const oauthConfig = {
		type: "oauth",
		client_id: CREDENTIALS.web.client_id,
		client_secret: CREDENTIALS.web.client_secret,
		redirect_url:
			tag === "dev" ? CREDENTIALS.web.redirect_uris[1] : CREDENTIALS.web.redirect_uris[2]
	};

	global.oauth = youtube.authenticate(oauthConfig);

	console.log("TAG", tag);
	console.log("OAUTH", oauthConfig);

	app.get("/", (req, res) => {
		return res.end("sailing-channels.com Identity-Service v" + package.version);
	});

	// OAUTH2CALLBACK
	app.get("/oauth2", auth.oauth2);
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
	const db = await mongodb.connect(mongodbHost + "/" + mongodbDatabaseName, {
		reconnectTries: Number.MAX_VALUE,
		reconnectInterval: 1000
	});

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
