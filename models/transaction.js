var mongoose = require('mongoose');
var uuid = require('uuid/v4');

var transactionSchema = new mongoose.Schema({
    _id: {
        type: String,
        default: uuid
    },
    Wallet: {
        type: String,
        required: true
    },
    Currency: {
        type: String,
        required: true
    },
    ConcernedAddress: {
        type: String,
        required: true
    },
    Amount: {
        type: String,
        required: true
    },
    Merchant: {
        type: String,
        required: true
    },
    Hash:{
        type: String,
        required: true
    },
    Timestamp: Number,
    Extra: {}
});


module.exports = mongoose.model('Transaction', transactionSchema);