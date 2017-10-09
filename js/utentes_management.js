function fillUtentes() {

  var gridster;

  $(function() {
      gridster = $(".gridster > ul").gridster({
          widget_margins: [5, 5],
          widget_base_dimensions: [100, 100],
          min_cols: 10
      }).data('gridster');

  });


  var gridster_data = $(".gridster ul").gridster().data('gridster');

  var bearerToken = "Bearer " + getCookie("healthAuthToken");

  var settings = {
    "async": true,
    "crossDomain": true,
    "url": "v1.0.M1/dataPoints?schema_namespace=omh&schema_name=patient-demographics&schema_version=1.0",
    "method": "GET",
    "headers": {
      "accept": "application/json",
      "authorization": bearerToken,
      "cache-control": "no-cache"
    }
  }
  $.ajax(settings).done(function (response) {
    console.log('Use this obj to fill grid', response);
    var x = 0;
    var col_ind = 0;
    var row_ind = 1;

    var user_to_fill = {};
    response.forEach (function(item) {
      var item_user = item.body.user_id;
      user_to_fill[item_user] = item.body;
    });
    console.log('user_to_fill', user_to_fill);

    Object.keys(user_to_fill).forEach(function(key) {

      var value = user_to_fill[key];
      col_ind++;

      if (col_ind == 3)
      {

        row_ind++;
        col_ind = 1;
      }
      console.log(col_ind, row_ind);
      var img_url;
      if (value.photo[0].url) {
        img_url = value.photo[0].url;
      } else {
        img_url = "img/unknown-user.png";
      }
      gridster_data.add_widget(
              '<li class="gs_w" style="background-color: gainsboro; width: 220px;x">\
              <center><a href="user-info.html?id='+key+'" id="colmGridName">' +
              value.name[0].given[0] + "  " + value.name[0].family[0] +
              '</a></center>\
              <center><a href="user-info.html?id='+value.user_id+'"> \
               <img id="colmGridImage" width="130"  src="' + img_url + ' "/>\
              </a></center>\
              </center></li>', 1, 1, col_ind ,row_ind);



    });





    console.log(response);
  });
}

function guid() {
  function s4() {
    return Math.floor((1 + Math.random()) * 0x10000)
      .toString(16)
      .substring(1);
  }
  return s4() + s4() + '-' + s4() + '-' + s4() + '-' +
    s4() + '-' + s4() + s4() + s4();
}

function addUser() {

  // fill body
  var user_id = $("#user_id").val();
  var given_name = $("#givenname").val();
  var familyname = $("#familyname").val();
  var birthDate = $("#date").val();
  var photourl = $("#photourl").val();
  if (! photourl) {
    photourl = $('img[alt="photo"]').attr('src');
  }

  var gender;
  if ($("#gender").val() == "Masculino") {
    gender = "male";
  } else {
    gender = "female";
  }

  var district = $("#district").val();
  var streetaddress = $("#streetaddress").val();
  var city = $("#city").val();
  var zipcode = $("#zipcode").val();

  var phone = $("#phone").val();
  var email = $("#email").val();

  console.log('info', user_id, given_name, familyname, gender, date, district, streetaddress, city, zipcode, phone, email);

  var familyname_array = familyname.split(" ");
  var givenname_array = given_name.split(" ");

  var name_array = [
                    { "use" : "official",
                      "family" : familyname_array,
                      "given": givenname_array
                    }
                  ];
  var telecom_array = [
                        {
                          "system": "email",
                          "value": email,
                          "use": "work"
                        },
                        { "system": "phone",
                          "value": phone,
                          "use": "home"
                        }
                      ];
  var address_array = [
                        {
                          "use": "home",
                          "type": "both",
                          "line": [ streetaddress ],
                          "city": city,
                          "district": district,
                          "postalCode": zipcode
                        }
                      ];
  var body = { "user_id": user_id,
                "gender": gender,
                "birthDate": birthDate,
                "name": name_array,
                "contact": [{
                  "telecom": telecom_array,
                  "address": address_array
                }],
                "photo": [{
                    "url": photourl
                  }]
              };
  console.log("Body", body);

  // fill header
  var acquisition_provenance = {
    "source_name": "Web-App",
    "source_creation_date_time": new Date().toISOString(),
    "modality": "self-reported"
  };
  var schema_id = {
    "namespace": "omh",
    "name": "patient-demographics",
    "version": "1.0"
  };
  var header = {
    "id" : guid(),
    "acquisition_provenance" : acquisition_provenance,
    "schema_id": schema_id
  };

  console.log("Header", header);
  var datapoint = {
    header : header,
    body: body
  }
  console.log('new datapoint', datapoint);

  var bearerToken = "Bearer " + getCookie("healthAuthToken");
  var settings = {
    "async": true,
    "crossDomain": true,
    "url": "v1.0.M1/dataPoints/",
    "method": "POST",
    "headers": {
      "accept": "application/json",
      "authorization": bearerToken,
      "content-type": "application/json",
      "cache-control": "no-cache",
    },
    "processData": false,
    "data": JSON.stringify(datapoint)
  }

  $.ajax(settings).done(function (response) {
    console.log(response);
    toastr.success('Utente Adicionado com Sucesso!');
    setTimeout(function(){ window.location.href = "/users.html"; }, 1000);
  });


}
