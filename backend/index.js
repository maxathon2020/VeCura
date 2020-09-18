'use strict';
var express = require('express');
var cors = require('cors')
var http = require('http');
var log4js = require('log4js');
var logger = log4js.getLogger()
var mxw = require('./mxw/mxw-blockchain');
var bodyParser = require('body-parser');


// Server setup
var app = express();
app.options('*', cors())
app.use(cors())
var host = 'localhost'
var port = 9999

//support parsing of application/json type post data
app.use(bodyParser.json());
//support parsing of application/x-www-form-urlencoded post data
app.use(bodyParser.urlencoded({
	extended: false
}));

//Set the logging level
logger.level = 'trace'

// Start the server
var server = http.createServer(app).listen(port, function() {});
logger.info('****************** SERVER STARTED ************************');
logger.info('***************  http://%s:%s  ******************',host,port);
server.timeout = 240000;

// Default method for unsuccessful connection
function getErrorMessage(field){
    var response = {
        success: false,
        message: field + ' field is missing or Invalid in the request'
    }
    return response
}

// Setting up the Maxonrow blockchain
mxw.connectToMaxonrowBlockchain()

app.post('/digital-wallet/v1.0/auth', async function(req, res) {
    logger.info(req.body.username)
    var walletId = req.body.username;
    var mnemonic = req.body.mnemonic;

    if(!walletId){
        res.json(getErrorMessage('walletId'));
        return;
    }
    if(!mnemonic){
        res.json(getErrorMessage('mnemonic'));
        return;
    }

    let message = await mxw.findWallet(mnemonic, walletId)
    
    res.statusCode = message.status;
    res.send(message)
});

app.post('/digital-wallet/v1.0/createNft', async function(req, res) {
    var symbol = req.body.symbol;
    var name = req.body.name;
    var properties = req.body.properties;
    var metadata = req.body.metadata;
    var feeCollector = req.body.feeCollector;
    // Sanity checking.
    if(!symbol)
    {
        res.json(getErrorMessage('symbol'));
        return;
    }
    if(!name) 
    {
        res.json(getErrorMessage('name'));
        return;
    }
    if(!properties) 
    {
        res.json(getErrorMessage('properties'));
        return;
    }
    if(!metadata)
    {
        res.json(getErrorMessage('metadata'));
        return;
    }
    if(!feeCollector)
    {
        res.json(getErrorMessage('feeCollector'));
        return;
    }
    mxw.createNft(symbol, name, properties, metadata, feeCollector, res);    
});

app.post('/digital-wallet/v1.0/authorizeNft', async function(req, res) {
    var provider = req.body.provider;
    var middleware = req.body.middleware;
    var endorserList = req.body.endorserList;
    var mintLimit = req.body.mintLimit;
    var transferLimit = req.body.transferLimit;
    var burnable = req.body.burnable;
    var pub = req.body.public;
    var symbol = req.body.symbol;

    if(!provider)
    {
        res.json(getErrorMessage('provider'));
        return;
    }
    if(!middleware)
    {
        res.json(getErrorMessage('middleware'));
        return;
    }
    if(!endorserList){
        res.json(getErrorMessage('endorserList'));
        return;
    }
    if(!mintLimit){
        res.json(getErrorMessage('mintLimit'));
        return;
    }
    if(!transferLimit){
        res.json(getErrorMessage('transferLimit'));
        return;
    }
    if(!burnable){ 
        res.json(getErrorMessage('burnable'));
        return;
    }
    if(!pub){
        res.json(getErrorMessage('public'));
        return;
    }
    if(!symbol){
        res.json(getErrorMessage('symbol'));
        return;
    }

    mxw.authorizeNft(provider, middleware, endorserList, mintLimit, transferLimit, burnable, pub, symbol, res);
    
})

app.post('/digital-wallet/v1.0/mintNft', async function(req, res) {
    var symbol = req.body.symbol;
    var itemId = req.body.itemId;
    var properties = req.body.properties;
    var metadata = req.body.metadata;
    if(!symbol)
    {
        res.json(getErrorMessage('symbol'));
        return;
    }
    if(!itemId)
    {
        res.json(getErrorMessage('itemId'));
        return;
    }
    if(!properties)
    {
        res.json(getErrorMessage('properties'));
        return;
    }
    if(!metadata)
    {
        res.json(getErrorMessage('metadata'));
        return;
    }

    mxw.mintNftTokens(symbol, itemId, properties, metadata, res);
    
})

app.post('/digital-wallet/v1.0/transferNft', async function(req, res) {
    var walletId = req.body.walletId;
    var symbol = req.body.symbol;
    var itemId = req.body.itemId;
    var issuerAddress = req.body.issuerAddress;
    if(!symbol)
    {
        res.json(getErrorMessage('symbol'));
        return;
    }
    if(!walletId)
    {
        res.json(getErrorMessage('walletId'));
        return;
    }
    if(!itemId)
    {
        res.json(getErrorMessage('itemId'));
        return;
    }
    if(!issuerAddress)
    {
        res.json(getErrorMessage('issuerAddress'));
        return;
    }

    let message = await mxw.transferNftOwnership(walletId, symbol, itemId, issuerAddress);
    res.statusCode = message.status;
    res.send(message);
})