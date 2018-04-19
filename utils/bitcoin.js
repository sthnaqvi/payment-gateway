var rp = require('request-promise');
var bluebird = require('bluebird');
var config = require('../config');
var bitcoinjs = require('bitcoinjs-lib');
var aes = require('crypto-js/aes');
var CryptoJS = require('crypto-js');

function BitcoinUtils() {}

BitcoinUtils.prototype.getBlockHashFromNumber = function(blockNum){
    var options;
    return new bluebird.Promise(function(resolve, reject){
        if(config.btc.network === "testnet"){
            options = {
                url: config.btc.testnet.apiBaseUrl + "/api/block-index/" + blockNum.toString(),
                method: "GET"
            };
        }
        else{
            options = {
                url: config.btc.livenet.apiBaseUrl + "/block-index/" + blockNum.toString(),
                method: "GET"
            };
        }
        rp(options)
            .then(function(body){
                console.log(body);
                resolve(JSON.parse(body).blockHash)
            })
            .catch(function(error){
                reject(error);
            })

    })
};

BitcoinUtils.prototype.getCurrentBlock = function(){
    var options;
    return new bluebird.Promise(function(resolve, reject){
        if(config.btc.network === "testnet"){
            options = {
                url: config.btc.testnet.apiBaseUrl + "/api/blocks?limit=1",
                method: "GET"
            };
        }
        else{
            options = {
                url: config.btc.livenet.apiBaseUrl + "/blocks?limit=1",
                method: "GET"
            };
        }
        rp(options)
            .then(function(body){
                console.log(body);
                resolve(JSON.parse(body).blocks[0])
            })
            .catch(function(error){
                reject(error);
            })

    })
};

BitcoinUtils.prototype.getUtxos = function(address){
    var options;
    return new bluebird.Promise(function(resolve, reject){
        if(config.btc.network === "testnet"){
            options = {
                url: config.btc.testnet.apiBaseUrl + "/api/addr/" + address + "/utxo",
                method: "GET"
            };
        }
        else{
            options = {
                url: config.btc.livenet.apiBaseUrl + "/addr/" + address + "/utxo",
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

BitcoinUtils.prototype.getTxFromHash = function(hash){
    var options;
    return new bluebird.Promise(function(resolve, reject){
        if(config.btc.network === "testnet"){
            options = {
                url: config.btc.testnet.apiBaseUrl + "/api/tx/" + hash,
                method: "GET"
            };
        }
        else{
            options = {
                url: config.btc.livenet.apiBaseUrl + "/tx/" + hash,
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

BitcoinUtils.prototype.getBalanceOfAddress = function(address){
    var options;
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

BitcoinUtils.prototype.getTxsInAddress = function(address){
    var options;
    return new bluebird.Promise(function(resolve, reject){
        if(config.btc.network === "testnet"){
            options = {
                url: config.btc.testnet.apiBaseUrl + "/api/addr/" + address,
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

BitcoinUtils.prototype.createTx = function(utxos, toAddress, privateKey, amount, fee){
    var feeInSatoshis = parseInt(fee * 100000000);
    var keyPair = bitcoinjs.ECPair.fromWIF(aes.decrypt(privateKey, config.secretKey).toString(CryptoJS.enc.Utf8), bitcoinjs.networks.testnet);
    console.log(keyPair);
    var txb = new bitcoinjs.TransactionBuilder(bitcoinjs.networks.testnet);
    var unspentAmount = 0;
    utxos.forEach(function(utxo){
        if(utxo.confirmations < 3){
            return true
        }
        unspentAmount += utxo.amount;
        txb.addInput(utxo.txid, 0);
        if(unspentAmount >= (amount + fee)){
            return false
        }
    });

    var amountToOutput = unspentAmount - (amount + fee);
    txb.addOutput(toAddress, amountToOutput);
    txb.sign(0, keyPair);
    var tx = txb.build();
    return tx.toHex();
};

BitcoinUtils.prototype.broadcastTx = function(tx){
    var options;
    return new bluebird.Promise(function(resolve, reject){
        if(config.btc.network === "testnet"){
            options = {
                url: config.btc.testnet.apiBaseUrl + "/api/tx/send",
                method: "POST",
                body: {rawtx: tx},
                json: true
            };
        }
        else{
            options = {
                url: config.btc.livenet.apiBaseUrl + "/tx/send",
                method: "POST",
                body: {rawtx: tx},
                json: true
            };
        }
        rp(options)
            .then(function(body){
                console.log(body);
                resolve(body)
            })
            .catch(function(error){
                reject(error);
            })

    })
};

var fetchTxsFromPage = function(dataSource){
    return new bluebird.Promise(function(resolve, reject){
        options = {
            url: dataSource,
            method: "GET"
        };
        rp(options)
            .then(function(body){
                resolve(JSON.parse(body)['txs'])
            })
            .catch(function(error){
                reject(error);
            })
    })
};

var fetchAllTxs = function(url, pageNum){
    var datasources = [];
    for(var i=0; i<pageNum; i++){
        datasources.push(url+i.toString());
    }
    console.log(datasources);
    return new bluebird.Promise(function(resolve, reject){
        var txData = [];
        var i=0;
        datasources.forEach(function(datasource){
            fetchTxsFromPage(datasource)
                .then(function(data){
                    data.forEach(function(item){
                        txData.push(item);
                    });
                    i++;
                    if(i === pageNum){
                        resolve(txData);
                    }
                })
        })

    })
};

BitcoinUtils.prototype.getTxsInBlock = function(blockHash){
    var options;
    var fetchUrl;
    return new bluebird.Promise(function(resolve, reject){
        if(config.btc.network === "testnet"){
            fetchUrl = config.btc.testnet.apiBaseUrl + "/api/txs?block=" + blockHash + "&pageNum=";
            options = {
                url: config.btc.testnet.apiBaseUrl + "/api/txs?block=" + blockHash,
                method: "GET"
            };
        }
        else{
            fetchUrl = config.btc.livenet.apiBaseUrl + "/txs?block=" + blockHash + "&pageNum=";
            options = {
                url: config.btc.livenet.apiBaseUrl + "/txs?block=" + blockHash,
                method: "GET"
            };
        }
        rp(options)
            .then(function(body){
                return JSON.parse(body)['pagesTotal']
            })
            .then(function(pages){
                return fetchAllTxs(fetchUrl,pages)
            })
            .then(function(txData){
                resolve(txData)
            })
            .catch(function(error){
                reject(error);
            })
    })
};

module.exports = new BitcoinUtils();