const jwt = require("jsonwebtoken");

const JWT_SECRET = process.env.JWT_SECRET;

module.exports = {
	decode: function(token) {
		if (!token) return null;
		return jwt.verify(token, JWT_SECRET);
	},

	encode: function(payload) {
		return jwt.sign(payload, JWT_SECRET);
	}
};
