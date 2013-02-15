
/**
 * Module dependencies.
 */

var express = require('express')
  , http = require('http')
  , path = require('path')
  , mongoose = require('mongoose');

var app = express();

var api = require('./routes/api')
  , render = require('./routes/render');

mongoose.connect(process.env.MONGOHQ_URL || 'mongodb://localhost/t3');

app.configure(function(){
  app.set('port', process.env.PORT || 51200);
  app.set('views', __dirname + '/views');
  app.set('view engine', 'jade');
  app.set('view options', { layout: false });
  app.use(express.favicon());
  app.use(express.logger('dev'));
  app.use(express.bodyParser());
  
  //session
  app.use(express.cookieParser('mjh5121018'));
  app.use(express.session());

  app.use(express.methodOverride());
  app.use(app.router);
  app.use(express.static(path.join(__dirname, 'public')));
});

app.configure('development', function(){
  app.use(express.errorHandler());
});

//routing
api(app);
render(app);

http.createServer(app).listen(app.get('port'), function(){
  console.log("Express server listening on port " + app.get('port'));
});
