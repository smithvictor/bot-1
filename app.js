var createError = require('http-errors');
var express = require('express');
var path = require('path');
var cookieParser = require('cookie-parser');
var logger = require('morgan');
const axios = require('axios');
var cron = require('node-cron');
var chalk = require('chalk');

var indexRouter = require('./routes/index');
var usersRouter = require('./routes/users');

var app = express();

// view engine setup
app.set('views', path.join(__dirname, 'views'));
app.set('view engine', 'jade');

app.use(logger('dev'));
app.use(express.json());
app.use(express.urlencoded({ extended: false }));
app.use(cookieParser());
app.use(express.static(path.join(__dirname, 'public')));

app.use('/', indexRouter);
app.use('/users', usersRouter);

// catch 404 and forward to error handler
app.use(function (req, res, next) {
  next(createError(404));
});

// error handler
app.use(function (err, req, res, next) {
  // set locals, only providing error in development
  res.locals.message = err.message;
  res.locals.error = req.app.get('env') === 'development' ? err : {};

  // render the error page
  res.status(err.status || 500);
  res.render('error');
});

var processing = false;
var CronJob = require('cron').CronJob;
const { request } = require('express');
var job = new CronJob(
  '0 */1 * * * *',
  function () {
    //const request = require('request');
    if(processing){
      console.log(chalk.black.bgYellow('REQUEST IN PROGRESS. SKIPPING....'));
      return;
    }
    dataCycle();
    // request.get('https://enarm.salud.gob.mx/enarm/2021/especialidad/servicios/especialidades', {
    //   'auth': {
    //     'bearer': 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJuYW1lIjoiTUFGUzk3MDMyMkhKQ1JMQjAzIiwiZXhwIjoxNjM0NDgyOTEzfQ.31fodjsIbuKKCpce8_-rKEwnOOXolt6Ic_jF-Y8MQEg'
    //   }
    // }, async function (err, resp, body) {

    // });
  },
  null,
  true,
  'America/Los_Angeles'
);

async function dataCycle(){
  processing = true;
  let date = new Date();
  console.log('------------------');
  console.log(chalk.black.bgBlue(`NEW CYCLE: STARTED AT ${date.toString()}`));
  try {
    let result = await axios.get('https://enarm.salud.gob.mx/enarm/2021/especialidad/servicios/especialidades', {timeout: 300000, headers: {
      'Authorization' : 'Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJuYW1lIjoiTUFGUzk3MDMyMkhKQ1JMQjAzIiwiZXhwIjoxNjM0NzQ1NzQ1fQ.s9fUIlBgQCsk8k65JTL8qbpDcefXn5FpRG87HKt97Xo'
    }})
    //console.log(result.data);
    var json = result.data;
    await sendMessageTo("INICIA UPDATE ________\nSTART", -1001516165720)
    let responseString = "";
    for (const e of json.especialidades) {
      responseString += `\n*${e.nombre}*\n_Registrados:_ *${e.registrados}* _Disponibles:_ *${e.disponibles}*\n`;
    }
    await sendMessageTo(responseString, -1001516165720)
    await sendMessageTo("TERMINA UPDATE ________", -1001516165720)
    console.log(chalk.black.bgGreen('OK DATA'));
  } catch (ex) {
    console.log(ex);
    console.log(chalk.black.bgRed('ERROR DATA'));
  }
  console.log(chalk.black.bgBlue('CYCLE COMPLETED'));
  console.log('------------------');
  processing = false;
}

async function sendMessageTo(message, target) {
  try {
    const response = await axios.post('https://api.telegram.org/bot1773275784:AAGexEOH23uYz0x4zXP8MpyMx-I_qhfNvkw/sendMessage', { chat_id: target, text: message, parse_mode: "Markdown" });
  } catch (ex) {
    console.log(ex);
    console.log("FAILED TO SEND MESSAGE");
  }
}

console.log('INIT REQUEST');
dataCycle();

module.exports = app;
