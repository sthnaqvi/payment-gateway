var config = require('../config');
var ethers = require('ethers');
var utils = ethers.utils;
var providers = ethers.providers;
var provider = new providers.JsonRpcProvider(config.web3Provider, config.ethersNetwork);
var rp = require('request-promise');
var bluebird = require('bluebird');

function PaymentUtils() {}

module.exports.abi = abi = [
    {
        "constant": true,
        "inputs": [],
        "name": "name",
        "outputs": [{"name": "", "type": "string"}],
        "payable": false,
        "type": "function"
    }, {
        "constant": false,
        "inputs": [{"name": "_spender", "type": "address"}, {"name": "_value", "type": "uint256"}],
        "name": "approve",
        "outputs": [{"name": "success", "type": "bool"}],
        "payable": false,
        "type": "function"
    }, {
        "constant": true,
        "inputs": [],
        "name": "totalSupply",
        "outputs": [{"name": "", "type": "uint256"}],
        "payable": false,
        "type": "function"
    }, {
        "constant": false,
        "inputs": [{"name": "_from", "type": "address"}, {"name": "_to", "type": "address"}, {
            "name": "_value",
            "type": "uint256"
        }],
        "name": "transferFrom",
        "outputs": [{"name": "success", "type": "bool"}],
        "payable": false,
        "type": "function"
    }, {
        "constant": true,
        "inputs": [],
        "name": "decimals",
        "outputs": [{"name": "", "type": "uint8"}],
        "payable": false,
        "type": "function"
    }, {
        "constant": true,
        "inputs": [],
        "name": "standard",
        "outputs": [{"name": "", "type": "string"}],
        "payable": false,
        "type": "function"
    }, {
        "constant": true,
        "inputs": [{"name": "", "type": "address"}],
        "name": "balanceOf",
        "outputs": [{"name": "", "type": "uint256"}],
        "payable": false,
        "type": "function"
    }, {
        "constant": true,
        "inputs": [],
        "name": "owner",
        "outputs": [{"name": "", "type": "address"}],
        "payable": false,
        "type": "function"
    }, {
        "constant": true,
        "inputs": [],
        "name": "symbol",
        "outputs": [{"name": "", "type": "string"}],
        "payable": false,
        "type": "function"
    }, {
        "constant": false,
        "inputs": [{"name": "_to", "type": "address"}, {"name": "_value", "type": "uint256"}],
        "name": "transfer",
        "outputs": [],
        "payable": false,
        "type": "function"
    }, {
        "constant": false,
        "inputs": [{"name": "_spender", "type": "address"}, {"name": "_value", "type": "uint256"}, {
            "name": "_extraData",
            "type": "bytes"
        }],
        "name": "approveAndCall",
        "outputs": [{"name": "success", "type": "bool"}],
        "payable": false,
        "type": "function"
    }, {
        "constant": true,
        "inputs": [{"name": "", "type": "address"}, {"name": "", "type": "address"}],
        "name": "allowance",
        "outputs": [{"name": "", "type": "uint256"}],
        "payable": false,
        "type": "function"
    }, {
        "inputs": [{"name": "initialSupply", "type": "uint256"}, {
            "name": "tokenName",
            "type": "string"
        }, {"name": "decimalUnits", "type": "uint8"}, {"name": "tokenSymbol", "type": "string"}],
        "payable": false,
        "type": "constructor"
    }, {
        "anonymous": false,
        "inputs": [{"indexed": true, "name": "from", "type": "address"}, {
            "indexed": true,
            "name": "to",
            "type": "address"
        }, {"indexed": false, "name": "value", "type": "uint256"}],
        "name": "Transfer",
        "type": "event"
    }];

PaymentUtils.prototype.getBTCBalance = function(address){
    return new bluebird.Promise(function(resolve, reject){
        if(config.btc.network === "testnet"){
            options = {
                url: config.btc.testnet.apiBaseUrl + "/api/addr/" + address + '/?noTxList=1',
                method: "GET"
            };
        }
        else{
            options = {
                url: config.btc.livenet.apiBaseUrl + "/addr/" + address,
                method: "GET"
            };
        }
        rp(options)
            .then(function(body){
                console.log(body);
                resolve(JSON.parse(body))
            })
            .catch(function(error){
                reject(error);
            })

    })
};

PaymentUtils.prototype.getERC20Balance = function(address){
    var contract = new ethers.Contract(config.erc20.contractAddress, abi, provider);
    return contract.balanceOf(address)
};

PaymentUtils.prototype.getEtherBalance = function(address){
    return provider.getBalance(address)
};

PaymentUtils.prototype.create64BitToken = function(token){
    var len = token.slice(2).length;
    var pre = "";
    while (len < 64){
        pre += "0";
        len++;
    }
    return pre + token.slice(2);
};

PaymentUtils.prototype.createDataForTokenTransfer = function(toAddress, amount){
    var prefix = "0xa9059cbb000000000000000000000000";
    var address = toAddress.slice(2);
    var suffix = this.create64BitToken(utils.hexlify(amount));
    return prefix + address + suffix
};

PaymentUtils.prototype.getUtxo = function(address){

};

PaymentUtils.prototype.getUsedUtxoFromDb = function(address){

};

module.exports = new PaymentUtils();


