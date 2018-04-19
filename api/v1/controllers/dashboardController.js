var Transaction = require('./../../../models/transaction');
var Invoice = require('./../../../models/invoice');
var BlockchainMonitor = require('./../../../models/blockchainMonitor');
var url = require('url');

function Controller() {}

Controller.prototype.allInvoices = function(req, res){
    // console.log(url.parse(req.url,true).query);
    // console.log(url.parse(req.url,true).query['skip']);
    // console.log(url.parse(req.url,true).query['limit']);
    Invoice.find({}).select('-Wallet.PrivateKey')
        .then(function(invoices){
            res.status(200).json({
                "success": true,
                "data": invoices
            });
        })
        .catch(function(error){
            console.log(error);
            res.status(400).json({
                "success": false
            });
        })
};

Controller.prototype.invoiceTxDetail = function(req, res){
    var invoiceId = req.params.id;
    if(invoiceId === null || invoiceId === ""){
        res.status(400).json({
            "success": false,
            "message": "valid invoice id required"
        });
    }
    Invoice.findOne({_id:invoiceId})
        .then(function(invoice){
            return Transaction.find({ $or: [{Wallet: invoice.Wallet.Address},{ConcernedAddress: invoice.Wallet.Address}]})
        })
        .then(function(data){
            res.status(200).json({
                "success": true,
                "transactions": data
            });
        })
        .catch(function(error){
            res.status(400).json({
                "success": false,
                "message": error
            });
        })
};

Controller.prototype.blockMonitor = function(req, res){
    BlockchainMonitor.find({})
        .then(function(data){
            res.status(200).json({
                "success": true,
                "data": data
            });
        })
        .catch(function(error){
            console.log(error);
            res.status(400).json({
                "success": false
            });
        })
};

module.exports = new Controller();