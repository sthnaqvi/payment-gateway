var env = process.env.NODE_ENV || 'development';

var config = {
    'development':{
        'port': process.env.PORT || '3000',
        'db': 'mongodb://test:test123@ds251889.mlab.com:51889/payment-gateway',
        'api': 'v1',
        'secretKey': 'jndfuddsjnk48hu237e2ff4hf',
        'merchant':{
            'merchantId': '001',
            'email': '001@merchant.com',
            'password': 'merchant123',
            'apiKey': '1234qwertyvdv4t45'
        },
        'btc': {
            'network': 'testnet', // testnet || livenet
            'testnet':{
                'apiBaseUrl': 'https://test-insight.bitpay.com'
            },
            'livenet':{
                'apiBaseUrl': 'http://insight.coinbank.info/insight-api'
            }
        },
        'erc20': {
            'decimal': 18,
            'contractAddress': ''
        },
        'btcColdWalletAddress': 'mtKABrarRT8f59hz2SLGSiiaXfBWcfrZyu',
        'ethColdWalletAddress': '0xbe76Bc7079B2207932705594bA4F8e5a1BA7545F',
        'btcHotWalletAddress': 'mgXAUZoVfbtscs1oo1bKwxjbXp1LPmvsPs',
        'btcHotWalletKey': 'U2FsdGVkX19dbe7+VWn66JkzfJGwaxUxV7s5slEuUsyEeQMwMJKnSjrOs1nF3kchIwuVnWFxvS4/miBas1SYYIMjh+03a9OuM+A7Jf/24SE=',
        'ethHotWalletAddress': '0x626018D548daA7393b63Fa1001014eFe175a7177',
        'ethHotWalletKey': 'U2FsdGVkX1+XUwwYjzcdXtQtRQCkSQ8DZkCpScgdOk3O1udoWO5etYZHIuXWhrK9EA7VpER7SrmHRVZjV3fgi2++Xtwl56GKXs3OuEIEOM2t7tlaVFHmmhLCj9niRCvH',
        'ethPreviousBlock': 0,
        'erc20WithdrawalKey': '0x626018D548daA7393b63Fa1001014eFe175a7177',
        'erc20WithdrawalWallet': 'U2FsdGVkX1+XUwwYjzcdXtQtRQCkSQ8DZkCpScgdOk3O1udoWO5etYZHIuXWhrK9EA7VpER7SrmHRVZjV3fgi2++Xtwl56GKXs3OuEIEOM2t7tlaVFHmmhLCj9niRCvH',
        'web3Provider': 'https://testgeth.karachainfoundation.org',
        'ethersNetwork': require('ethers').providers.networks.ropsten
    },
    'production':{
        'port': process.env.PORT,
        'db': process.env.MONGO_URI,
        'api': 'v1',
        'secretKey': process.env.SECRET_KEY,
        'merchant':{
            'merchantId': process.env.MERCHANT_ID || '001',
            'email': process.env.EMAIL || '001@merchant.com',
            'password': process.env.PASSWORD || 'merchant123',
            'apiKey': process.env.API_KEY || '1234qwertyvdv4t45'
        },
        'btc': {
            'network': 'livenet', // testnet || livenet
            'testnet':{
                'apiBaseUrl': 'https://test-insight.bitpay.com'
            },
            'livenet':{
                'apiBaseUrl': 'http://insight.coinbank.info/insight-api'
            }
        },
        'erc20': {
            'decimal': 18,
            'contractAddress': ''
        },
        'erc20WithdrawalKey': process.env.ERC20_WITHDRAWAL_KEY || '',
        'erc20WithdrawalWallet': process.env.ERC20_WITHDRAWAL_WALLET || '',
        'btcColdWalletAddress': process.env.BTC_COLD_WALLET_ADDRESS || '',
        'ethColdWalletAddress': process.env.ETH_COLD_WALLET_ADDRESS || '',// required
        'btcHotWalletAddress': process.env.BTC_HOT_WALLET_ADDRESS || '',
        'btcHotWalletKey': process.env.BTC_HOT_WALLET_KEY || '',
        'ethHotWalletAddress': process.env.ETH_HOT_WALLET_ADDRESS || '',// required
        'ethHotWalletKey': process.env.ETH_HOT_WALLET_KEY,// required
        'web3Provider': '',
        'ethersNetwork': require('ethers').providers.networks.homestead
    }
};

module.exports = config[env];
