const youtube = require("youtube-api");
const jwt = require("../token");

module.exports = {

	// SUBSCRIBE
	subscribe: function(req, res) {
		var channel = req.body.channel;
		if (!channel) {
			return res.status(400).send({ error: "no channel id provided" });
		}

		// check if request is authenticated
		const jwtPayload = jwt.decode(req.cookies.token);
		if (!jwtPayload) {
			return res.status(401).send({ error: "no permission to perform this operation" });
		}

		const credentials = jwtPayload.credentials;

		// authenticate next request
		global.oauth.setCredentials(credentials);

		// add the subscription
		youtube.subscriptions.insert(
			{
				part: "snippet",
				resource: {
					snippet: {
						resourceId: {
							kind: "youtube#channel",
							channelId: channel
						}
					}
				}
			},
			function(err, data) {
				// handle error like a grown up
				if (err) {
					return res.status(500).send({ error: err });
				}

				// clear cache
				global.CACHE_users_subscriptions.deleteOne({
					_id: credentials.access_token
				});

				return res.send({ error: null, success: true });
			}
		);
	},

	// UNSUBSCRIBE
	unsubscribe: function(req, res) {
		var channel = req.body.channel;
		if (!channel) {
			return res.status(400).send({ error: "no channel id provided" });
		}

		// check if request is authenticated
		const jwtPayload = jwt.decode(req.cookies.token);
		if (!jwtPayload) {
			return res.status(401).send({ error: "no permission to perform this operation" });
		}

		const credentials = jwtPayload.credentials;

		// authenticate next request
		global.oauth.setCredentials(credentials);

		// fetch subscription id
		youtube.subscriptions.list(
			{
				part: "id",
				forChannelId: channel,
				mine: true
			},
			function(err, subs) {
				// handle error like a grown up
				if (err) {
					return res.status(500).send({ error: err });
				}

				// could not find enough results?
				if (subs.pageInfo.totalResults !== 1) {
					return res.status(500).send({ error: "could not find subscription result" });
				}

				// delete the subscription
				youtube.subscriptions.delete(
					{
						id: subs.items[0].id
					},
					function(err, data) {
						// handle error like a grown up
						if (err) {
							return res.status(500).send({ error: err });
						}

						// clear cache
						global.CACHE_users_subscriptions.deleteOne({
							_id: credentials.access_token
						});

						return res.send({ error: null, success: true });
					}
				);
			}
		);
	}
};
