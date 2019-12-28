var moment = require("moment");
var async = require("async");
var youtube = require("youtube-api");
const jwt = require("../token");

module.exports = {
	// SUBSCRIPTIONS
	// reads all subscriptions of the currently authenticated user
	subscriptions: function(req, res) {
		const jwtPayload = jwt.decode(req.cookies.token);
		if (!jwtPayload) {
			return res.status(401).send({ error: "no permission to perform this operation" });
		}

		const credentials = jwtPayload.credentials;

		// read subscriptions
		module.exports.readSubscriptions(credentials, function(err, subs) {
			if (err) {
				return res.status(500).send({ error: err });
			}

			return res.send(subs || []);
		});
	},

	// READ SUBSCRIPTIONS
	readSubscriptions: function(credentials, done) {
		// authenticate next request
		global.oauth.setCredentials(credentials);

		var lastResult = null;
		var subscriptions = [];

		// check if cache is available
		global.CACHE_users_subscriptions.findOne(
			{
				_id: credentials.access_token
			},
			function(err, cached_subs) {
				// found cached subscriptions
				if (!err && cached_subs) {
					return done(null, cached_subs.subscriptions);
				}

				// loop multiple pages
				async.doWhilst(
					function(callback) {
						var query = {
							part: "id,snippet",
							mine: true,
							maxResults: 50
						};

						// add next page token if available
						if (lastResult && lastResult.nextPageToken) {
							query.pageToken = lastResult.nextPageToken;
						}

						// read own subscriptions
						youtube.subscriptions.list(query, function(err, data) {
							if (err) {
								return callback(err);
							}

							// store last result
							if (data) {
								lastResult = data;

								var items = data.items.map(function(item) {
									// only take channel ids
									if (item.snippet.resourceId.kind === "youtube#channel") {
										return item.snippet.resourceId.channelId;
									}
								});

								subscriptions = subscriptions.concat(items);
								return callback(null, true);
							}
						});
					},
					function() {
						return lastResult.nextPageToken;
					},
					function(err, results) {
						// cache subscriptions
						global.CACHE_users_subscriptions.updateOne(
							{
								_id: credentials.access_token
							},
							{
								$set: {
									subscriptions: subscriptions,
									stored: moment.utc().toDate()
								}
							},
							{
								upsert: true
							}
						);

						// all processed subscription ids
						return done(err, subscriptions);
					}
				);
			}
		);
	}
};
