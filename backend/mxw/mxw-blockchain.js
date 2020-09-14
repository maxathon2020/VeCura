
var mxw =  require('mxw-sdk-js/dist');
var network = require('../configuration/mxw-provider');
var logger = require('log4js').getLogger()
logger.level = 'trace'



let issuer = mxw.Wallet;
let nodeProvider = network.nodeProvider;
let providerConnection;

var connectToMaxonrowBlockchain = async function(){
    logger.info('Connecting to Maxonrow Blockchain')
    providerConnection = new mxw.providers.JsonRpcProvider(nodeProvider.connection, nodeProvider);
    logger.info('Connected to Maxonrow Blockchain')
    intialiseWallets();
}

var intialiseWallets = async function() {
    logger.info('Fetching the issuer wallet details')
    issuer = mxw.Wallet.fromMnemonic(nodeProvider.nonFungibleToken.issuer).connect(providerConnection)
    logger.info('Done fetching the issuer wallet details')
}

exports.connectToMaxonrowBlockchain = connectToMaxonrowBlockchain;