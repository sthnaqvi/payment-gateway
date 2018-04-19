var config = require('./../../../config');
var PaymentUtils = require('./../../../utils/payment');
var Payment = require('./../../../modules/payment/payment');
var web3 = require('web3');
var ethers = require('ethers');
var utils = ethers.utils;
var Erc20Withdrawal = require('./../../../models/erc20Withdrawal');
var EthWithdrawal = require('./../../../models/ethWithdrawal');

function Controller() {}

Controller.prototype.btcBalance = function(req, res){
    var address = req.params.address.toString();
    PaymentUtils.getBTCBalance(address)
        .then(function(response){
            res.status(200).json({
                "success": true,
                "address": address,
                "balance": response['balance'].toString(),
                "balanceSat": response['balanceSat'].toString()
            });
        })
        .catch(function(error){
            res.status(400).json({
                "success": false,
                "message": error
            });
        })
};

Controller.prototype.ethBalance = function(req, res){
    var address = req.params.address.toString();
    console.log(address);
    if(web3.utils.isAddress(address)){
        PaymentUtils.getEtherBalance(address)
            .then(function(balance){
                console.log(balance);
                res.status(200).json({
                    "success": true,
                    "address": address,
                    "balance": utils.formatEther(balance)
                });
            })
    }
    else{
        res.status(400).json({
            "success": false,
            "message": "invalid ethereum address"
        });
    }
};

Controller.prototype.erc20Balance = function(req, res){
    var address = req.params.address;
    console.log(address);
    if(web3.utils.isAddress(address)){
        PaymentUtils.getERC20Balance(address)
            .then(function(balance){
                res.status(200).json({
                    "success": true,
                    "address": address,
                    "balance": parseFloat(balance) / Math.pow(10, config.erc20.decimal)
                });
            })
    }
    else{
        res.status(400).json({
            "success": false,
            "message": "invalid erc20 address"
        });
    }

};

Controller.prototype.btcWithdraw = function(req, res){
    var amount = req.body.amount;
    var withdrawalAddress = req.body.withdrawalAddress;
    if(parseFloat(amount) <= 0 || isNaN(amount)){
        res.status(400).json({
            "success": false,
            "message": "valid amount is required"
        });
    }
    Payment.btcPayment(parseInt(amount), config.btcHotWalletKey, config.btcHotWalletAddress, withdrawalAddress, true)
        .then(function(tx){
            res.status(200).json({
                "success": true,
                "tx": tx
            });
        })
};

Controller.prototype.ethWithdraw = function(req, res){
    var amount = req.body.amount;
    var withdrawalAddress = req.body.withdrawalAddress;
    if(parseFloat(amount) <= 0 || isNaN(amount)){
        res.status(400).json({
            "success": false,
            "message": "valid amount is required"
        });
    }
    if(web3.utils.isAddress(withdrawalAddress)){
        var ethWithdrawal = new EthWithdrawal();
        ethWithdrawal.Amount = amount;
        ethWithdrawal.WithdrawalAddress = withdrawalAddress;
        ethWithdrawal.Timestamp = parseInt(Date.now() / 1000);
        ethWithdrawal.save()
            .then(function(savedWithdrawRequest){
                console.log(savedWithdrawRequest);
                res.status(200).json({
                    "requestId": savedWithdrawRequest._id,
                    "withdrawalAddress": savedWithdrawRequest.WithdrawalAddress,
                    "amount": savedWithdrawRequest.Amount
                });
            })
            .catch(function(error){
                res.status(400).json(error)
            })
    }
    else{
        res.status(400).json({
            "success": false,
            "message": "invalid withdrawal address"
        });
    }
};

Controller.prototype.erc20Withdraw = function(req, res){
    var amount = req.body.amount;
    var withdrawalAddress = req.body.withdrawalAddress;
    if(parseFloat(amount) <= 0 || isNaN(amount)){
        res.status(400).json({
            "success": false,
            "message": "valid amount is required"
        });
    }
    if(web3.utils.isAddress(withdrawalAddress)){
        var erc20Withdrawal = new Erc20Withdrawal();
        erc20Withdrawal.Amount = amount;
        erc20Withdrawal.WithdrawalAddress = withdrawalAddress;
        erc20Withdrawal.Timestamp = parseInt(Date.now() / 1000);
        erc20Withdrawal.save()
            .then(function(savedWithdrawRequest){
                console.log(savedWithdrawRequest);
                res.status(200).json({
                    "requestId": savedWithdrawRequest._id,
                    "withdrawalAddress": savedWithdrawRequest.WithdrawalAddress,
                    "amount": savedWithdrawRequest.Amount
                });
            })
            .catch(function(error){
                res.status(400).json(error)
            })
    }
    else{
        res.status(400).json({
            "success": false,
            "message": "invalid withdrawal address"
        });
    }
};

module.exports = new Controller();