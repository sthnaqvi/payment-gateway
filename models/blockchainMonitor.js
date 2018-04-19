var mongoose = require('mongoose');

var blockchainMonitorSchema = new mongoose.Schema({
    key: {
        type: String,
        unique: true
    },
    value:{
        type: String
    }
});

module.exports = mongoose.model('BlockchainMonitor', blockchainMonitorSchema);
