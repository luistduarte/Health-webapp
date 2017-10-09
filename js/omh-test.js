/*=================================================================
 =            Variable definitions and initializations            =
 =================================================================*/

var hearRateDataJSON;
var chart = null;

//data is reused if url is not changed
var currentData;

var loadingMessage = d3.select('.loading-message');
var datapointDetails = d3.select('.datapoint-details');
var clickInteraction = null;
var clickInteractionComponent = null;
var ecg_objs_tofill = {};
var hr_objs_tofill = {};
var acc_objs_tofill = {};

//an example of some settings for custom chart appearance
var settings = {
  'interface': {
    'axes': {
      'yAxis': {
        'visible': true
      },
      'xAxis': {

        'visible': true
      }
    },
    'tooltips': {
      'decimalPlaces': 4
    }
  },
  'measures': {
    'heart_rate': {
      'chart': {
        'styles': [{
          'name': 'blue-lines',
          'plotType': 'Line',
          'attributes': {
            'stroke': '#4a90e2'
          }
        }]
      },
      'yAxis': {
                'range': { 'min': 30, 'max': 220 },
                'label': 'bpm'
            }
    }
  }
};

/*=====  End of Variable definitions and initializations  ======*/


/*===================================================
 =            Example UI helper functions            =
 ===================================================*/

var hideLoadingMessage = function() {
  loadingMessage.classed('hidden', true);
};

var updateLoadingMessage = function(amountLoaded) {
  loadingMessage.classed('hidden', false);
  loadingMessage.text('Loading data... ' + Math.round(amountLoaded * 100) + '%');
};

var showLoadingError = function(error) {
  loadingMessage.classed('hidden', false);
  loadingMessage.html('There was an error while trying to load the data: <pre>' + JSON.stringify(error) + '</pre>');
};

var hideChart = function() {
  d3.select('.demo-chart').classed('hidden', true);
};

var showChart = function() {
  d3.select('.demo-chart').classed('hidden', false);
};

var disableUI = function() {
  d3.select('.measure-select').property('disabled', true);
  d3.select('.update-button').property('disabled', true);
};
var enableUI = function() {
  d3.select('.measure-select').property('disabled', false);
  d3.select('.update-button').property('disabled', false);
};

var updateDatapointDetails = function(datum) {

  // use the replacer to hide fields from the output
  var replacer = function(key, value) {
    if (key === 'groupName') {
      return undefined;
    } else {
      return value;
    }
  };

  if (datum.aggregationType) {
    // if the point is a aggregation of more than one point
    // then display the aggregation type and the points that were used
    var dataString = '';
    for (var i in datum.aggregatedData) {
      dataString += JSON.stringify(datum.aggregatedData[i], replacer, 4) + '\n\n';
      if (i < datum.aggregatedData.length - 1) {
        dataString += '<hr>\n';
      }
    }
    datapointDetails.html('<h3>Data Point Details: ' + datum.aggregationType + ' of points</h3> ' + dataString);
  } else {
    // otherwise just show the point
    datapointDetails.html('<h3>Data Point Details: single point</h3> ' + JSON.stringify(datum.omhDatum, replacer, 4));
  }

};

var showDatapointDetailsMessage = function(message) {
  datapointDetails.html('<h3>Data Point Details</h3> ' + message);
};


/*=====  End of Example UI helper functions  ======*/


/*====================================================
 =            Chart construction functions            =
 ====================================================*/

var customizeChartComponents = function(components) {

  //move any label overlayed on the bottom right
  //of the chart up to the top left
  var plots = components.plots;

  showDatapointDetailsMessage('Choose a measure that displays as a scatter plot to see details here.');

  plots.forEach(function(component) {

    if (component instanceof Plottable.Components.Label &&
      component.yAlignment() === 'bottom' &&
      component.xAlignment() === 'right') {

      component.yAlignment('top');
      component.xAlignment('left');

    }
    if (component instanceof Plottable.Plots.Scatter && component.datasets().length > 0) {

      scatterPlot = component;

      if (!clickInteraction) {
        clickInteraction = new Plottable.Interactions.Click()
          .onClick(function(point) {
            var nearestEntity;
            try {
              nearestEntity = scatterPlot.entityNearest(point);
              updateDatapointDetails(nearestEntity.datum);
            } catch (e) {
              return;
            }
          });
      }

      clickInteraction.attachTo(scatterPlot);
      clickInteractionComponent = scatterPlot;

      showDatapointDetailsMessage('Click on a point to see details here...');

    }

  });

  if (chart.getMeasures().indexOf('systolic_blood_pressure') > -1) {
    addDangerZone();
  }

};

var addDangerZone = function() {

  // get the existing styles from the chart so we can alter them
  var chartStyles = chart.getStyles();
  var scatterPlot = chart.getPlots(Plottable.Plots.Scatter)[0];

  // the value where a grid line is drawn,
  // above which points are colored red
  var dangerValue = 129;

  // these filter functions are used to determine which
  // points will be rendered with the style's attributes
  var dangerFilter = function(d) {
    // a filter function takes a datum and returns a boolean
    return d.y >= dangerValue;
  };

  // ChartStyles.filters contains a number of useful filters
  var systolicFilter = OMHWebVisualizations.ChartStyles.filters.measure('systolic_blood_pressure');

  // initialize new styles with the existing ones
  var plotStylesWithDanger = chartStyles.getStylesForPlot(scatterPlot);

  // add a 'danger zone' for systolic, using the filters defined above
  plotStylesWithDanger.push({
    'name': 'danger',
    'filters': [dangerFilter, systolicFilter],
    'attributes': {
      'fill': 'red'
    }
  });

  // replace styles for the plot with the extended danger-zone styles
  chartStyles.setStylesForPlot(plotStylesWithDanger, scatterPlot);

  // add a gridline for the danger zone
  chart.addGridline(dangerValue, 'Above ' + dangerValue + ' exceeds patient goal');

};

var makeChartForUrl = function(element, measureList, configSettings) {

  var makeChart = function(data) {

    //if data is from shimmer, the points are in an array called 'body'
    if (data.hasOwnProperty('body')) {
      data = data.body;
    }

    if (chart) {
      chart.destroy();
      if (clickInteraction && clickInteractionComponent) {
        clickInteraction.detachFrom(clickInteractionComponent);
      }
    }

    //builds a new plottable chart
    chart = new OMHWebVisualizations.Chart(data, element, measureList, configSettings);

    if (chart.initialized) {

      //customizes the chart's components
      customizeChartComponents(chart.getComponents());

      //renders the chart to an svg element
      showChart();
      hideLoadingMessage();
      chart.renderTo(element.select("svg").node());

      currentData = data;


    } else {

      hideChart();
      showLoadingError('Chart could not be initialized with the arguments supplied.');

    }

    enableUI();

  };

  disableUI();


  makeChart(hearRateDataJSON);

};

var cloneObject = function(object) {
  return JSON.parse(JSON.stringify(object));
};

var parseInputAndMakeChart = function() {

  var measureList = 'heart_rate';

  // Use settings specified at top of script, but overwrite
  // the step_count settings if it has been chosen in the menu.

  // This allows us to change the appearance of step_count data,
  // which normally defaults to a bar graph when shown with
  // minutes_of_moderate_activity, to a line graph when
  // shown on its own.

  var chartSettings = settings;

  if (measureList === 'step_count') {

    chartSettings = cloneObject(settings);

    chartSettings['measures']['step_count'] = {
      'yAxis': {
        'range': undefined
      },
      'data': {
        'xValueQuantization': {
          'period': OMHWebVisualizations.DataParser.QUANTIZE_MONTH
        }
      },
      'chart': {
        'type': 'line',
        'daysShownOnTimeline': undefined
      }
    };

  } else if (measureList === 'minutes_moderate_activity, step_count') {

    chartSettings = cloneObject(settings);

    chartSettings.interface.legend = {
      visible: true
    };


  } else if (measureList === 'heart_rate') {

    chartSettings = cloneObject(settings);

    chartSettings.interface.tooltips.visible = false;

  }

  makeChartForUrl(d3.select('.demo-chart-container'), measureList, chartSettings);

};

/*=====  End of Chart construction functions  ======*/

function useOMH() {
  //set up the UI elements
  console.log('using');
  d3.select('select').on('change', parseInputAndMakeChart);
  d3.select('.update-button').on('click', parseInputAndMakeChart);
  getHeartRate();
  //make the chart when the document is loaded

}

function getHeartRate () {
  var bearerToken = "Bearer " + getCookie("healthAuthToken");
  var patientID = window.location.search.substring(1).split('=')[1];
  var url = "v1.0.M1/dataPoints/caregiver?schema_namespace=omh&schema_name=heart-rate&schema_version=1.0&user_id="+patientID+"&CAREGIVER_KEY=someKey";
  var settings = {
    "async": true,
    "crossDomain": true,
    "url": url,
    "method": "GET",
    "headers": {
      "accept": "application/json",
      "authorization": bearerToken,
      "cache-control": "no-cache"
    }
  }

  $.ajax(settings).done(function (response) {
    console.log(response);
    hearRateDataJSON = response;
    parseInputAndMakeChart();
  });

}

function getPatientDemographics () {

    var bearerToken = "Bearer " + getCookie("healthAuthToken");
    var patientID = window.location.search.substring(1).split('=')[1];
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
      console.log('all patients', response);
      var currentPatient;
      response.forEach(function (patient) {
        if (patient.body.user_id == patientID) {
          currentPatient = patient;
        }
      });
      console.log('current patient', JSON.stringify(currentPatient));
      document.getElementById('user_id').value=currentPatient.body.user_id;

      document.getElementById('givenname').value=currentPatient.body.name[0].given.toString().replace(",", " ");

      document.getElementById('familyname').value=currentPatient.body.name[0].family.toString().replace(",", " ");

      if (currentPatient.body.gender == "male") {
        document.getElementById('gender').getElementsByTagName('option')[0].selected = 'selected';

      } else {
        document.getElementById('gender').getElementsByTagName('option')[1].selected = 'selected';

      }

      document.getElementById('date').value=currentPatient.body.birthDate;

      document.getElementById('district').value=currentPatient.body.contact[0].address[0].district;

      document.getElementById('streetaddress').value=currentPatient.body.contact[0].address[0].line[0];

      document.getElementById('city').value=currentPatient.body.contact[0].address[0].city;

      document.getElementById('zipcode').value=currentPatient.body.contact[0].address[0].postalCode;

      document.getElementById('phone').value=currentPatient.body.contact[0].telecom[1].value;

      document.getElementById('email').value=currentPatient.body.contact[0].telecom[0].value;

      if (currentPatient.body.photo[0].url) {
        document.getElementById("photo").src = currentPatient.body.photo[0].url;
      }



    });

}

function getAllData() {
  var date_init = new Date($("#date_init").val()).toISOString();
  var date_final = new Date($("#date_final").val()).toISOString();
  var select = document.getElementById("ecg-select");
  document.getElementById('leituras-div').style.display = "block";

  select.options.length = 0;
  //select.options[select.options.length] = new Option('', '0', false, true);
  console.log('init', date_init, 'final', date_final);
  ecg_objs_tofill = {};
  hr_objs_tofill = {};
  acc_objs_tofill = {};

  var patientID = window.location.search.substring(1).split('=')[1];
  var bearerToken = "Bearer " + getCookie("healthAuthToken");

  var url1 = "v1.0.M1/dataPoints/caregiver?schema_namespace=omh&schema_name=ecg&schema_version=1.0&user_id="+patientID+"&CAREGIVER_KEY=someKey"
  var settings1 = {
  "async": true,
  "crossDomain": true,
  "url": url1,
  "method": "GET",
  "headers": {
    "accept": "application/json",
    "authorization": bearerToken,
    "cache-control": "no-cache"
    }
  }
  var url2 = "v1.0.M1/dataPoints/caregiver?schema_namespace=omh&schema_name=heart-rate&schema_version=1.0&user_id="+patientID+"&CAREGIVER_KEY=someKey"

  var settings2 = {
    "async": true,
    "crossDomain": true,
    "url": url2,
    "method": "GET",
    "headers": {
      "accept": "application/json",
      "authorization": bearerToken,
      "cache-control": "no-cache"
      }
  }

  var url3 = "v1.0.M1/dataPoints/caregiver?schema_namespace=omh&schema_name=accelerometer&schema_version=1.0&user_id="+patientID+"&CAREGIVER_KEY=someKey"

  var settings3 = {
    "async": true,
    "crossDomain": true,
    "url": url3,
    "method": "GET",
    "headers": {
      "accept": "application/json",
      "authorization": bearerToken,
      "cache-control": "no-cache"
      }
  }

  $.ajax(settings1).done(function (responseECG) {
    var count = 0;
    console.log('response!', responseECG);

    responseECG.forEach (function(item) {
      current_item_date = item.body.effective_time_frame.date_time;
      if (current_item_date > date_init &&  current_item_date < date_final) {
        if (ecg_objs_tofill.hasOwnProperty(item.body.ecg.session)) {
          var x = ecg_objs_tofill[item.body.ecg.session].values;
          var y = item.body.ecg.values
          ecg_objs_tofill[item.body.ecg.session].values = x.concat(y);
        } else {
          ecg_objs_tofill[item.body.ecg.session] = {'date_time': item.body.effective_time_frame.date_time, 'values': item.body.ecg.values};
        }
      }

    });

    $.ajax(settings2).done(function (responseHR) {
      responseHR.forEach(function(item) {
        current_item_date = item.body.effective_time_frame.date_time;
        if (current_item_date > date_init &&  current_item_date < date_final) {
            if (hr_objs_tofill.hasOwnProperty(item.body.heart_rate.session)) {
              hr_objs_tofill[item.body.heart_rate.session].values.push(item);
            } else {
              hr_objs_tofill[item.body.heart_rate.session] = { values: [item]}
            }
        }
      });

      $.ajax(settings3).done(function (responseACC) {
        responseACC.forEach(function(item) {
          current_item_date = item.body.effective_time_frame.date_time;
          console.log('current ACC', item, 'date', current_item_date);

          if (current_item_date > date_init &&  current_item_date < date_final) {
              if (acc_objs_tofill.hasOwnProperty(item.body.accelerometer.session)) {
                acc_objs_tofill[item.body.accelerometer.session].values.push(item.body);
              } else {
                acc_objs_tofill[item.body.accelerometer.session] = { values: [item.body]};
              }
          }
        });
        console.log('acc', acc_objs_tofill);
        console.log('hr->', hr_objs_tofill);
        console.log('ecg', ecg_objs_tofill);

        Object.keys(ecg_objs_tofill).forEach(function(key) {
          var name_opt = 'Session ' + key;
          select.options[key] = new Option(name_opt, key, false, false);
        });

        Object.keys(hr_objs_tofill).forEach(function(key) {
            var name_opt = 'Session ' + key;
            select.options[key] = new Option(name_opt, key, false, false);
        });
        Object.keys(acc_objs_tofill).forEach(function(key) {
            var name_opt = 'Session ' + key;
            select.options[key] = new Option(name_opt, key, false, false);
        });

        var pos;
        for (pos = 0; pos < select.length; pos++) {
          console.log(pos,select[pos].value);
          if (select[pos].value == '') {
            select.remove(pos);
          }
        }

      });


    });



  });




}
function changeData() {
  var index_array = $( "#ecg-select" ).val();
  console.log('obj', ecg_objs_tofill[index_array]);
  if (ecg_objs_tofill.hasOwnProperty(index_array)) {
      document.getElementById('ecg-div').style.display = "block";
    var episode_data = ecg_objs_tofill[index_array].values;
    var date_init = new Date(ecg_objs_tofill[index_array].date_time)

    Highcharts.chart('container-ecg', {
        chart: {
            type: 'spline',
            zoomType: 'x'
        },
        title: {
            text: 'ECG Values Session'
        },
        xAxis: {
            type: 'datetime',
            labels: {
                overflow: 'justify'
            }
        },
        yAxis: {
            title: {
                text: 'mV)'
            },
            minorGridLineWidth: 0,
            gridLineWidth: 0,
            alternateGridColor: null
        },
        tooltip: {
            valueSuffix: ' mV'
        },
        plotOptions: {
            spline: {
                lineWidth: 1,
                states: {
                    hover: {
                        lineWidth: 1.5
                    }
                },
                marker: {
                    enabled: false
                },
                pointInterval: 2,
                pointStart: Date.UTC(1900+date_init.getYear(), date_init.getMonth(), date_init.getDay()+1, date_init.getHours(), date_init.getMinutes(), date_init.getSeconds())
            }
        },
        series: [{
            name: 'ECG',
            data: episode_data
        }],
        navigation: {
            menuItemStyle: {
                fontSize: '10px'
            }
        }
    });


  } else {

    document.getElementById('ecg-div').style.display = "none";
  }

  if (hr_objs_tofill.hasOwnProperty(index_array)) {
    document.getElementById('hr-div').style.display = "block";
    hearRateDataJSON = hr_objs_tofill[index_array].values;
    parseInputAndMakeChart();
  } else {
    document.getElementById('hr-div').style.display = "none";
  }

  if (acc_objs_tofill.hasOwnProperty(index_array)) {
    document.getElementById('acc-div').style.display = "block";
    var acc_datax = [];
    var acc_datay = [];
    var acc_dataz = [];
    var acc_data = [];
    console.log(acc_objs_tofill[index_array]);
    var start_time;
    acc_objs_tofill[index_array].values.forEach(function(data) {
      console.log(data);
      if (data.accelerometer.part_number == 1 ) {
        start_time = data.effective_time_frame.date_time;
      }
      acc_datax.push(data.accelerometer.values.x);
      acc_datay.push(data.accelerometer.values.y);
      acc_dataz.push(data.accelerometer.values.z);

      var accelationSquareRoot = (data.accelerometer.values.x * data.accelerometer.values.x + data.accelerometer.values.y * data.accelerometer.values.y + data.accelerometer.values.z * data.accelerometer.values.z) / (9.80665 * 9.80665);
      var acceleration = Math.sqrt(accelationSquareRoot);
      console.log('acc',acceleration );
      if ((acceleration-3.456522103440785) < 0) {
        acc_data.push(0);
      } else {
        acc_data.push(acceleration-3.456522103440785);
      }

    });
    console.log('ACCCC DATA', acc_data);
    var start_date = new Date(start_time);
    console.log('start!', start_date);
    Highcharts.chart('container-acc', {
        chart: {
            type: 'spline',
            zoomType: 'x'
        },
        title: {
            text: 'Accelerometer values'
        },
        xAxis: {
            type: 'datetime',
            labels: {
                overflow: 'justify'
            }
        },
        yAxis: {
            title: {
                text: '(m/s)'
            },
            minorGridLineWidth: 0,
            gridLineWidth: 0,
            alternateGridColor: null
        },
        tooltip: {
            valueSuffix: ' m/s'
        },
        plotOptions: {
            spline: {
                lineWidth: 4,
                states: {
                    hover: {
                        lineWidth: 5
                    }
                },
                marker: {
                    enabled: false
                },
                pointInterval: 1000, // one seccond
                pointStart: Date.UTC(1900+start_date.getYear(), start_date.getMonth(), start_date.getDay()+1, start_date.getHours(), start_date.getMinutes(), start_date.getSeconds())
            }
        },
        series: [{
            name: 'x-values',
            data: acc_datax
        },
        {
            name: 'y-values',
            data: acc_datay
        },{
            name: 'z-values',
            data: acc_dataz
        }, {
          name: 'acceleration-values',
          data: acc_data
        }],
        navigation: {
            menuItemStyle: {
                fontSize: '10px'
            }
        }
    });
  } else {
    document.getElementById('acc-div').style.display = "none";
  }



}
