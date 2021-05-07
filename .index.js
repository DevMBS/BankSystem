//это server-side скрипт
//инициализация библиотек для ноды
//express и http нужны для создания сервера
const express = require("express");
const app = express();
//хоть тут и написано, что используется небезопасный http, replit еще сверху накидывает ssl сертификат, и в итоге все хостится на https
const server = require("http").createServer(app);

//server-side и client-side скрипты должны как-то общаться междду собой и передавать друг другу данные, для этого лучше всего подходят сокеты и либа socket.io
const socket = require("socket.io")(server);

//подрубаю встроенную в replit базу данных, в ней буду хранить данные пользователей
const Database = require("@replit/database");
const db = new Database();

//nodemailer - библиотека для отправки емейлов
const nodemailer = require('nodemailer');

//подрубаю библиотеку для шифрования паролей пользователей
require("pidcrypt/seedrandom");
const pidCrypt = require("pidcrypt");
require("pidcrypt/aes_cbc");

//буду использовать стандарт шифрования AES, он надежный и используется везде
const aes = new pidCrypt.AES.CBC()

//подключаю библиотеку для работы с файлами
const fs = require("fs");

//аутентификация почты банка
//здесь могла быть дыра в безопасности, но я поставил перед названием сервер-сайд скрипта точку и изменил права доступа к файлу (просто прописал chmod 600 в консоли), поэтому этот файл обычному пользователю невозможно увидеть
var transporter = nodemailer.createTransport({
  service: 'gmail',
  auth: {
    user: '',//здесь надо прописать почту, которую будет впоследствие использовать банк для рассылки верификационных кодов, и пароль для нее
    pass: '',
  },
});

//говорю express серверу какой html файл отображать (в данном случае index.html)
app.use(express.static(__dirname));

// socket.on - принимает данные, которые ему передает клиент-сайд или сервер-сайд скрипт; socket.emit - передает данные на клиент-сайд или сервер-сайд

//когда юзер заходит на страницу, на сервер автоматически отправляется socket.emit("connection"), сервер его подхватывает, понимает, что на сайте кто-то есть и готов принимать от него данные
socket.on("connection", (socket) => {

  //принимаю запрос на регистрацию
  socket.on("signup", (newUser) => {

    //создаю для пользователя его уникальный id (номер карты)
    db.get("id").then(id => {
      var card = "00000000";
      switch(id.length){
        case 1:
          card = "0000000"+id;
          break;
        case 2:
          card = "000000"+id;
          break;
        case 3:
          card = "00000"+id;
          break;
        case 4:
          card = "0000"+id;
          break;
        case 5:
          card = "000"+id;
          break;
        case 6:
          card = "00"+id; 
          break;
        case 7:
          card = "0"+id;
          break;
        case 8:
          card = id;
          break;
        default:
          console.log("error, cannt create new card number, id:"+id);
      }

      //отправляю пользователю на почту код верификации (100% приходит в спам)
      var verificationCode = Math.floor(Math.random()*10000);
      let verification = transporter.sendMail({
        from: 'The Null Bank',
        to: newUser[2],
        subject: 'Verification code from The Null Bank',
        text: '',
        html: '<h3>Your verification code is:</h3><br/><br/><h1>'+String(verificationCode)+'</h1>',
      })
      console.log(verification);

      //отправляю юзеру данные о том, что код отправлен на почту, давай-ка подтверди ее
      socket.emit("verification", "Enter the verification code that we sent you by email (most likely it is in the spam folder): <input id='verCode' maxlength='4'/><button onclick='verificationRequest();'>Enter</button>");

      //принимаю ответ (введенный код) от пользователя и завершаю регистрацию/говорю что он ввел неправильный код
      socket.on("verification-ok", (code) => {
        if(code == verificationCode){

          //шифрую пароль пользователя
          //у файла с ключом права -rw-------, а это значит, что читать и записывать его может только владелец (я)
          fs.readFile(".key.txt", "utf8", function(error,key){ 
            var encryptedPassword = aes.encryptText(newUser[1], key); 
          //заношу его в базу данных + даю ему 50 долларов, чтобы мог протестить функции банка
          //информация в бд: имя; пароль; почта; баланс; логи операций
          db.set(card, newUser[0] + ";" + encryptedPassword + ";" + newUser[2] + ";50;^Account created").then(() => {
          console.log("New account created - "+newUser[0]+", "+card);
          socket.emit("ok3", "Account created! Your card number is <h2>"+card+"</h2>");
          var pId = Number(id)+1;
          db.set("id", String(pId)).then(() => {
            console.log("id updated, new id - "+String(pId));
          });
        });
        });
        }
        else{
          socket.emit("ok3", "Error, the entered verification code is incorrect!<br/>Enter the verification code that we sent you by email (most likely it is in the spam folder): <input id='verCode' maxlength='4'/><button onclick='verificationRequest();'>Enter</button>");
        }
      });
    });
  });

//принимаю запрос на логин
 socket.on("login", (user) => {
  
  //проверяю введенные данные и провожу аутентификацию
  db.get(user[0]).then(card => {
    if(card != null){
      fs.readFile(".key.txt", "utf8", function(error,key){ 
        var decryptedPassword = aes.decryptText(card.split(';')[1], key);
      
      if(user[1] == decryptedPassword){
        socket.emit("ok2", ["<h1>Welcome, "+card.split(';')[0]+"! Your balance: "+card.split(';')[3]+"$</h1>", true]);
        socket.emit("logs", card.split(';')[4]);
        console.log(card.split(';')[0]+" logged in");
       }
       else{
        socket.emit("ok2", ["Error, check if the entered password is correct!", false]);         
        }
        });      
    }       
    else{        
      socket.emit("ok2", ["Error, check if the entered card number is correct!", false]);      
    } 
  });
});

//отправка кода, которая происходит при нажатии на кнопку "перевести другому клиенту денег"
  var transferVerificationCode = 0;
  socket.on("transferVerification", (cardnum) => {
    db.get(cardnum).then(sender => {
      transferVerificationCode = Math.floor(Math.random()*10000);
      let verification = transporter.sendMail({
        from: 'The Null Bank',
        to: sender.split(";")[2],
        subject: 'Verification code from The Null Bank',
        text: '',
        html: '<h3>Your verification code is:</h3><br/><br/><h1>'+String(transferVerificationCode)+'</h1>',
      })
      console.log(verification);
    });
  });

  //обрабатываю запрос на перевод денег
  socket.on("transferRequest", (request) => {
    db.get(request[0]).then(senderCard => {

      fs.readFile(".key.txt", "utf8", function(error,key){ 
        var decryptedPassword = aes.decryptText(senderCard.split(";")[1], key);

      //проверка 1: на возможность проведения операции
      if(request[2] <= Number(senderCard.split(";")[3]) && request[3] == decryptedPassword && request[4] == transferVerificationCode && request[2] > 0){
        db.get(request[1]).then(recipientCard => {

          //проверка 2: на существование получателя
          if(recipientCard != null){

            //охх сейчас начнется самый сложночитаемый кусок кода
            //Все, что этот ужас делает - изменяет данные двух пользователей - отправителя и получателя в базе данных
            db.set(request[0], senderCard.split(";")[0]+";"+senderCard.split(";")[1]+";"+senderCard.split(";")[2]+";"+String(Number(senderCard.split(";")[3])-Number(request[2]))+";"+"^"+request[2]+"$ sent to "+recipientCard.split(";")[0]+" with message: "+request[5]+senderCard.split(";")[4]);

            db.set(request[1], recipientCard.split(";")[0]+";"+recipientCard.split(";")[1]+";"+recipientCard.split(";")[2]+";"+String(Number(recipientCard.split(";")[3])+Number(request[2]))+";"+"^"+"Received "+request[2]+"$ from "+senderCard.split(";")[0]+" with message: "+request[5]+recipientCard.split(";")[4]);
            socket.emit("ok4", "Operation completed successfully!");
            socket.emit("operations", "^"+request[2]+"$ sent to "+recipientCard.split(";")[0]+" with message: "+request[5]+senderCard.split(";")[4]);
            socket.emit("balance", String(Number(senderCard.split(";")[3])-Number(request[2])));
          }
          else{
            socket.emit("ok4", "Error! The client with the entered card number does not exist");
          }
        });
      }

      else{
        socket.emit("ok4", "Error, it is impossible to perform the operation, check the entered data!");
      }
      });
    });
  });
});

//говорю серверу на каком порту ему работать
server.listen(3000);
