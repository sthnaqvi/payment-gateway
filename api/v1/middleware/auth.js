var config = require('../../../config');

exports.auth = function (req, res, next) {
    var token = req.headers['access-token'];
    if (!token)
        return res.status(400).json({"message": "'access-token' is not in request header"});
    if (token === config.merchant.apiKey) {
        next();
    }
    else {
        res.status(401).json({"message": "unauthorized"})
    }
};