var mongoose = require('mongoose');
var uuid = require('uuid/v4');

var invoiceSchema = new mongoose.Schema({
    _id: {
        type: String,
        default: uuid
    },
    MerchantId: {
        type: String,
        required: true
    },
    Currency: {
        type: String,
        required: true
    },
    Amount: {
        type: String,
        required: true
    },
    AmountReceived: {
        type: String,
        default: "0"
    },
    Fee: {
        type: String,
        default: "0"
    },
    Timestamp: Number,
    Wallet: {
        Address: {
            type: String,
            required: true
        },
        PrivateKey: {
            type: String,
            required: true
        },
        PublicKey: {
            type: String
        },
        ContractAddress: {
            type: String
        },
        TokenDecimals: {
            type: Number
        },
        TokenSymbol: {
            type: String
        }

    },
    BlockConfirmation: {
        type: Number,
        default: 1
    },
    BlockIncluded: {
        type: Number
    },
    NotifyUrl: {
        type: String
    },
    NotifyUrlHitSuccess: {
        type: Boolean,
        default: false
    },
    Status: {
        type: String,
        default: "unverified" //can be unverified || processing || underpaid || paid || overpaid || timeout
    },
    ColdWalletTransferStatus: {
        type: String,
        default: "pending"
    },
    InvoiceExtra: []
});


module.exports = mongoose.model('Invoice', invoiceSchema);