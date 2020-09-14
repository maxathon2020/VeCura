'use strict';
var express = require('express');
var cors = require('cors')
var http = require('http');
var log4js = require('log4js');
var logger = log4js.getLogger()
var mxw = require('./mxw/mxw-blockchain');


// Server setup
var app = express();
app.options('*', cors())
app.use(cors())
var host = 'localhost'
var port = 9999

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

app.get('/digital-wallet/v1.0/auth', async function(req, res) {
    var walletId = req.body.username;
    var mnemonic = req.body.mnemonic;

    if(!walledId){
        res.json(getErrorMessage('walletId'));
        return;
    }
    if(!mnemonic){
        res.json(getErrorMessage('mnemonic'));
        return;
    }
})