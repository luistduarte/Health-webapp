function checkLog(){
  console.log('checkingLog');
  console.log(getCookie("healthUser"));
    if(getCookie("healthUser")=="") {
      toastr.warning("Efetue Login na Plataforma!!");
      setTimeout(function(){ window.location.href = "signin.html"; }, 2000);
    }

    else
        document.location.href= "users.html";
}
function canOpen(){
  console.log(getCookie("healthUser"));
    if(getCookie("healthUser")=="") {
      window.location.href = "index.html";
    }
}

function fillTopMenu() {
  console.log('fillTopMenu');
  window.onload = function what(){
    if(getCookie("healthUser")==="")
    {
      document.getElementById("loggedOrNot").innerHTML=
               '<form class="navbar-form pull-right"> \
                     <button type="button" class="btn" onclick="document.location.href = \'signin.html\'">Entrar</button> \
                     <button type="button" class="btn" onclick="document.location.href = \'signup.html\'">Registar</button> \
                </form>';

    }
    else{
      document.getElementById("loggedOrNot").innerHTML=
             '<form class="navbar-form pull-right">'+
             '<ul class="nav"> \
                 <li class="dropdown"> \
                     <button id="name-button" class="btn" data-toggle="dropdown" >'+getCookie("healthUser")+'</button> \
                     <ul class="dropdown-menu"> \
                         <li><a id="logout-button" onclick="logOUT();">Sair</a></li> \
                     </ul> \
                 </li> \
             </ul> \
             </form>';
      toastr.success('Sessão aberta com '+getCookie("healthUser"));
    }
  };
}
function logOUT(){
  console.log('Doing Logout');
     setCookie("healthUser","",1);
     setCookie("healthAuthToken","",1);
     document.location.href= "index.html";
}

function doLogin() {
  var username = $("#username").val();
  //var username = 'omh1';
  var password = $("#password").val();
  //var password = 'omh1';

  var formData = new FormData();
  formData.append('grant_type','password');
  formData.append('username', username);
  formData.append('password', password);

  $.ajax({
    "async": true,
    "crossDomain": true,
    "url": "oauth/token/",
    "method": "POST",
    "headers": {
     "accept": "application/json",
     "authorization": "Basic dGVzdENsaWVudDp0ZXN0Q2xpZW50U2VjcmV0",
     "cache-control": "no-cache"
    },
    "processData": false,
    "contentType": false,
    "mimeType": "multipart/form-data",
    "data": formData
  }).done(function(data) {
    var response = JSON.parse(data);
    console.log(response);
    setCookie("healthUser",username,1);
    setCookie("healthAuthToken",response.access_token,1);


     console.log(getCookie("healthUser"));
     console.log(getCookie("healthAuthToken"));
     document.location.href= "/";

  }).catch(function(error){
      if (error.status == 400)
      {
        toastr.warning('Credenciais Incorretas!');
      }
  });
}
function registerNewAccount() {

  var username = $("#username").val();
  var password = $("#password").val();
  var password2 = $("#password2").val();

  if( username.length < 4) {
    toastr.warning('4 caracteres mínimos para o utilizador!');
  } else if(password.length < 6 ) {
    toastr.warning('Password muito pequena! Mínimo 6 caracteres');
  }else if(password !== password2) {
    toastr.warning('As passwords não são iguais!');
  } else {

    var data = JSON.stringify({
      "username": username,
      "password": password
    });
    var settings = {
      "async": true,
      "crossDomain": true,
      "url": "users/",
      "method": "POST",
      "headers": {
        "accept": "application/json",
        "content-type": "application/json",
        "cache-control": "no-cache",
        "postman-token": "1458d7c1-7168-2f56-9153-d124bd10bc20"
      },
      "processData": false,
      "data": data
    }

    $.ajax(settings).done(function (response) {
      toastr.success('Utilizador criado com sucesso! Pode fazer login agora!');
      setTimeout(function(){ window.location.href = "index.html"; }, 1000);
    }).catch(function(error){
        if (error.status == 409)
        {
          toastr.options.closeButton = true;
          toastr.warning('O utilizador já existe!');
        }
    });
  }
}
