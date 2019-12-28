module.exports = (db) => {
	// collections
	global.users = db.collection("users");
	global.CACHE_users_subscriptions = db.collection("CACHE_users_subscriptions");
};
