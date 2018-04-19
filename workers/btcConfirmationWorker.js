var cron = require('node-cron');
var config = require('../config');
var mongoose = require('mongoose');
mongoose.Promise = require('bluebird');
var bluebird = require('bluebird');
var Invoice = require('../models/invoice');
var Payment = require('../modules/payment/payment');
var BitcoinUtils = require('../utils/bitcoin');
var rp = require('request-promise');

var hitWebHook = function(invoice){
    return new bluebird.Promise(function(resolve, reject){
        reqBody = {
            "amount": invoice.AmountReceived,
            "status": invoice.Status,
            "paymentId": invoice._id
        };
        options = {
            url: invoice.NotifyUrl,
            method: "POST",
            json: true,
            body: reqBody
        };
        rp(options)
            .then(function(body){
                console.log(body);
                resolve(true)
            })
            .catch(function(error){
                resolve(false);
            })

    })
};

var updateInvoiceStatus = function(invoice, status){
    return new bluebird.Promise(function(resolve, reject){
        mongoose.model('Invoice').findOneAndUpdate(
            {_id: invoice['_id']},
            {$set:{Status:status}})
            .then(function(foundInvoice){
                console.log(foundInvoice._id + " updated to " + status);
                resolve(true)
            })
            .catch(function(err){
                reject(err)
            })
    })
};

var updateWebhookHitStatus = function(invoice, status){
    return new bluebird.Promise(function(resolve, reject){
        mongoose.model('Invoice').findOneAndUpdate(
            {_id: invoice['_id']},
            {$set:{NotifyUrlHitSuccess:status}})
            .then(function(foundInvoice){
                console.log(foundInvoice._id + " updated to " + status);
                resolve(true)
            })
            .catch(function(err){
                reject(err)
            })
    })
};

var amountReceivedAndBlockConfirmationCheck = function(invoice, blockNumber){
    if(parseFloat(invoice.AmountReceived) >= parseFloat(invoice.Amount)){
        if((blockNumber - invoice.BlockIncluded) >= invoice.BlockConfirmation){
            return true
        }
        else{
            return false
        }
    }
    else{
        return false
    }
};

var getPayStatus = function(invoice){
    if(parseFloat(invoice.AmountReceived) === parseFloat(invoice.Amount)){
        return "paid"
    }
    else if(parseFloat(invoice.AmountReceived) > parseFloat(invoice.Amount)){
        return "overpaid"
    }
    else{
        return "underpaid"
    }
};

var processBlock = function(blockNumber){
    mongoose.model('Invoice').find({
        Currency: "BTC",
        // Status: "processing"
        NotifyUrlHitSuccess: false
    })
        .then(function(invoices){
            invoices.forEach(function(invoice){
                if(amountReceivedAndBlockConfirmationCheck(invoice, blockNumber)){
                    // hit webhook and update invoice status
                    updateInvoiceStatus(invoice, getPayStatus(invoice))
                        .then(function(success){
                            if(success){
                                return BitcoinUtils.getBalanceOfAddress(invoice.Wallet.Address)
                            }
                        })
                        .then(function(data){
                            if(data['balanceSat'] > 70000){
                                return Payment.btcPayment(data['balanceSat'] - 70000, invoice.Wallet.PrivateKey, invoice.Wallet.Address, config.btcColdWalletAddress)
                            }
                            else{
                                return true
                            }
                        })
                        .then(function(success){
                            if(success){
                                return hitWebHook(invoice)
                            }
                        })
                        .then(function(success){
                            console.log("webhook hit success");
                            updateWebhookHitStatus(invoice, true);
                        })
                        .catch(function(error){
                            console.log(error);
                        })
                }
            })
        })
};

(function blockConfirmationMonitor(){
    mongoose.connect(config.db, function(err) {
        if (err) {
            console.log("Mongodb connection error : " + err)
        } else {
            console.log("database connected");
            var lastBlock = 0;
            cron.schedule('*/1 * * * *', function(){
                BitcoinUtils.getCurrentBlock()
                    .then(function(currentBlock){
                        processBlock(currentBlock.height)
                    })
            });
        }
    });

}());