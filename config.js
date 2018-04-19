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
        'btcColdWalletAddress': '',
        'ethColdWalletAddress': '',
        'btcHotWalletAddress': '',
        'btcHotWalletKey': '',
        'ethHotWalletAddress': '',
        'ethHotWalletKey': '',
        'ethPreviousBlock': 0,
        'erc20WithdrawalKey': '',
        'erc20WithdrawalWallet': '',
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
