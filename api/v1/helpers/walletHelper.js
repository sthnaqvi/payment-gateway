var ethers = require('ethers');
var config = require('./../../../config');
var PaymentUtils = require('./../../../utils/payment');
var utils = ethers.utils;
var providers = ethers.providers;
var provider = new providers.JsonRpcProvider(config.web3Provider, config.ethersNetwork);
var aes = require('crypto-js/aes');
var winston = require('winston');
var bluebird = require('bluebird');
var bitcoinjsLib = require('bitcoinjs-lib');
var bitcore = require('bitcore-lib');

function Helper() {
}

Helper.prototype.generateWallet = function (data, callback) {
    var tempWallet;
    if (data['walletType'] === "BTC") {
        var privKey, publicKey, address;
        if (config.btc.network === "livenet") {
            privKey = new bitcore.PrivateKey(bitcore.Networks.livenet);
            publicKey = privKey.toPublicKey();
            address = publicKey.toAddress(bitcore.Networks.livenet);
        }
        else {
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

Helper.prototype.getERC20Details = function (contractAddress, callback) {
    if (!contractAddress)
        return callback(Error("contractAddress cannot be null"), null);

    let contract = new ethers.Contract(contractAddress, PaymentUtils.abi, provider);

    let token = {};
    contract.totalSupply()
        .then((totalSupply) => {
            if (totalSupply !== '0')
                token.totalSupply = totalSupply;
            //sample eth address to check contract have valid balanceOf function
            return contract.balanceOf('0xbe76Bc7079B2207932705594bA4F8e5a1BA7545F')
        })
        .then(() => {
            return contract.decimals();
        })
        .then((decimals) => {
            if (decimals !== '0')
                token.decimals = decimals;
            return contract.name();
        })
        .then((name) => {
            if (name !== '0')
                token.name = name;
            return contract.symbol();
        })
        .then((symbol) => {
            if (symbol !== '0')
                token.symbol = symbol;
            if (Object.keys(token).length && token['decimals']) {
                return callback(null, token);
            }
            else callback(Error("contractAddress is not a valid ERC20 token"), null);
        })
        .catch((err) => {
            if (err.message !== "invalid bytes") {
                console.log(err);
                console.log(contractAddress + " - " + err);
                return callback(err);
            }
            if (Object.keys(token).length && token['decimals']) {
                return callback(null, token);
            }
            else callback(Error("contractAddress is not a valid ERC20 token"), null);
        });
};

module.exports = new Helper();
