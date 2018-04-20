var walletHelper = require('./../helpers/walletHelper');
var config = require('./../../../config');
var Invoice = require('./../../../models/invoice');

function Controller() {
}

Controller.prototype.generateBtcInvoice = function (req, res) {
    var data = {
        amount: req.body.amount,
        blockConfirmation: req.body.blockConfirmation,
        notifyUrl: req.body.notifyUrl,
        walletType: "BTC"
    };
    if (!req.body.amount) {
        res.status(400).json({"message": "amount cannot be null"})
    }
    if (!data.blockConfirmation) {
        data.blockConfirmation = 1;
    }
    walletHelper.generateWallet(data, function (err, wallet) {
        console.log(config);
        var invoice = new Invoice();
        invoice.MerchantId = config.merchant.merchantId;
        invoice.Currency = "BTC";
        invoice.Amount = data.amount;
        invoice.Timestamp = parseInt(Date.now() / 1000);
        invoice.Wallet = {};
        invoice.Wallet.Address = wallet.address;
        invoice.Wallet.PrivateKey = wallet.privateKey;
        invoice.Wallet.PublicKey = wallet.publicKey;
        invoice.BlockConfirmation = data.blockConfirmation;
        invoice.NotifyUrl = data.notifyUrl;
        invoice.Status = "unverified";
        invoice.save()
            .then(function (savedInvoice) {
                console.log(savedInvoice);
                res.status(200).json({
                    "invoiceId": savedInvoice._id,
                    "address": savedInvoice.Wallet.Address,
                    "currency": savedInvoice.Currency,
                    "amount": savedInvoice.Amount
                });
            })
            .catch(function (error) {
                res.status(400).json(error)
            })
    })
};

Controller.prototype.generateEthInvoice = function (req, res) {
    var data = {
        amount: req.body.amount,
        blockConfirmation: req.body.blockConfirmation,
        notifyUrl: req.body.notifyUrl,
        walletType: "ETH"
    };
    if (!data.amount) {
        res.status(400).json({"message": "amount cannot be null"})
    }
    if (!data.blockConfirmation) {
        data.blockConfirmation = 1;
    }
    walletHelper.generateWallet(data, function (err, wallet) {
        console.log(config);
        var invoice = new Invoice();
        invoice.MerchantId = config.merchant.merchantId;
        invoice.Currency = "ETH";
        invoice.Amount = data.amount;
        invoice.Timestamp = parseInt(Date.now() / 1000);
        invoice.Wallet = {};
        invoice.Wallet.Address = wallet.address;
        invoice.Wallet.PrivateKey = wallet.privateKey;
        invoice.BlockConfirmation = data.blockConfirmation;
        invoice.NotifyUrl = data.notifyUrl;
        invoice.Status = "unverified";
        invoice.save()
            .then(function (savedInvoice) {
                console.log(savedInvoice);
                res.status(200).json({
                    "invoiceId": savedInvoice._id,
                    "address": savedInvoice.Wallet.Address,
                    "currency": savedInvoice.Currency,
                    "amount": savedInvoice.Amount
                });
            })
            .catch(function (error) {
                res.status(400).json(error)
            })
    })
};

Controller.prototype.generateErc20Invoice = function (req, res) {
    var data = {
        amount: req.body.amount,
        contractAddress: req.body.contractAddress,
        blockConfirmation: req.body.blockConfirmation,
        notifyUrl: req.body.notifyUrl,
        walletType: "ERC20"
    };
    if (!data.amount) {
        res.status(400).json({"message": "amount cannot be null"})
    }
    if (!data.contractAddress) {
        res.status(400).json({"message": "contractAddress cannot be null"})
    }
    if (!data.blockConfirmation) {
        data.blockConfirmation = 1;
    }
    walletHelper.getERC20Details(data.contractAddress, function (err, erc20) {
        if (err)
            return res.status(400).json({"message": err.message});

        walletHelper.generateWallet(data, function (err, wallet) {
            console.log(config);
            var invoice = new Invoice();
            invoice.MerchantId = config.merchant.merchantId;
            invoice.Currency = "ERC20";
            invoice.Amount = data.amount;
            invoice.Timestamp = parseInt(Date.now() / 1000);
            invoice.Wallet = {};
            invoice.Wallet.Address = wallet.address;
            invoice.Wallet.PrivateKey = wallet.privateKey;
            invoice.Wallet.ContractAddress = data.contractAddress;
            invoice.Wallet.TokenDecimals = erc20.decimals;
            invoice.Wallet.TokenSymbol = erc20.symbol;
            invoice.BlockConfirmation = data.blockConfirmation;
            invoice.NotifyUrl = data.notifyUrl;
            invoice.Status = "unverified";
            invoice.save()
                .then(function (savedInvoice) {
                    console.log(savedInvoice);
                    res.status(200).json({
                        "invoiceId": savedInvoice._id,
                        "address": savedInvoice.Wallet.Address,
                        "currency": savedInvoice.Currency,
                        "contractAddress": savedInvoice.Wallet.ContractAddress,
                        "tokenName": savedInvoice.erc20.name,
                        "tokenSymbol": savedInvoice.Wallet.TokenSymbol,
                        "tokenDecimals": savedInvoice.Wallet.TokenDecimals,
                        "amount": savedInvoice.Amount
                    });
                })
                .catch(function (error) {
                    res.status(400).json(error)
                })
        })
    });
};

Controller.prototype.getInvoiceStatus = function (req, res) {
    var invoiceId = req.params.id;
    if (invoiceId === null || invoiceId === "") {
        res.status(400).json({
            "success": false,
            "message": "valid invoice id required"
        });
    }
    Invoice.findOne({_id: invoiceId})
        .then(function (invoice) {
            res.status(200).json({
                "success": true,
                "invoiceId": invoice._id,
                "status": invoice.Status,
                "coldWalletTransferStatus": invoice.ColdWalletTransferStatus
            });
        })
        .catch(function (error) {
            res.status(400).json({
                "success": false,
                "message": error
            });
        })
};

module.exports = new Controller();