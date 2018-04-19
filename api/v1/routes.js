var express = require('express');
var router = express.Router();
var config = require('./../../config');
var auth = require('./middleware/auth');
var invoiceController = require('./controllers/invoiceController');
var hotWalletController = require('./controllers/hotWalletController');
var dashboardController = require('./controllers/dashboardController');

router.use(auth.auth);
// invoice routes
router.post('/invoice/btc', invoiceController.generateBtcInvoice);
router.post('/invoice/eth', invoiceController.generateEthInvoice);
router.post('/invoice/erc20', invoiceController.generateErc20Invoice);
router.get('/invoice/status/:id', invoiceController.getInvoiceStatus);

// balance checking routes
router.get('/balance/btc/addr/:address', hotWalletController.btcBalance);
router.get('/balance/eth/addr/:address', hotWalletController.ethBalance);
router.get('/balance/erc20/addr/:address', hotWalletController.erc20Balance);

// withdrawal routes
router.post('/withdraw/btc', hotWalletController.btcWithdraw);
router.post('/withdraw/eth', hotWalletController.ethWithdraw);
router.post('/withdraw/erc20', hotWalletController.erc20Withdraw);

// dashboard routes
router.get('/dashboard/allInvoice', dashboardController.allInvoices);
router.get('/dashboard/invoice/:id', dashboardController.invoiceTxDetail);
router.get('/dashboard/lastBlock', dashboardController.blockMonitor);

module.exports = router;

