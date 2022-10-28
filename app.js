var createError = require('http-errors');
var express = require('express');
var path = require('path');
var cookieParser = require('cookie-parser');
var logger = require('morgan');
const axios = require('axios');
var cron = require('node-cron');
var chalk = require('chalk');
var differenceInMinutes = require('date-fns/differenceInMinutes')
require('dotenv').config();
const SocksProxyAgent = require('socks-proxy-agent');


var indexRouter = require('./routes/index');
var usersRouter = require('./routes/users');
const AUTH_TOKEN = process.env.AUTH_TOKEN;
const ENARM_GROUP = -1001516165720;
const TEST_GROUP = -1001617733917;
const SELECTED_GROUP = ENARM_GROUP;
let lastOkCycle = null;
const LAST_CYCLE_MINUTES = 10;
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
  '0 */2 * * * *',
  function () {
    console.log(process.env.SLEEP_URL);
    //const request = require('request');
    if(process.env.SLEEP_URL != undefined){
      preventSleep();
    }else{
      console.log(chalk.bgBlue.black('IDLING PREVENTER NOT CONFIGURED, SKIPPING...'));
    }

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
    const proxyHost = process.env.PROXY_HOST, proxyPort = process.env.PROXY_PORT;
    console.log(chalk.black.bgBlue(`Proxy host: ${proxyHost}`));
    console.log(chalk.black.bgBlue(`Proxy host: ${proxyPort}`));
    const proxyOptions = `socks4://${proxyHost}:${proxyPort}`;
    const httpsAgent = new SocksProxyAgent(proxyOptions);
    let result = await axios.get('https://enarm.salud.gob.mx/enarm20XX/especialidad/servicios/especialidades', {timeout: 300000, 
    // proxy:{
    //   host: '187.130.139.197',
    //   port: 37812
    // },
    httpsAgent : httpsAgent,
    headers: {
      'Authorization' : `Bearer ${AUTH_TOKEN}`,
      'Accept' : '*/*',
      'Accept-Encoding': 'gzip, deflate, br'
    }})
    //console.log(result.data);
    var json = result.data;
    await sendMessageTo("INICIA UPDATE ________\nSTART", SELECTED_GROUP)
    let responseString = "";
    let folioCalculado = 0;
    let restantes = 0;
    let rechazados = 0;
    for (const e of json.especialidades) {
      folioCalculado += e.registrados;
      if(e.clave != "rechazo"){
        restantes += e.disponibles;
      }
      if(e.clave == "rechazo"){
        rechazados = e.registrados;
      }
      responseString += `\n*${e.nombre}*\n_Registrados:_ *${e.registrados}* _Disponibles:_ *${e.disponibles}*\n`;
    }
    responseString += `\n\nPlazas restantes: ${restantes}`;
    //responseString += `\nPlazas registradas: ${folioCalculado - rechazados}`;
    //responseString += `\nPlazas registradas (incluyendo rechazos): ${folioCalculado}`;
    responseString += `\n\nFolio ACTUAL: *${json.selecter.folio}*`;
    await sendMessageTo(responseString, SELECTED_GROUP)
    await sendMessageTo("TERMINA UPDATE ________", SELECTED_GROUP)
    console.log(chalk.black.bgGreen('OK DATA'));
    console.log(chalk.black.bgBlueBright(`FOLIO CALCULADO: ${folioCalculado}`));
    console.log(chalk.black.bgBlueBright(`FOLIOS REGISTRADOS: ${folioCalculado - rechazados}`));
    console.log(chalk.black.bgBlueBright(`PLAZAS RESTANTES: ${restantes}`));
    lastOkCycle = date;
  } catch (ex) {
    console.log(ex);
    console.log(chalk.black.bgRed('ERROR DATA'));
    if(lastOkCycle != null){
      let difference = differenceInMinutes(new Date(), lastOkCycle);
      if(difference > LAST_CYCLE_MINUTES){
        await sendMessageTo(`BOT HAS EXCEEDED ERROR TIME: ${difference}`, -784594261);
      }
    }
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

async function preventSleep(){
  try{
    console.log('IDLING PREVENTER');
    await axios.get(process.env.SLEEP_URL);
  }catch(ex){
    console.log(chalk.bgRed.white('ERROR ON IDLING PREVENTER'));
  }
}

console.log('INIT REQUEST');
dataCycle();

module.exports = app;
