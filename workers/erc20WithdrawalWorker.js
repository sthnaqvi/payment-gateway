var Web3 = require('web3');
var cron = require('node-cron');
var config = require('../config');
var mongoose = require('mongoose');
mongoose.Promise = require('bluebird');
var bluebird = require('bluebird');
var web3 = new Web3(config.web3Provider);
var rp = require('request-promise');
var Erc20Withdrawal = require('../models/erc20Withdrawal');
var Payment = require('../modules/payment/payment');
var PaymentUtils = require('../utils/payment');

var updateWithdrawalStatus = function(request, tx){
    return new bluebird.Promise(function(resolve, reject){
        mongoose.model('Erc20Withdrawal').findOneAndUpdate(
            {_id: request._id},
            {$set: {WithdrawalSuccess: true, Extra: tx}}
        )
            .then(function(updatedReq){
                resolve(updatedReq)
            })
            .catch(function(error){
                reject(error)
            })
    })
};

var processWithdrawal = function(withdrawalRequests){
    withdrawalRequests.forEach(function(request){
        //todo : confirm the request before payment
        // console.log(request);
        // console.log(request.WithdrawalAddress);
        // console.log(request.Amount);
        Payment.erc20Payment(request.Amount, config.erc20WithdrawalKey, config.erc20WithdrawalWallet, request.WithdrawalAddress, true)
            .then(function(transaction){
                updateWithdrawalStatus(request, transaction)
            })
            .catch(function(error){
                console.log(error)
            })
    })
};

(function erc20Withdrawal(){
    mongoose.connect(config.db, function(err) {
        if (err) {
            console.log("Mongodb connection error : " + err)
        } else {
            console.log("database connected");
            cron.schedule('*/10 * * * *', function(){
                mongoose.model('Erc20Withdrawal').find({
                    WithdrawalSuccess: false
                }).
                limit(20).
                sort({ Timestamp: 1 })
                    .then(function(withdrawalRequests){
                        console.log(withdrawalRequests);
                        processWithdrawal(withdrawalRequests)
                    })
            });
        }
    });

}());