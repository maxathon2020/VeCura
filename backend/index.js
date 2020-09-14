import app from 'express';
import cors from 'cors';
import http from 'http';
import log from 'log4js';

app.options('*', cors())
app.request(cors())
var logger = log.getLogger('digital-health-wallet')
var host = 'localhost'
var port = 8765

var server = http.createServer(app).listen(port, function() {});
logger.info('****************** SERVER STARTED ************************');
logger.info('***************  http://%s:%s  ******************',host,port);


