'use strict';



var fs = require('fs');

var express = require('express');

var mongodb = require('mongodb');

var shortid = require('shortid');

shortid.characters('0123456789abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ$&');

var validUrl = require('valid-url');



var app = express();

var MongoClient = mongodb.MongoClient;



if (!process.env.DISABLE_XORIGIN) {

  app.use(function(req, res, next) {

    var allowedOrigins = ['https://narrow-plane.gomix.me', 'https://www.freecodecamp.com'];

    var origin = req.headers.origin || '*';

    if(!process.env.XORIG_RESTRICT || allowedOrigins.indexOf(origin) > -1){

         console.log(origin);

         res.setHeader('Access-Control-Allow-Origin', origin);

         res.header("Access-Control-Allow-Headers", "Origin, X-Requested-With, Content-Type, Accept");

    }

    next();

  });

}



app.use('/public', express.static(process.cwd() + '/public'));



app.route('/_api/package.json')

  .get(function(req, res, next) {

    console.log('requested');

    fs.readFile(__dirname + '/package.json', function(err, data) {

      if(err) return next(err);

      res.type('txt').send(data.toString());

    });

  });

  

app.route('/')

    .get(function(req, res) {

		  res.sendFile(process.cwd() + '/views/index.html');

    })



app.route('/new/:url(*)')

    .get( (req,res, next) => {

  //connect to database

  MongoClient.connect(process.env.MONGO_URL, (err, db) => {

        if (err) {

          console.log("Unable to connect to server", err);

        } else {

          //console.log("Connected to server");

          let collection = db.collection('links');

          let url = req.params.url;

          let host = req.get('host') + "/"

          

          //function to generate short link 

          let generateLink = function(db, callback) {

            //check if url is valid

            if (validUrl.isUri(url)){

              collection.findOne({"url": url}, {"short": 1, "_id": 0}, (err, doc) =>{

                if(doc != null){

                  res.json({

                  "original_url": url, 

                  "short_url":host + doc.short

                });

                }

                else{

                   //generate a short code

                    let shortCode = shortid.generate();

                    let newUrl = { url: url, short: shortCode };

                    collection.insert([newUrl]);

                      res.json({

                        "original_url":url, 

                        "short_url":host + shortCode

                      });

                }

              });

            } 

            else {

                console.log('Not a URI');

                res.json({

                  "error": "Invalid url"

                })

            }

          };

          

          generateLink(db, function(){

            db.close();

          });

        }

  }); 

});



//given short url redirect to original url

app.route('/:short')

    .get( (req,res, next) => {

  MongoClient.connect(process.env.MONGO_URL, (err,db) => {

    if (err) {

          console.log("Unable to connect to server", err);

        } else {

          let collection = db.collection('links');

          let short = req.params.short;

          

          //search for original url in db and redirect the browser

          collection.findOne({"short": short}, {"url": 1, "_id": 0}, (err, doc) => {

            if (doc != null) {

              res.redirect(doc.url);

            } else {

              res.json({ error: "Shortlink not found in the database." });

            };

          });

        }

    db.close();

  });

});



// Respond not found to all the wrong routes

app.use(function(req, res, next){

  res.status(404);

  res.type('txt').send('Not found');

});



// Error Middleware

app.use(function(err, req, res, next) {

  if(err) {

    res.status(err.status || 500)

      .type('txt')

      .send(err.message || 'SERVER ERROR');

  }  

})



app.listen(process.env.PORT, function () {

  console.log('Node.js listening ...');

});