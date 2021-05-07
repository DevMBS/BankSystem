//это client-side скрипт
//инициализирую сокеты
const socket = io();

//вы что-то говорили про ооп?
//тыща функций, вперед!
//если честно, я даже не знаю, как тут может пригодиться ооп

//в принципе, тут все довольно понятно, что происходит, каждая из функций отпраляет-принимает запросы и изменяет содержимое на странице

function signUp(){
  document.getElementById("name").value.split("").forEach(letter => {
    if(letter == "!" || letter == "@" || letter == "#" || letter == "$" || letter == "%" || letter == "^" || letter == "*" || letter == "(" || letter == ")" || letter == "<" || letter == ">" || letter == "/" || letter == "[" || letter == "]" || letter == "{" || letter == "}" || letter == "?"){
      document.getElementById("signup").innerHTML = 'Username cannot contain special characters!<br/><br/><h2>Sign Up</h2><input id="name" placeholder="Enter your name"/><br/><br/><input id="password" type="password" placeholder="Enter password"/><br/><br/><input id="email" placeholder="Enter your GMAIL adress" type="email"/><br/><br/><button onclick="signUp();">Sign Up</button>';
    }
    else{
      if(document.getElementById("email").value.split("@")[1] == "gmail.com"){
        socket.emit("signup", [document.getElementById("name").value,   document.getElementById("password").value, document.getElementById("email") .value]);
        document.getElementById("wlcm").style.display="none";
        socket.on("verification", (enterfield) => {
          document.getElementById("signup").innerHTML = enterfield;
          document.getElementById("login").style.display="none";
        });
        socket.on("ok1", (message) => {
          console.log("ok1");
          document.getElementById("signup").innerHTML = "<h3>"+message+"</h3>";
        });
      }
      else{
        document.getElementById("signup").innerHTML = 'The entered email is incorrect or is not a Gmail!<br/><br/><h2>Sign Up</h2><input id="name" placeholder="Enter your name"/><br/><br/><input id="password" type="password" placeholder="Enter password"/><br/><br/><input id="email" placeholder="Enter your GMAIL adress" type="email"/><br/><br/><button onclick="signUp();">Sign Up</button>';
      }
    }
  });
}

//автологина не будет, прошу прощения у всех юзеров( Я его не сделал, тк хранить пароли запрещено и небезопасно, а как работать с идентификаторами сессий, куками и тп я не знаю
function login(){
  document.getElementById("wlcm").style.display="none";
  //сессионное хранилище в данном случае использую как хранилище для переменных, которые мне нужны за пределами функции, это безопасно, тк в этих переменных не хранятся данные о кодах и паролях
  sessionStorage.setItem("login", document.getElementById("userLogin").value);
  socket.emit("login", [document.getElementById("userLogin").value, document.getElementById("loginPassword").value]);
  document.getElementById("login").style.display="none";
  socket.on("ok2", (message) => {
    document.getElementById("login").innerHTML = "";
    document.getElementById("balance").style.display = "block";
    document.getElementById("balance").innerHTML = message[0];
    document.getElementById("signup").style.display="none";
    if(!message[1]){
      document.getElementById("login").style.display="block";
      document.getElementById("login").innerHTML = '<h2>Log In</h2><input id="userLogin" placeholder="Enter your card number" maxlength="8"/><br/><br/><input id="loginPassword" type="password"placeholder="Enter password"/><br/><br/><button onclick="login();">Login</button>';
    }
    else{
      document.getElementById("login").style.display="block";
      document.getElementById("login").innerHTML = '<h2>Availible operations:</h2><br/><br/><button onclick="transferField();" style="padding:2% 8% 2% 8%;">Transfer money to another account</button>';
    }
  });

  //здесь у меня выводится список прошедших операций 
  socket.on("logs", (logs) => {
    document.getElementById("operations").style.display="block";
    document.getElementById("operations").innerHTML = "<h3>Past operations:</h3><br/><br/>";
    logs.split("^").forEach(log => document.getElementById("operations").innerHTML += "<br/>"+log);
  });
}
function verificationRequest(){
  socket.emit("verification-ok", document.getElementById("verCode").value);
  socket.on("ok3", (message) => {
    document.getElementById("signup").innerHTML = message;
    document.getElementById("login").style.display="block";
  });
}

function transferField(){
  document.getElementById("login").innerHTML = '<input id="recipient" placeholder="Recipient card number" maxlength="8"/><br/><input id="amount" placeholder="Transfer amount"/><br/><input id="pass" placeholder="Password" type="password"/><br/><input id="vcode" placeholder="Verification code"maxlength="4"/><br/><input id="m" placeholder="Message"maxlength="50"/><br/><button onclick="transferRequest();">Send</button>';
  socket.emit("transferVerification", sessionStorage.getItem("login"));
}
function transferRequest(){
  document.getElementById("signup").style.display="none";
  document.getElementById("wlcm").style.display="none";
  socket.emit("transferRequest", [sessionStorage.getItem("login"), document.getElementById("recipient").value, document.getElementById("amount").value, document.getElementById("pass").value, document.getElementById("vcode").value, document.getElementById("m").value]);
  socket.on("ok4", (response) =>{
    document.getElementById("login").innerHTML = response+'<br/><br/><h2>Availible operations:</h2><br/><br/><button onclick="transferField();" style="padding:2% 8% 2% 8%;">Transfer money to another account</button>';
    const interval = setInterval(deleteError, 1000);
  });
  socket.on("balance", (balance) => {
    document.getElementById("balance").innerHTML = '<h1>Balance: '+balance+'$</h1>';
  });
  socket.on("operations", (operations) => {
    document.getElementById("operations").innerHTML = "<h3>Past operations:</h3><br/><br/>";
    operations.split("^").forEach(operation => document.getElementById("operations").innerHTML += "<br/>"+operation);
  });
}
let counter = 0;
let complete = false;
function deleteError(){
  if(!complete){
    if(counter == 10){
      document.getElementById("login").innerHTML = '<br/><br/><h2>Availible   operations:</h2><br/><br/><button onclick="transferField();" style="padding:2% 8%   2% 8%;">Transfer money to another account</button>';
      complete = true;
    }
    else{
      counter++;
    }
  }
}