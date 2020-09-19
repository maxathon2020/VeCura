
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
let kycWallet = mxw.Wallet;
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
    kycWallet = mxw.Wallet.fromMnemonic(nodeProvider.kyc.issuer).connect(providerConnection);
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
            properties: properties,
            metadata: metadata
        }
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
            res.statusCode = resp.status;
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

var authorizeNft = async function(providerAddress, middlewareAddress, endorserList, mintLimit, transferLimit, burable, pub, symbol, res) {
    // Validate if the wallet details obtained are right.
    var resp = {
        success: true,
        message: 'Successfully authorized.',
        status: 200
    }

    if(providerAddress != provider.address) {
        resp.success = false;
        resp.message = 'Invalid provider address.';
        resp.status = 401;
        res.statusCode = resp.status;
        res.send(resp);
    }
    if(middlewareAddress != middleware.address) {
        resp.success = false;
        resp.message = 'Invalid provider address.';
        resp.status = 401;
        res.statusCode = resp.status;
        res.send(resp);
    }

    var tokenState = {
        tokenFees: [ 
            {action: nftToken.nonFungibleToken.NonFungibleTokenActions.transfer, feeName: "default"},
            {action: nftToken.nonFungibleToken.NonFungibleTokenActions.transferOwnership, feeName: "default"},
            {action: nftToken.nonFungibleToken.NonFungibleTokenActions.acceptOwnership, feeName: "default"}
        ],
        endorserList: endorserList,
        endorserListLimit: 10,
        mintLimit: mintLimit,
        transferLimit: transferLimit,
        burnable: burable,
        pub: false
    }
    nftToken.nonFungibleToken.NonFungibleToken.approveNonFungibleToken(symbol, provider, tokenState).then((transaction) => {
        nftToken.nonFungibleToken.NonFungibleToken.signNonFungibleTokenStatusTransaction(transaction, issuer).then((transaction) => {
            nftToken.nonFungibleToken.NonFungibleToken.sendNonFungibleTokenStatusTransaction(transaction, middleware).then((receipt) => {
                console.log(JSON.stringify(receipt))
                resp.details = receipt;
                res.send(resp);
            }).catch((error) => {
                resp.success = false;
                resp.status = 400;
                resp.message = String(error);
                res.statusCode = resp.status;
                res.send(resp);
            })
        }).catch((error) => {
            resp.message = String(error);
            resp.success = false;
            resp.status = 400;
            res.statusCode = resp.status;
            res.send(resp);
        })
    }).catch((error) => {
        resp.message = String(error);
        resp.success = false;
        res.status = 400;
        res.statusCode = resp.status;
        res.send(resp);
    })    
}

var mintNftTokens = async function(symbol, itemId, walletId, properties, metadata, res) {
    var resp = {
        success: true,
        message: 'Successfully authorized.',
        status: 200
    }
    const mintToken = {
        symbol: symbol,
        itemID: itemId,
        properties: properties,
        metadata: metadata
    } 
    //let wallet = mxw.Wallet.fromMnemonic("prevent always stomach plate thunder staff car program melody brass lawn library few soul weasel mad fog rival analyst decline tail measure result donkey");
    let minter = new nftToken.nonFungibleToken.NonFungibleToken(symbol, provider);
    minter.mint(walletId, mintToken).then((transaction) => {
        resp.details = transaction;
        res.send(resp);
    }).catch((error) => {
        resp.status = 400;
        resp.success = false;
        resp.message = 'Something went wrong. Please check the details provided.';
        resp.details = error;
        res.statusCode = resp.status;
        res.send(resp);
    })
}

// Will check this later as we can mint the token directly to the participant.
// var transferNftOwnership = async function(walletId, symbol, itemId, issuerAddress, res) {
//     var resp = {
//         success: true,
//         status: 200,
//         message: 'Transfer successful'
//     }
//     // if(issuerAddress != issuer.address){
//     //     resp.success = false;
//     //     resp.status = 401;
//     //     resp.message = 'Invalid Issuer.'
//     //     return resp;
//     // }

//     let w = mxw.Wallet.fromMnemonic("language indoor mushroom gold motor genuine tower ripple baby journey where offer crumble chuckle velvet dizzy trigger owner mother screen panic question cliff dish").connect(providerConnection);

//     let nftItem = nftTokenItem.NonFungibleTokenItem.fromSymbol(symbol, itemId, w);
    
    
//     nftItem.transfer(walletId).then((transaction) => {
//         resp.details = transaction;
//         res.statusCode = resp.statusCode;
//         res.send(resp);
//     }).catch((error) => {
//         resp.message = 'Unable to transfer Token' + String(error);
//         resp.status = 500;
//         resp.success = false;
//         resp.details = error;
//         res.statusCode = resp.status;
//         res.send(resp);
//     })
// }


//exports.transferNftOwnership = transferNftOwnership;
exports.mintNftTokens = mintNftTokens;
exports.authorizeNft = authorizeNft;
exports.createNft = createNft;
exports.findWallet = findWallet;
exports.connectToMaxonrowBlockchain = connectToMaxonrowBlockchain;