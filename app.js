var express = require('express');
var cookieParser = require('cookie-parser');
var logger = require('morgan');

// Inicializar banco de dados
require('./db');

var indexRouter = require('./routes/index');
var operationsRouter = require('./routes/operations');

var app = express();

app.use(logger('dev'));
app.use(express.json());
app.use(express.urlencoded({ extended: false }));
app.use(cookieParser());

app.use('/', indexRouter);
app.use('/operations', operationsRouter);

module.exports = app;
