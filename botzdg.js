const { Client, LocalAuth, MessageMedia } = require('whatsapp-web.js');
const express = require('express');
const { body, validationResult } = require('express-validator');
const socketIO = require('socket.io');
const qrcode = require('qrcode');
const http = require('http');
const fileUpload = require('express-fileupload');
const axios = require('axios');
const mime = require('mime-types');
const port = process.env.PORT || 8000;
const app = express();
const server = http.createServer(app);
const io = socketIO(server);

app.use(express.json());
app.use(express.urlencoded({
extended: true
}));
app.use(fileUpload({
debug: true
}));
app.use("/", express.static(__dirname + "/"))

app.get('/', (req, res) => {
  res.sendFile('index.html', {
    root: __dirname
  });
});

const client = new Client({
  authStrategy: new LocalAuth({ clientId: 'bot-zdg' }),
  puppeteer: { headless: true,
    args: [
      '--no-sandbox',
      '--disable-setuid-sandbox',
      '--disable-dev-shm-usage',
      '--disable-accelerated-2d-canvas',
      '--no-first-run',
      '--no-zygote',
      '--single-process', // <- this one doesn't works in Windows
      '--disable-gpu'
    ] }
});

client.initialize();

io.on('connection', function(socket) {
  socket.emit('message', '© BOT-ZDG - Iniciado');
  socket.emit('qr', './icon.svg');

client.on('qr', (qr) => {
    console.log('QR RECEIVED', qr);
    qrcode.toDataURL(qr, (err, url) => {
      socket.emit('qr', url);
      socket.emit('message', '© BOT-ZDG QRCode recebido, aponte a câmera  seu celular!');
    });
});

client.on('ready', () => {
    socket.emit('ready', '© BOT-ZDG Dispositivo pronto!');
    socket.emit('message', '© BOT-ZDG Dispositivo pronto!');
    socket.emit('qr', './check.svg')	
    console.log('© BOT-ZDG Dispositivo pronto');
});

client.on('authenticated', () => {
    socket.emit('authenticated', '© BOT-ZDG Autenticado!');
    socket.emit('message', '© BOT-ZDG Autenticado!');
    console.log('© BOT-ZDG Autenticado');
});

client.on('auth_failure', function() {
    socket.emit('message', '© BOT-ZDG Falha na autenticação, reiniciando...');
    console.error('© BOT-ZDG Falha na autenticação');
});

client.on('change_state', state => {
  console.log('© BOT-ZDG Status de conexão: ', state );
});

client.on('disconnected', (reason) => {
  socket.emit('message', '© BOT-ZDG Cliente desconectado!');
  console.log('© BOT-ZDG Cliente desconectado', reason);
  client.initialize();
});
});

//envia uma imagem com legenda para um array de numeros de whatsapp com um intervalo entre mensagens {messageInterval}//
//intervalo {awaitInterval} após x mensagens enviadas {interval} //

app.post('/zdg-medianew', [
  body('contatos').notEmpty(),
  body('caption').notEmpty(),
  body('file').notEmpty(),
  body('interval').notEmpty(),
  body('messageInterval').notEmpty(),
  body('awaitInterval').notEmpty(),
], async (req, res) => {
  const errors = validationResult(req).formatWith(({
    msg
  }) => {
    return msg;
  });

  if (!errors.isEmpty()) {
    return res.status(422).json({
      status: false,
      message: errors.mapped()
    });
  }

  const contatos = req.body.contatos;
  const caption = req.body.caption;
  const fileUrl = req.body.file;
  var interval = req.body.interval;
  var messageInterval = req.body.messageInterval;
  var awaitInterval = req.body.awaitInterval;
  let cont = 0;
  let cont2 = 0;
  let mimetype;
  const attachment = await axios.get(fileUrl, {
    responseType: 'arraybuffer'
  }).then(response => {
    mimetype = response.headers['content-type'];
    return response.data.toString('base64');
  });

  const media = new MessageMedia(mimetype, attachment, caption);

  function sendMessage(number, cont2) {
    const numberDDI = number.substr(0, 2);
    const numberDDD = number.substr(2, 2);
    const numberUser = number.substr(-8, 8);
    let numberZDG = '';

    if (numberDDI !== "55") {
      numberZDG = number + "@c.us";
    } else if (numberDDI === "55" && parseInt(numberDDD) <= 30) {
      numberZDG = "55" + numberDDD + "9" + numberUser + "@c.us";
    } else if (numberDDI === "55" && parseInt(numberDDD) > 30) {
      numberZDG = "55" + numberDDD + numberUser + "@c.us";
    }
    
    client.sendMessage(numberZDG, media, {caption: caption})
      .then(() => {
        cont++;
        cont2++;
        if (cont2 === interval) {
          if (contatos.length > cont) {
            setTimeout(sendMessage, awaitInterval, contatos[cont], 0);
          } else {
            return;
          }
        } else {
          if (contatos.length > cont) {
            setTimeout(sendMessage, messageInterval, contatos[cont], cont2);
          } else {
            return;
          }
        }
      }).catch(err => {
        cont++;
        cont2++;
        if (cont2 === interval) {
          if (contatos.length > cont) {
            setTimeout(sendMessage, awaitInterval, contatos[cont], 0);
          } else {
            return;
          }
        } else {
          if (contatos.length > cont) {
            setTimeout(sendMessage, messageInterval, contatos[cont], cont2);
          } else {
            return;
          }
        }
      });
  }
  sendMessage(contatos[cont], cont2);
  res.status(200).json({
    status: true,
    message: 'BOT-ZDG Imagem enviada'
  });
});

server.listen(port, function() {
        console.log('App running on *: ' + port);
});
 