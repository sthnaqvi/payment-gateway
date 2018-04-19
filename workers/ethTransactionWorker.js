var Web3 = require('web3');
var cron = require('node-cron');
var config = require('../config');
var mongoose = require('mongoose');
mongoose.Promise = require('bluebird');
var bluebird = require('bluebird');
var web3 = new Web3(config.web3Provider);
var BlockchainMonitor = require('../models/blockchainMonitor');
var Invoice = require('../models/invoice');
var Transaction = require('../models/transaction');
var ethers = require('ethers');
var providers = ethers.providers;
var provider = new providers.JsonRpcProvider(config.web3Provider, config.ethersNetwork);
var payment = require('../modules/payment/payment');
var PaymentUtils = require('../utils/payment');

/*@Purpose:
*
*
*
* */

/*@todo: Handle case of multiple transactions, maintain an array for coldwallet transfers in the invoice model and push all cold wallet
*   transactions into it
* */
var updateColdWalletTransferStatus = function(invoice){
    return new bluebird.Promise(function(resolve, reject){
        mongoose.model('Invoice').findOneAndUpdate(
            {_id: invoice['_id']},
            {$set:{ColdWalletTransferStatus: "confirmed"}})
            .then(function(foundInvoice){
                console.log(foundInvoice._id + " balance sent to cold wallet");
                resolve(true)
            })
            .catch(function(err){
                reject(err)
            })
    })
};

var addTransaction = function(transaction, currency){
    if(currency === "ETH"){
        return new bluebird.Promise(function(resolve, reject){
            var tx = new Transaction();
            tx.Wallet = transaction.from;
            tx.Currency = currency;
            tx.ConcernedAddress = transaction.to;
            tx.Amount = transaction.value;
            tx.Merchant = config.merchant.merchantId;
            tx.Hash = transaction.hash;
            tx.Timestamp = parseInt(Date.now() / 1000);
            tx.Extra = transaction;
            tx.save()
                .then(function(txData){
                    resolve(true)
                })
                .catch(function(error){
                    reject(error)
                })
        })
    }
    else{
        return new bluebird.Promise(function(resolve, reject){
            var tx = new Transaction();
            tx.Wallet = transaction.from;
            tx.Currency = currency;
            tx.ConcernedAddress = transaction.receivingAddress;
            tx.Amount = transaction.amountReceived;
            tx.Merchant = config.merchant.merchantId;
            tx.Hash = transaction.hash;
            tx.Timestamp = parseInt(Date.now() / 1000);
            tx.Extra = transaction;
            tx.save()
                .then(function(txData){
                    resolve(true)
                })
                .catch(function(error){
                    reject(error)
                })
        })
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

var updateInvoiceStatusAndTx = function(invoice, status, tx, blockNumber){
    if(invoice.Currency === "ETH"){
        return new bluebird.Promise(function(resolve, reject){
            mongoose.model('Invoice').findOne({_id:invoice['_id']})
                .then(function(foundInvoice){
                    var newAmount = parseFloat(foundInvoice.AmountReceived) + parseFloat(web3.utils.fromWei(tx.value));
                    foundInvoice.AmountReceived = newAmount.toString();
                    foundInvoice.Status = status;
                    foundInvoice.BlockIncluded = blockNumber;
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
    }
    else{
        return new bluebird.Promise(function(resolve, reject){
            PaymentUtils.getERC20Balance(invoice.Wallet.Address)
                .then(function(balance){
                    var amountReceived = parseFloat(balance) / Math.pow(10, config.erc20.decimal);
                    mongoose.model('Invoice').findOne({_id:invoice['_id']})
                        .then(function(foundInvoice){
                            var newAmount = parseFloat(foundInvoice.AmountReceived) + amountReceived;
                            foundInvoice.AmountReceived = newAmount.toString();
                            foundInvoice.Status = status;
                            foundInvoice.BlockIncluded = blockNumber;
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

        })
    }

};

var updateLastBlock = function(lastBlock){
    return mongoose.model('BlockchainMonitor').findOneAndUpdate(
        {key: "ethLastBlock"},
        {$set: {value:lastBlock}}
    )
};


/*@todo: Use skip limit to process all the invoices in the db batchwise */
var blockProcess = function(block){
    mongoose.model('Invoice').find({
        Currency: {$in: ["ETH", "ERC20"]},
        // Timestamp: { $gt: (parseInt(Date.now()/1000) - 86400) },
        Status: {$in: ['unverified','processing']}
    })
        .then(function(invoices){
            // console.log(block);
            var txs = block.transactions;
            txs.forEach(function(tx){
                invoices.forEach(function(invoice){
                    // console.log(invoice);
                    if(invoice.Currency === "ETH"){
                        if(tx.to === invoice.Wallet.Address && parseFloat(web3.utils.fromWei(tx.value)) > 0){
                            //update invoice status to processing
                            isTxPreviouslyProcessed(tx.hash)
                                .then(function(txProcessed){
                                    if(!txProcessed){
                                        return updateInvoiceStatusAndTx(invoice, "processing", tx, block.number)
                                    }
                                })
                                .then(function(success){
                                    return addTransaction(tx,"ETH")
                                })
                                .then(function (success) {
                                    return payment.ethPayment(web3.utils.fromWei(tx.value), invoice.Wallet.PrivateKey, config.ethColdWalletAddress, true, false);
                                })
                                .then(function(txHash){
                                    updateColdWalletTransferStatus(invoice);
                                    console.log(txHash);
                                })
                                .catch(function(error){
                                    console.log(error);
                                })
                        }
                    }
                    else{
                        // console.log("0x" + tx.input.substr(34,40) + "----" + invoice.Wallet.Address);
                        // console.log(tx);
                        if((tx.to).toUpperCase() === (config.erc20.contractAddress).toUpperCase()){
                            console.log('checking erc20 balance');
                            PaymentUtils.getERC20Balance(invoice.Wallet.Address)
                                .then(function(balance){
                                    var amountReceived = parseFloat(balance) / Math.pow(10, config.erc20.decimal);
                                    if(parseInt(amountReceived) > 0){
                                        console.log(amountReceived);
                                        isTxPreviouslyProcessed(tx.hash)
                                            .then(function(txProcessed){
                                                if(!txProcessed){
                                                    return updateInvoiceStatusAndTx(invoice, "processing", tx, block.number)
                                                }
                                            })
                                            .then(function(success){
                                                tx.amountReceived = amountReceived;
                                                tx.receivingAddress = invoice.Wallet.Address;
                                                return addTransaction(tx,"ERC20")
                                            })
                                            .then(function (success) {
                                                return PaymentUtils.getEtherBalance(invoice.Wallet.Address);
                                            })
                                            .then(function(balance){
                                                if(parseFloat(ethers.utils.formatEther(balance)) >= parseFloat("0.0007")){
                                                    return "balance already exists. Skipping ether transfer for gas."
                                                }
                                                else{
                                                    return payment.ethPayment("0.0007", config.ethHotWalletKey, invoice.Wallet.Address, false, false);
                                                }

                                            })
                                            .then(function(txHash){
                                                console.log(txHash);
                                                return payment.erc20Payment(amountReceived, invoice.Wallet.PrivateKey, invoice.Wallet.Address, config.ethColdWalletAddress, false);
                                            })
                                            .then(function(txHash){
                                                updateColdWalletTransferStatus(invoice);
                                                console.log(txHash);
                                            })
                                            .catch(function(error){
                                                console.log(error);
                                            })
                                    }

                                })
                        }

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
            mongoose.model('BlockchainMonitor').findOne({key: "ethLastBlock"})
                .then(function(lastBlock){
                    if(lastBlock === null){
                        web3.eth.getBlockNumber()
                            .then(function(currentBlock){
                                var bcMonitor = new BlockchainMonitor();
                                bcMonitor.key = "ethLastBlock";
                                bcMonitor.value = currentBlock;
                                bcMonitor.save();
                                return currentBlock;
                            })
                    }
                    else{
                        blockToWatch = lastBlock.value + 1;
                        return lastBlock.value + 1
                    }
                })
                .then(function(blockNumber){

                    cron.schedule('*/5 * * * * *', function(){
                        var curBlockNum;
                        web3.eth.getBlockNumber()
                            .then(function(currentBlockNumber){
                                curBlockNum = currentBlockNumber;
                                console.log('currenct block ' + currentBlockNumber.toString());
                                return mongoose.model('BlockchainMonitor').findOne({key:"ethLastBlock"})
                            })
                            .then(function(lastBlock){
                                if(parseInt(lastBlock.value) < curBlockNum){
                                    return parseInt(lastBlock.value) + 1
                                }
                                throw Error('block already watched : ' + curBlockNum.toString());
                            })
                            .then(function(blockNumToWatch){
                                console.log('watch block ' + blockNumToWatch.toString());
                                return web3.eth.getBlock(blockNumToWatch, true)
                            })
                            .then(function(block){

                                //@todo:Update this after processing
                                updateLastBlock(block.number)
                                    .then(function(data){
                                        blockProcess(block);
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
