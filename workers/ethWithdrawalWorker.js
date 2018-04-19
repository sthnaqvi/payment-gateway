var cron = require('node-cron');
var config = require('../config');
var mongoose = require('mongoose');
mongoose.Promise = require('bluebird');
var bluebird = require('bluebird');
var EthWithdrawal = require('../models/ethWithdrawal');
var Payment = require('../modules/payment/payment');

var updateWithdrawalStatus = function(request, tx){
    return new bluebird.Promise(function(resolve, reject){
        mongoose.model('EthWithdrawal').findOneAndUpdate(
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
        Payment.ethPayment(request.Amount, config.ethHotWalletKey, request.WithdrawalAddress, false, true)
            .then(function(transaction){
                updateWithdrawalStatus(request, transaction)
            })
            .catch(function(error){
                console.log(error)
            })
    })
};

(function ethWithdrawal(){
    mongoose.connect(config.db, function(err) {
        if (err) {
            console.log("Mongodb connection error : " + err)
        } else {
            console.log("database connected");
            cron.schedule('*/1 * * * *', function(){
                mongoose.model('EthWithdrawal').find({
                    WithdrawalSuccess: false
                }).
                limit(1).
                sort({ Timestamp: 1 })
                    .then(function(withdrawalRequests){
                        console.log(withdrawalRequests);
                        processWithdrawal(withdrawalRequests)
                    })
            });
        }
    });

}());