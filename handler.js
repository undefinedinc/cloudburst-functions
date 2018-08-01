'use strict';

const multipart = require('aws-lambda-multipart-parser');
const checkFile = require('./lib/checkFile');
const createFile = require('./lib/createFile');
const mergeFiles = require('./lib/mergeFiles');
const getChunkFilename = require('./lib/getChunkFilename');

const bucket = process.env.BUCKET;

module.exports.resumableGET = (event, context, callback) => {
  const params = event.queryStringParameters;

  const folder = params.path,
        filename = params.resumableFilename,
        filetype = params.resumableType,
        chunkSize = parseInt(params.resumableChunkSize),
        totalSize = parseInt(params.resumableTotalSize),
        identifier = params.resumableIdentifier,
        chunkNumber = parseInt(params.resumableChunkNumber),
        numberOfChunks = Math.max(Math.floor(totalSize/(chunkSize*1.0)), 1);

  const chunkFilename = getChunkFilename(filename, folder, chunkNumber);

  return checkFile(chunkFilename)
         .then(function(filename) {
           return mergeFiles(filename, filetype, numberOfChunks);
         })
         .then(function(filename) {
           if(typeof(filename)!='undefined') {
             callback(null, {
               statusCode: 200,
               headers: {
                 'Content-Type': 'application/json',
                 'Access-Control-Allow-Origin': '*'
              },
               body: `https://s3.amazonaws.com/${bucket}/${filename}`
             });
           } else {
             callback(null, {
               statusCode: 204,
               headers: {
                 'Content-Type': 'application/json',
                 'Access-Control-Allow-Origin': '*'
               },
               body: error
             });
           }
         })
         .catch(function(error) {
           callback(null, {
             statusCode: 500,
             headers: {
               'Content-Type': 'application/json',
               'Access-Control-Allow-Origin': '*'
             },
             body: error
           });
         });
};

module.exports.resumablePOST = (event, context, callback) => {
  const params = multipart.parse(event, false);

  const file = params.file,
        folder = params.path,
        filename = params.resumableFilename,
        filetype = params.resumableType,
        chunkSize = parseInt(params.resumableChunkSize),
        totalSize = parseInt(params.resumableTotalSize),
        identifier = params.resumableIdentifier,
        chunkNumber = parseInt(params.resumableChunkNumber),
        numberOfChunks = Math.max(Math.floor(totalSize/(chunkSize*1.0)), 1);

  console.log(file)

  const chunkFilename = getChunkFilename(filename, folder, chunkNumber);

  return createFile(chunkFilename, file)
         .then(function(filename) {
           return mergeFiles(filename, filetype, numberOfChunks);
         })
         .then(function(filename) {
           callback(null, {
             statusCode: 200,
             headers: {
               'Content-Type': 'application/json',
               'Access-Control-Allow-Origin': '*'
             },
             body: `https://s3.amazonaws.com/${bucket}/${filename}`
           });
         })
         .catch(function(error) {
           callback(null, {
             statusCode: 404,
             headers: {
               'Content-Type': 'application/json',
               'Access-Control-Allow-Origin': '*'
             },
             body: error
           });
         });
};
