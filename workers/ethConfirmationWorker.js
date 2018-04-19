var Web3 = require('web3');
var cron = require('node-cron');
var config = require('../config');
var mongoose = require('mongoose');
mongoose.Promise = require('bluebird');
var bluebird = require('bluebird');
var web3 = new Web3(config.web3Provider);
var rp = require('request-promise');
var Invoice = require('../models/invoice');
var payment = require('../modules/payment/payment');
var PaymentUtils = require('../utils/payment');


/*@Purpose:
*
*
*
* */

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

var updateInvoiceStatusAndTx = function(invoice, status){
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

var processBlock = function(blockNumber){
    mongoose.model('Invoice').find({
        Currency: {$in: ['ETH', 'ERC20']},
        // Timestamp: { $gt: (parseInt(Date.now()/1000) - 3600) },
        // Status: 'processing'//{$in: ['unverified','processing']}
        NotifyUrlHitSuccess: false
    })
        .then(function(invoices){
            // console.log(invoices);
            invoices.forEach(function(invoice){
                if(invoice.Currency === "ETH"){
                    if(parseFloat(invoice.AmountReceived) >= parseFloat(invoice.Amount) && (blockNumber - invoice.BlockIncluded) > invoice.BlockConfirmation){
                        //set status to paid and hit webhook
                        updateInvoiceStatusAndTx(invoice, "paid")
                            .then(function(success){
                                console.log("transferring amount to cold wallet");
                                return true
                                // return hitWebHook(invoice)
                            })
                            .then(function(txHash){

                                console.log(txHash);
                                return hitWebHook(invoice)
                            })
                            .then(function(webhookSuccess){
                                if(webhookSuccess){
                                    // transfer amount to cold wallet
                                    updateWebhookHitStatus(invoice, true);
                                    // console.log("transferring amount to cold wallet");
                                    // payment.ethPayment(invoice.Amount, invoice.Wallet.PrivateKey, config.ethColdWalletAddress, true, false);
                                }
                            })
                            .catch(function(error){
                                console.log(error);
                            })
                    }
                }
                else{
                    if(parseFloat(invoice.AmountReceived) >= parseFloat(invoice.Amount) && (blockNumber - invoice.BlockIncluded) > invoice.BlockConfirmation){
                        //set status to paid and hit webhook
                        updateInvoiceStatusAndTx(invoice, "paid")
                            .then(function(success){
                                // console.log("transferring amount to cold wallet");
                                // return payment.erc20Payment(balance, invoice.Wallet.PrivateKey, invoice.Wallet.Address, config.ethColdWalletAddress);
                                // return hitWebHook(invoice)
                                return true
                            })
                            .then(function(txHash){

                                console.log(txHash);
                                return hitWebHook(invoice)
                            })
                            .then(function(webhookSuccess){
                                if(webhookSuccess){
                                    // transfer amount to cold wallet
                                    console.log("webhook hit success");
                                    updateWebhookHitStatus(invoice, true);
                                }
                            })
                            .catch(function(error){
                                console.log(error);
                            })
                    }
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
            cron.schedule('*/5 * * * * *', function(){
                web3.eth.getBlockNumber()
                    .then(function(currentBlockNumber){
                        console.log("last block : " + lastBlock.toString());
                        console.log("current block : " + currentBlockNumber.toString());
                        if(lastBlock < currentBlockNumber){
                            lastBlock = currentBlockNumber;
                            console.log("processing : " + lastBlock.toString());
                            processBlock(currentBlockNumber);
                        }
                        else{
                            console.log(lastBlock.toString() + " already watched")
                        }
                    })
                    .catch(function(error){
                        console.log(error);
                    })
            });
        }
    });

}());