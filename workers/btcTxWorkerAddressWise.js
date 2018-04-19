var cron = require('node-cron');
var config = require('../config');
var mongoose = require('mongoose');
mongoose.Promise = require('bluebird');
var bluebird = require('bluebird');
var Invoice = require('../models/invoice');
var PaymentUtils = require('../utils/payment');
var BitcoinUtils = require('../utils/bitcoin');
var Transaction = require('../models/transaction');
var BlockchainMonitor = require('../models/blockchainMonitor');

var isTxPreviouslyProcessed = function(hash){
    return new bluebird.Promise(function(resolve, reject){
        mongoose.model('Transaction').findOne({Hash: hash})
            .then(function(tx){
                if(tx){
                    resolve(true);
                }
                else{
                    resolve(false)
                }
            })
            .catch(function(error){
                reject(error)
            })
    })
};

var addTransaction = function(invoice, txHash){
    return new bluebird.Promise(function(resolve, reject){
        var tx;
        BitcoinUtils.getTxFromHash(txHash)
            .then(function(txData){
                tx = txData;
                return getTxAmount(invoice.Wallet.Address, tx)
            })
            .then(function(txAmount){
                var transaction = new Transaction();
                transaction.ConcernedAddress = invoice.Wallet.Address;
                transaction.Currency = "BTC";
                transaction.Wallet = tx.vin[0].addr;
                transaction.Amount = txAmount.toString();
                transaction.Merchant = config.merchant.merchantId;
                transaction.Hash = tx.txid;
                transaction.Timestamp = parseInt(Date.now() / 1000);
                transaction.Extra = tx;
                return transaction.save()
            })
            .then(function(txData){
                resolve(true)
            })
            .catch(function(error){
                reject(error)
            })
    })
};

var getTxAmount = function(addr, tx){
    return new bluebird.Promise(function(resolve, reject){
        tx.vout.forEach(function(vout){
            if(addr === vout.scriptPubKey.addresses[0]){
                resolve(vout.value)
            }
        });
        reject('0');
    })

};

var updateInvoiceStatusAndTx = function(invoice, tx){
    return new bluebird.Promise(function(resolve, reject){
        mongoose.model('Invoice').findOne({_id:invoice['_id']})
            .then(function(foundInvoice){
                getTxAmount(invoice.Wallet.Address, tx)
                    .then(function(amt){
                        var newAmount = parseFloat(foundInvoice.AmountReceived) + parseFloat(amt);
                        foundInvoice.AmountReceived = newAmount.toString();
                        foundInvoice.Status = "processing";
                        foundInvoice.BlockIncluded = tx.blockheight;
                        return foundInvoice.save();
                    })
                    .then(function(updatedInvoice){
                        console.log(updatedInvoice);
                        console.log(updatedInvoice._id + " updated to processing");
                        resolve(true);
                    })
                    .catch(function(error){
                        reject(error);
                    })
            })
            .catch(function(error){
                reject(error);
            })
    })
};


var blockProcess = function(invoices){
    /*
            get balance of address
            if addressBalance > 0
                fetch all txs from address
                for all tx in txs
                    if tx is not previously processed
                        add tx and update amountReceived

    */
    invoices.forEach(function(invoice){
        BitcoinUtils.getBalanceOfAddress(invoice.Wallet.Address)
            .then(function(data){
                if(parseFloat(data['balance']) > 0.0 && data['txApperances'] > 0){
                    return BitcoinUtils.getTxsInAddress(invoice.Wallet.Address)
                }
                else{
                    throw new Error("balance is 0");
                }
            })
            .then(function(txs){
                console.log(invoice.Wallet.Address);
                console.log(txs);
                txs.transactions.forEach(function(tx){
                    isTxPreviouslyProcessed(tx)
                        .then(function(txProcessed){
                            if(!txProcessed){
                                return addTransaction(invoice, tx)
                                // BitcoinUtils.getTxFromHash(tx)
                                //     .then(function(txData){
                                //         return addTransaction(invoice, tx)
                                //     })
                            }
                        })
                        .then(function(addTxSuccess){
                            if(addTxSuccess){
                                return BitcoinUtils.getTxFromHash(tx)
                            }
                        })
                        .then(function(tx){
                            return updateInvoiceStatusAndTx(invoice, tx)
                        })
                        .catch(function(error){
                            console.log(error);
                        })
                })
            })
            .catch(function(error){
                // console.log(error)
            })
    })
};

(function blockMonitor(){
    mongoose.connect(config.db, function(err) {
        if (err) {
            console.log("Mongodb connection error : " + err)
        } else {
            cron.schedule('*/5 * * * *', function(){
                mongoose.model('Invoice').find({
                    Currency: "BTC",
                    Status: {$in: ['unverified','processing']}
                })
                    .then(function(invoices){
                        blockProcess(invoices)
                    })
                    .catch(function(error){
                        console.log(error);
                    })
            });
        }
    });

}());