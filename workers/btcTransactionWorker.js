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

var updateLastBlock = function(lastBlock){
    return mongoose.model('BlockchainMonitor').findOneAndUpdate(
        {key: "btcLastBlock"},
        {$set: {value:lastBlock}}
    )
};

var isPaymentForInvoice = function(invoice, tx){
    // console.log(tx.vout[1].scriptPubKey);
    if(!tx.vout[0].scriptPubKey.addresses || !tx.vout[1].scriptPubKey.addresses)
        return false;
    if(invoice.Wallet.Address === tx.vout[0].scriptPubKey.addresses[0] || invoice.Wallet.Address === tx.vout[1].scriptPubKey.addresses[0]){
        return true
    }
    else{
        return false
    }
};

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

var addTransaction = function(invoice, tx){
    return new bluebird.Promise(function(resolve, reject){
        var transaction = new Transaction();
        transaction.ConcernedAddress = invoice.Wallet.Address;
        transaction.Currency = "BTC";
        transaction.Wallet = tx.vin[0].addr;
        transaction.Amount = tx.valueOut.toString();
        transaction.Merchant = config.merchant.merchantId;
        transaction.Hash = tx.txid;
        transaction.Timestamp = parseInt(Date.now() / 1000);
        transaction.Extra = tx;
        transaction.save()
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

var blockProcess = function(txs){
    mongoose.model('Invoice').find({
        Currency: "BTC",
        Status: {$in: ['unverified','processing']}
    })
        .then(function(invoices){
            txs.forEach(function(tx){
                invoices.forEach(function(invoice){
                    if(isPaymentForInvoice(invoice, tx)){
                        console.log("found tx : " + tx.txid);
                        //if tx is not previously processed then
                        //  add tx to transaction collection
                        //  update amountReceived, blockIncluded and status of invoice
                        //  transfer balance to cold wallet
                        isTxPreviouslyProcessed(tx.txid)
                            .then(function(txProcessed){
                                if(!txProcessed){
                                    return addTransaction(invoice, tx)
                                }
                            })
                            .then(function(addTxSuccess){
                                if(addTxSuccess){
                                    return updateInvoiceStatusAndTx(invoice, tx)
                                }
                            })
                            .then(function(updateInvoiceSuccess){
                                if(updateInvoiceSuccess){
                                    // transfer balance to cold wallet
                                }
                            })
                            .catch(function(error){
                                console.log(error);
                            })
                    }
                })
            })
        })
};

(function blockMonitor(){
    var blockToWatch;
    mongoose.connect(config.db, function(err) {
        if (err) {
            console.log("Mongodb connection error : " + err)
        } else {
            console.log("database connected");
            mongoose.model('BlockchainMonitor').findOne({key: "btcLastBlock"})
                .then(function(lastBlock){
                    if(lastBlock === null){
                        BitcoinUtils.getCurrentBlock()
                            .then(function(currentBlock){
                                var bcMonitor = new BlockchainMonitor();
                                bcMonitor.key = "btcLastBlock";
                                bcMonitor.value = currentBlock.height;
                                bcMonitor.save();
                                return currentBlock.height;
                            })
                    }
                    else{
                        blockToWatch = lastBlock.value + 1;
                        return lastBlock.value + 1
                    }
                })
                .then(function(blockNumber){
                    var curBlockNum;
                    cron.schedule('*/5 * * * *', function(){
                        var watchBlock;
                        BitcoinUtils.getCurrentBlock()
                            .then(function(currentBlock){
                                curBlockNum = currentBlock.height;
                                console.log('currenct block ' + currentBlock.height.toString());
                                return mongoose.model('BlockchainMonitor').findOne({key:"btcLastBlock"})
                            })
                            .then(function(lastBlock){
                                if(parseInt(lastBlock.value) < curBlockNum){
                                    return parseInt(lastBlock.value) + 1
                                }
                                throw Error('block already watched : ' + curBlockNum.toString());
                            })
                            .then(function(blockNumToWatch){
                                console.log('watch block ' + blockNumToWatch.toString());
                                watchBlock = blockNumToWatch;
                                return BitcoinUtils.getBlockHashFromNumber(blockNumToWatch);
                            })
                            .then(function(blockHash){
                                return BitcoinUtils.getTxsInBlock(blockHash);
                            })
                            .then(function(txs){
                                // process block here
                                updateLastBlock(watchBlock)
                                    .then(function(data){
                                        blockProcess(txs)
                                    })
                            })
                            .catch(function(error){
                                console.log(error);
                            })
                    });
                })
                .catch(function(error){
                    console.log(error)
                })


        }
    });

}());