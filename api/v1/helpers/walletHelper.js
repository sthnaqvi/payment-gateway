var ethers = require('ethers');
var config = require('./../../../config');
var aes = require('crypto-js/aes');
var winston = require('winston');
var bluebird = require('bluebird');
var bitcoinjsLib = require('bitcoinjs-lib');
var bitcore = require('bitcore-lib');

function Helper() {}

Helper.prototype.generateWallet = function(data, callback) {
    var tempWallet;
    if (data['walletType'] === "BTC") {
        var privKey, publicKey, address;
        if(config.btc.network === "livenet"){
            privKey = new bitcore.PrivateKey(bitcore.Networks.livenet);
            publicKey = privKey.toPublicKey();
            address = publicKey.toAddress(bitcore.Networks.livenet);
        }
        else{
            privKey = new bitcore.PrivateKey(bitcore.Networks.testnet);
            publicKey = privKey.toPublicKey();
            address = publicKey.toAddress(bitcore.Networks.testnet);
        }
        tempWallet = {
            privateKey: aes.encrypt(privKey.toWIF(), config.secretKey).toString(),
            publicKey: publicKey.toString(),
            address: address.toString()
        };

        callback(null, tempWallet)
    }
    else {
        var Wallet = ethers.Wallet;
        var mnemonic = ethers.HDNode.entropyToMnemonic(ethers.utils.randomBytes(16));
        var wallet = Wallet.fromMnemonic(mnemonic);
        tempWallet = {
            privateKey: aes.encrypt(wallet.privateKey, config.secretKey).toString(),
            address: wallet.address
        };
        callback(null, tempWallet)
    }
};

module.exports = new Helper();
