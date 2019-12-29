const moment = require("moment");
const youtube = require("youtube-api");
const jwt = require("../token");

module.exports = {
	// LOGOUT
	logout: function(req, res) {
		res.clearCookie("token");

		const redirectUrl = global.tag !== "dev" ? "sailing-channels.com" : "localhost"
		return res.redirect(301, redirectUrl);
	},

	// OAUTH2
	oauth2: function(req, res) {
		var redirect_to = global.oauth.generateAuthUrl({
			access_type: "offline",
			scope: ["https://www.googleapis.com/auth/youtube.force-ssl"],
			approval_prompt: "force"
		});

		return res.redirect(301, redirect_to);
	},

	// OAUTH2CALLBACK
	oauth2callback: function(req, res) {

		// get a token
		global.oauth.getToken(req.query.code, function(err, credentials) {
			if (err) {
				return res.status(400).send(err);
			}

			// authenticate next request
			global.oauth.setCredentials(credentials);

			youtube.channels.list(
				{
					part: "id,snippet",
					mine: true
				},
				function(err, data) {
					// store user information
					if (!err && data && data.items.length > 0) {
						var info = {
							lastLogin: moment.utc().toDate(),
							title: data.items[0].snippet.title,
							thumbnail: data.items[0].snippet.thumbnails.default.url,
							country:
								"country" in data.items[0].snippet
									? data.items[0].snippet.country.toLowerCase()
									: null,
							credentials: credentials
						};

						global.users.updateOne(
							{
								_id: data.items[0].id
							},
							{
								$set: info
							},
							{
								upsert: true
							}
						);

						var inAYear = moment()
							.add(1, "year")
							.toDate();

						info._id = data.items[0].id;

						// generate JWT
						const signedToken = jwt.encode(info);

						// keep credentials
						res.cookie("token", signedToken, {
							secure: global.tag !== "dev",
							expires: inAYear,
							domain: global.tag !== "dev" ? ".sailing-channels.com" : "localhost",
							sameSite: global.tag !== "dev"
						});
					}

					const redirectUrl = global.tag !== "dev" ? "https://sailing-channels.com" : "http://localhost:4000";
					return res.redirect(301, redirectUrl);
				}
			);
		});
	}
};
