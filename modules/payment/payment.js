var config = require('../../config');
var Web3 = require('web3');
var web3 = new Web3(config.web3Provider);
var ethers = require('ethers');
var Wallet = ethers.Wallet;
var utils = ethers.utils;
var providers = ethers.providers;
var provider = new providers.JsonRpcProvider(config.web3Provider, config.ethersNetwork);
var aes = require('crypto-js/aes');
var CryptoJS = require('crypto-js');
var mongoose = require('mongoose');
var Transaction = require('../../models/transaction');
var PaymentUtils = require('../../utils/payment');
var BitcoinUtils = require('../../utils/bitcoin');
var bluebird = require('bluebird');
var bitcore = require('bitcore-lib');

function Payment() {}



/*@todo: Maintain nonce counter for each address in db*/
Payment.prototype.ethPayment = function(amount, privateKey, concernedAddress, isConcernedAddressHotWallet, isWithdrawal){
    return new bluebird.Promise(function(resolve, reject){
        var wallet = new ethers.Wallet(aes.decrypt(privateKey, config.secretKey).toString(CryptoJS.enc.Utf8));
        wallet.provider = provider;
        var transaction = {
            to: concernedAddress
        };
        provider.getBalance(wallet.address)
            .then(function(balance){
                if(isConcernedAddressHotWallet)
                    transaction.value = balance;
                else
                    transaction.value = utils.parseEther(amount);
                return wallet.estimateGas(transaction)
            })
            .then(function(gasEstimate) {
                console.log(gasEstimate.toString());
                transaction.gasLimit = gasEstimate;
                if(isConcernedAddressHotWallet)
                    transaction.value = transaction.value - (gasEstimate * 10000000000);
                else
                    transaction.value = utils.bigNumberify(transaction.value).add(utils.bigNumberify(gasEstimate * 10000000000));
                return wallet.sendTransaction(transaction);
            })
            .then(function(transaction) {
                var tx = new Transaction();
                tx.Wallet = transaction.from;
                tx.Currency = "ETH";
                tx.ConcernedAddress = transaction.to;
                tx.Amount = transaction.value;
                tx.Merchant = config.merchant.merchantId;
                tx.Hash = transaction.hash;
                tx.Timestamp = parseInt(Date.now() / 1000);
                tx.Extra = transaction;
                return tx.save();
            })
            .then(function(tx){
                if(isWithdrawal){
                    return provider.waitForTransaction(tx.Hash);
                }
                else{
                    return provider.waitForTransaction(tx.Hash);
                }

            })
            .then(function(transaction){
                resolve(transaction);
            })
            .catch(function(error){
                reject(error);
            })
    })

};

Payment.prototype.erc20Payment = function(amount, privateKey, fromAddress, toAddress, isWithdrawal){
    var wallet = new ethers.Wallet(aes.decrypt(privateKey, config.secretKey).toString(CryptoJS.enc.Utf8));
    wallet.provider = provider;
    console.log(toAddress);
    var availableBalance;
    var erc20Tx = {
        to: config.erc20.contractAddress
    };
    var to = toAddress;
    return new bluebird.Promise(function(resolve, reject) {
        PaymentUtils.getERC20Balance(fromAddress)
            .then(function (balance) {
                erc20Tx.gasLimit = 81000;
                if(isWithdrawal){
                    availableBalance = (parseInt(amount) * Math.pow(10, config.erc20.decimal));
                }
                else{
                    availableBalance = (parseInt(balance));
                }

                erc20Tx.data = String(PaymentUtils.createDataForTokenTransfer(to, availableBalance));
                console.log(erc20Tx);
                return wallet.sendTransaction(erc20Tx);
            })
            .then(function(transaction) {
                var tx = new Transaction();
                tx.Wallet = fromAddress;
                tx.Currency = "ERC20";
                tx.ConcernedAddress = toAddress;
                tx.Amount = availableBalance;
                tx.Merchant = config.merchant.merchantId;
                tx.Hash = transaction.hash;
                tx.Timestamp = parseInt(Date.now() / 1000);
                tx.Extra = transaction;
                return tx.save();
            })
            .then(function(tx){
                if(isWithdrawal){
                    // return tx.Extra
                    return provider.waitForTransaction(tx.Hash);
                }
                else{
                    return provider.waitForTransaction(tx.Hash);
                }
            })
            .then(function(transaction){
                resolve(transaction);
            })
            .catch(function(error){
                reject(error);
            })
    })
};

Payment.prototype.btcPayment = function(amount, privateKey, fromAddress, toAddress){
    var privKey = bitcore.PrivateKey.fromWIF(aes.decrypt(privateKey, config.secretKey).toString(CryptoJS.enc.Utf8));
    var sourceAddress;
    if(config.btc.network === "testnet"){
        sourceAddress = privKey.toAddress(bitcore.Networks.testnet);
    }
    else{
        sourceAddress = privKey.toAddress(bitcore.Networks.livenet);
    }
    console.log(sourceAddress);
    return new bluebird.Promise(function(resolve, reject){
        BitcoinUtils.getUtxos(sourceAddress.toString())
            .then(function(utxos){
                var tx = new bitcore.Transaction().fee(7000);

                tx.from(utxos);
                tx.to(toAddress, amount);
                tx.change(sourceAddress);
                tx.sign(privKey);//aes.decrypt(privateKey, config.secretKey).toString(CryptoJS.enc.Utf8));

                return tx.serialize();
            })
            .then(function(serializedTx){
                return BitcoinUtils.broadcastTx(serializedTx)
            })
            .then(function(res){
                var tx = new Transaction();
                tx.Wallet = sourceAddress.toString();
                tx.Currency = "BTC";
                tx.ConcernedAddress = toAddress;
                tx.Amount = amount.toString();
                tx.Merchant = config.merchant.merchantId;
                tx.Hash = res.toString();
                tx.Timestamp = parseInt(Date.now() / 1000);
                tx.Extra = res;
                return tx.save();
            })
            .then(function(tx){
                resolve(tx.Hash)
            })
            .catch(function(error){
                reject(error);
            })
    })
};

module.exports = new Payment();