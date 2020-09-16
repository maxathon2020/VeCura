
var mxw =  require('mxw-sdk-js/dist');
var network = require('../configuration/mxw-provider');
var logger = require('log4js').getLogger()
var utils = require('mxw-sdk-js/dist/utils')
var nftToken = require('mxw-sdk-js/dist/index')
var ex = require('mxw-sdk-js/dist/non-fungible-token')
var nftTokenItem = require('mxw-sdk-js/dist/non-fungible-token-item')

logger.level = 'trace'



let issuer = mxw.Wallet;
let provider = mxw.Wallet; 
let middleware = mxw.Wallet;
let nodeProvider = network.nodeProvider;
let providerConnection;

var connectToMaxonrowBlockchain = async function(){
    logger.info('Connecting to Maxonrow Blockchain');
    providerConnection = new mxw.providers.JsonRpcProvider(nodeProvider.connection, nodeProvider);
    logger.info('Connected to Maxonrow Blockchain');
    intialiseWallets();
}

var intialiseWallets = async function() {
    logger.info('Fetching the wallet details');
    issuer = mxw.Wallet.fromMnemonic(nodeProvider.nonFungibleToken.issuer).connect(providerConnection);
    provider = mxw.Wallet.fromMnemonic(nodeProvider.nonFungibleToken.provider).connect(providerConnection);
    middleware = mxw.Wallet.fromMnemonic(nodeProvider.nonFungibleToken.middleware).connect(providerConnection);
    logger.info('Done fetching the wallet details');
}

var findWallet = async function(mnemonic, walletId){
    var res = {
        success: true,
        message: 'Successfully verified',
        status: 200
    };
    let fullWallet = mxw.Wallet.fromMnemonic(mnemonic).connect(providerConnection);
    if(walletId === fullWallet.address){
        return res;
    }

    res.success = false;
    res.message = 'The provided details are invalid'
    res.status = 401;

    return res;
}



var createNft = async function(symbol, name, properties, metadata, feeCollector, res){
    
    if(feeCollector === network.localnet.nonFungibleToken.feeCollector)
    {
        var nftProps = {
            name: name,
            symbol: symbol,
            fee: {
                to: feeCollector,
                value: utils.bigNumberify("1")
            },
            endorserList: [],
            endorserListLimit: 10,
            properties: properties,
            metadata: metadata
        }
        var token = new ex.NonFungibleToken(symbol, provider);
        nftToken.nonFungibleToken.NonFungibleToken.create(nftProps, provider).then((token) => {
            var resp = {
                success: true,
                status: 200,
                message: 'Successfully created ' + symbol + ' token',
                details: String(token)
            };
            res.statusCode = resp.status;
            res.send(resp);
        }).catch((error) => {
            var resp = {
                success: false,
                status: 400,
                message: 'Something went wrong',
                details: String(error)
            };
            res.statuCode = resp.status;
            res.send(resp);
        })
    }
    else{
        var resp = {
            success: false,
            status: 401,
            message: 'You are not authorized to create a token'
        }
        return resp;
    }
}

var authorizeNft = async function(providerAddress, middleWareAddress, endorserList, mintLimit, transferLimit, burable, pub, symbol) {
    // Validate if the wallet details obtained are right.
    var resp = {
        success: true,
        message: 'Successfully authorized.',
        status: 200
    }

    if(providerAddress != provider.address) {
        resp.success = false;
        resp.message = 'Invalid provider address.';
        resp.status = 401
        return resp;
    }
    if(middleWareAddress != middleware.address) {
        resp.success = false;
        resp.message = 'Invalid provider address.';
        resp.status = 401;
        return resp;
    }

    var tokenState = {
        tokenFees: [ 
            {action: nftToken.nonFungibleToken.NonFungibleTokenActions.transfer, feeName: "default"},
            {action: nftToken.nonFungibleToken.NonFungibleTokenActions.transferOwnership, feeName: "default"},
            {action: nftToken.nonFungibleToken.NonFungibleTokenActions.acceptOwnership, feeName: "default"}
        ],
        endorserList: endorserList,
        mintLimit: mintLimit,
        transferLimit: transferLimit,
        burnable: burable,
        pub: pub
    }

    nftToken.nonFungibleToken.NonFungibleToken.approveNonFungibleToken(symbol, provider, tokenState).then((transaction) => {
        nftToken.nonFungibleToken.NonFungibleToken.signNonFungibleTokenStatusTransaction(transaction, issuer).then((transaction) => {
            nftToken.nonFungibleToken.NonFungibleToken.signNonFungibleTokenStatusTransaction(transaction, middleWare).then((receipt) => {
                return resp;
            }).catch((error) => {
                resp.success = false;
                resp.status = 400;
                resp.message = String(error);
                return resp;
            })
        }).catch((error) => {
            resp.message = String(error);
            resp.success = false;
            resp.status = 400;
            return resp;
        })
    }).catch((error) => {
        resp.message = String(error);
        resp.success = false;
        res.status = 400;
        return resp;
    })    
}

var mintNftTokens = async function(symbol, itemId, properties, metadata) {
    var resp = {
        success: true,
        message: 'Successfully authorized.',
        status: 200
    }
    let mintToken = {
        symbol: symbol,
        itemId: itemId,
        properties: properties,
        metadata: metadata
    }

    let minter = new nftToken.nonFungibleToken.NonFungibleToken(symbol, issuer);
    minter.mint(issuer.address, mintToken).then((transaction) => {
        return(resp);
    }).catch((error) => {
        resp.status = 400;
        resp.success = false;
        resp.message = 'Something went wrong. Please check the details provided.';
    })
}

var transferNftOwnership = async function(walletId, symbol, itemId, issuerAddress) {
    var resp = {
        success: true,
        status: 200,
        message: 'Transfer successful'
    }
    if(issuerAddress != issuer.address){
        resp.success = false;
        resp.status = 401;
        resp.message = 'Invalid Issuer.'
        return resp;
    }

    let nftItem = new nftTokenItem.NonFungibleTokenItem(symbol, itemId, issuer);
    nftItem.transfer(walletId).then((transaction) => {
        return resp;
    }).catch((error) => {
        resp.message = 'Unable to transfer Token' + String(error);
        resp.status = 500;
        resp.success = false;
        return resp;
    })
}


exports.transferNftOwnership = transferNftOwnership;
exports.mintNftTokens = mintNftTokens;
exports.authorizeNft = authorizeNft;
exports.createNft = createNft;
exports.findWallet = findWallet;
exports.connectToMaxonrowBlockchain = connectToMaxonrowBlockchain;