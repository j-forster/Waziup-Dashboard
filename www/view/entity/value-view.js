class ValueView extends Events {
  
  constructor($container, entity, attr, tracking) {
    super();
    
    this.value = entity[attr].value;
    this.attr = attr;
    this.entity = entity;
    
    this.$view = $("<div class='value-view'>").appendTo($container);
    
    
    var type = entity[attr].type.toLowerCase();
    
    
    if(!(type in ValueView.View))
      type = "json";
    
    try {
      
      ValueView.View[type].call(this, entity, attr, tracking); 
    } catch(err) {
      
      console.error("Value-View %s error with value %o", type, entity[attr].value);
      this.$view.empty();
      entity[attr].value = null;
      ValueView.View[type].call(this, entity, attr, tracking); 
    }
    
    this.checkValue();
  }
  
  checkValue() {
    
    var hasChanged = this.hasChanged();
    this.$view.find("button.submit").prop("disabled", ! hasChanged);
    this.emit("change", this.getValue());
  }
  
  hasChanged() {

    return ! equals(this.getValue(), this.value);
    
    function equals(A, B) {
      
      if(A instanceof Object && B instanceof Object) {
        
        var keysA = Object.keys(A),
            keysB = Object.keys(B);
        
        if(keysA.length !== keysB.length)
          return false;
        
        for(var key of keysA)
          if(! equals(A[key], B[key]))
            return false;
        return true;
      }
      
      return A === B;
    }
  }
  
  getValue() {
    
    return null;
  }
  
  showHistory() {
    
    const maxValuePoints = 4000;
    
    var $chart = this.$view.children(".chart");
    if($chart.length) {

      this.$view.find(".date-start, .date-end").datepicker("destroy");
      this.$view.find(".time-start, .time-end").timepicker("remove");
      this.$view.find(".chart-select").datepair("remove").remove();
      $chart.remove();
    } else {

      $chart = $("<p class='chart chart-loading'>").appendTo(this.$view);
      var $chartSelect = $("<div class='chart-select'>").appendTo(this.$view);

      var timepicker = {
        showDuration: true,
        timeFormat: "g:ia"
      }, datepicker = {
        format: "m/d/yyyy",
        autoclose: true
      };

      var timeNow = new Date(),
        timePast = new Date();

      var rangeSelected = true,
          refreshBtn;

      timePast.setDate(timeNow.getDate() - 1); // yesterday

      $chartSelect.append([
        $("<input type='text' class='w15 date-start'>").datepicker(datepicker).datepicker('update', timePast),
        $("<input type='text' class='w15 time-start'>").timepicker(timepicker).timepicker('setTime', timePast),
        $("<span>").text(" to "),
        $("<input type='text' class='w15 time-end'>").timepicker(timepicker).timepicker('setTime', timeNow),
        $("<input type='text' class='w15 date-end'>").datepicker(datepicker).datepicker('update', timeNow)
      ]).datepair()
        .on("rangeSelected", () => { refreshBtn.prop("disabled", false) })
        .on("rangeIncomplete", () => { refreshBtn.prop("disabled", true) })
        .on("rangeError", () => { refreshBtn.prop("disabled", true) });

      refreshBtn = $("<button name='char-refresh'>")
        .text("Refresh")
        .appendTo($chartSelect)
        .on("click", refreshChart.bind(this));

      refreshChart.call(this);
      
      //

      function refreshChart() {

        var startDate = $chartSelect.find(".date-start").datepicker('getDate'),
            endDate = $chartSelect.find(".date-end").datepicker('getDate'),
            endTime = $chartSelect.find(".time-end").timepicker('getTime'),
            startTime = $chartSelect.find(".time-start").timepicker('getTime');

        startDate.setHours(startTime.getHours());
        startDate.setMinutes(startTime.getMinutes());
        endDate.setHours(endTime.getHours());
        endDate.setMinutes(endTime.getMinutes());
        if(startDate > endDate) return;

        $chart.empty().addClass("chart-loading");

        broker.visible("history", [[
          "v1/contextEntities/type/"+this.entity.type,
          "/id/"+this.entity.id,
          "/attributes/"+this.attr,
          "?hLimit="+maxValuePoints+"&hOffset=0",
          "&dateFrom="+startDate.toISOString(),
          "&dateTo="+endDate.toISOString()
        ].join("")], $chart, (data) => {

          $chart.show();

          
          var values = data.contextResponses[0].contextElement.attributes[0].values;
          
          if(values.length === 0) {

            $chart.text("There are no historical values available.");
          } else {

            $chart.removeClass("chart-loading").addClass("chart").empty();
            
            if(values.length === 4000) {
            
              $chart.html("<em>Maximum number of "+maxValuePoints+" values reached. Use a smaler time interval to show all values!</em>");
            }
            
            console.log(values.length);
            
            var unit = Entity.getUnit(this.entity[this.attr]);
            ChartHelper.make($chart, values, this.attr, unit, startDate, endDate);
          }
        });
      }
    }
  }
  
  submit() {
    
    this.$view.find("button.submit")
      .prop("disabled", true)
      .html('<i class="material-icons">hourglass_empty</i>');
    
    this.emit("submit", this.getValue(), (err) => {
      
      if(err) {
        
        alert("Faild to update value.\n"+err);
        this.$view.find("button.submit").prop("disabled", false).html('Submit');
      } else {
        
        this.value = this.getValue();
        this.$view.find("button.submit").prop("disabled", true).html('Submit');
      }
    });
  }
  
  
  remove() {
    
    if(this.$view.children(".chart").length)
      this.showHistory(); // will remove
    
    this.$view.remove();
  }
}


ValueView.View = {};

ValueView.View["json"] = function(entity, attr, tracking) {
  
  var value = entity[attr].value;
  
  var json = JSON.stringify(value, null, 2);
      
  this.$view.append([
    $("<span class='w100 small'>").text("JSON Value"),
    $("<textarea class='w100'>").attr("rows", json.split("\n").length).val(json).on("change", () => this.checkValue()),
    tracking && $("<button class='submit w15' disabled>").text("Submit").on("click", () => this.submit()),
  ]);

  this.getValue = () => {

    try {
      var value = this.$view.find("textarea").val();
      var obj = value === "" ? null : JSON.parse(value);
      this.$view.find("span").html("JSON Value: (ok)");
      return obj;
    } catch(err) {

      this.$view.find("span").html("JSON Value: !! Parsing Error !! "+err);
    }
    return null;
  };
}


ValueView.View["string"] = function(entity, attr, tracking) {
  
  var value = entity[attr].value || "";

  this.$view.append([
    $("<span class='w15'>").text("Value"),
    $("<input type='text' class='w70' placeholder='<empty String>'>").val(value).on("change", () => this.checkValue()),
    tracking && $("<button class='submit w15' disabled>").text("Submit").on("click", () => this.submit()),
  ]);

  this.getValue = () => this.$view.find("input").val();
}


ValueView.View["number"] = function(entity, attr, tracking) {
  
  var value = entity[attr].value || 0;
  
  this.$view.append([
    $("<span class='w15'>").text("Value"),
    $("<input type='number' class='w50'>").val(value).on("change", () => this.checkValue()),
    tracking && $("<button class='w20'>").html('<i class="material-icons">show_chart</i> History').on("click", () => this.showHistory()),
    tracking && $("<button class='submit w15' disabled>").text("Submit").on("click", () => this.submit())
  ]);

  this.getValue = () => this.$view.find("input").val()*1;
}


ValueView.View["assert"] = function(entity, attr, tracking) {
  
  var asserts = entity[attr].value || [];
  
  const options = `
<option value='neq' selected>≠</option>
<option value='eq' selected>=</option>
<option value='lte' selected>≤</option>
<option value='gte' selected>≥</option>
<option value='gt' selected>&gt;</option>
<option value='lt' selected>&lt;</option>
`;
  

  this.$view.append([
    $("<select class='w15 assert'>").html(options),
    $("<input type='number' class='w55' placeholder='0'>").val("").on("change", () => this.checkValue()),
    $("<button class='w15'>").text("More").on("click", () => addAssert.call(this)),
    tracking && $("<button class='submit w15' disabled>").text("Submit").on("click", () => this.submit())
  ]);
  
  for(var i=1; i<asserts.length; i++)
    addAssert.call(this);
  
  var selects = this.$view.find("select"),
      inputs = this.$view.find("input");
  
  asserts.forEach((assert, i) => {
    selects[i].value = assert.type;
    inputs[i].value = JSON.parse(assert.value);
  });

  this.getValue = () => {
    
    var selects = this.$view.find("select"),
        inputs = this.$view.find("input");
    
    var asserts = [];
    
    for(var i=0; i<selects.length; i++)
      if(inputs[i].value)
        asserts.push({
          type: selects[i].options[selects[i].selectedIndex].value,
          value: JSON.parse(inputs[i].value)
        });
    
    return asserts;
  };
  
  function addAssert() {
    
    var row = $("<div>")
      .appendTo(this.$view)
      .append([
        $("<select class='w15 assert'>").html(options),
        $("<input type='number' class='w55' placeholder='0'>").val("").on("change", () => this.checkValue()),
        $("<button class='w15'>").text("✕").on("click", () => {

          row.remove();
          this.checkValue();
        }),
      ]);
  }
}

ValueView.View["collection"] = function(entity, attr, tracking) {
  
  var entities = (entity[attr].value || []).slice();
  
  var $overlay = $("<div class='overlay'>").hide();
  
  this.$view.append([
    $("<span class='w70'>").text("Selected: "+entities.length+(entities.length===1?" entity.":" entities.")),
    $("<button class='w15'>").text("Select").on("click", () => select.call(this)),
    tracking && $("<button class='submit w15' disabled>").text("Submit").on("click", () => this.submit()),
    $overlay
  ]);

  this.getValue = () => entities;

  //
  
  function select() {
    
    var unit = Entity.getUnit(entity[attr]);
    
    $overlay.show();
    
    new ViewLoader($overlay).setView("entities-list", (list) => {

      list.setFilter(unit ? {
        type: unit
      } : null)
      list.startSelection(entities, "normal", (selectedEntities) => {
        
        if(selectedEntities) {
          
          entities = selectedEntities.map(entity => ({
            id: entity.id,
            type: entity.type
          }));
          this.$view.children("span").text("Selected: "+entities.length+(entities.length===1?" entity.":" entities."));
          this.checkValue();
        }
        
        $overlay.empty().hide();
      });
    });
  }
}



ValueView.View["subscription"] = function(entity, attr, tracking) {
  
  var users = (entity[attr].value || []).slice();
  var $overlay = $("<div class='overlay'>").hide();
  
  var $checkbox = $("<span class='w85 checkbox'>")
    .attr("checked", users.includes(app.username))
    .on("click", () => {
      if(users.includes(app.username)) {

        users.splice(users.indexOf(app.username), 1);
        $checkbox.attr("checked", false);
      } else {

        users.push(app.username);
        $checkbox.attr("checked", true);
      }

      this.checkValue();
    });
  
  this.$view.append([
    $checkbox,
    tracking && $("<button class='submit w15' disabled>").text("Submit").on("click", () => this.submit()),
  ]);

  this.checkValue = () => {
    
    $checkbox.text("Subscribe. "+
      "("+users.length+(users.length===1?" user":" users")+" total"+
      (users.includes(app.username)?(users.length===1?", you":", including you"):"")+
      ")");
    
    ValueView.prototype.checkValue.call(this);
  }
  
  this.getValue = () => users;
  
  this.submit = () => {

    this.$view.find("button.submit")
      .prop("disabled", true)
      .html('<i class="material-icons">hourglass_empty</i>');
    
    broker.get("v2/entities/"+entity.id+"/attrs/"+attr+"/value?type="+entity.type, (err, data) => {
      
      if(err) {
        
        alert("Faild to update value.\n"+err);
        this.$view.find("button.submit").prop("disabled", false).html('Submit');
        return;
      }
      
      data = data || [];
      
      var dataLength = data.length;
      
      if(users.includes(app.username) && !data.includes(app.username))
        data.push(app.username);
      else
        if(!users.includes(app.username) && data.includes(app.username))
          data.splice(data.indexOf(app.username), 1);
        
      if(dataLength !== data.length) {
        
        this.emit("submit", data, (err) => {
      
          if(err) {

            alert("Faild to update value.\n"+err);
            this.$view.find("button.submit").prop("disabled", false).html('Submit');
          } else {

            users = data;
            this.value = users;
            this.$view.find("button.submit").prop("disabled", true).html('Submit');
          }
        });
      } else {
        
        users = data;
        this.value = users;
        this.$view.find("button.submit").prop("disabled", true).html('Submit');
      }
    });
  }
}

ValueView.View["geo:json"] = function(entity, attr, tracking) {
  
  var coords = (entity[attr].value && entity[attr].value.coordinates) || [0, 0];

  var map;

  var center = ol.proj.transform([coords[1], coords[0]], 'EPSG:4326', 'EPSG:3857');

  var point  = new ol.Feature({
    geometry: new ol.geom.Point(center)
  });

  this.$view.append([
    $("<label class='w20'>").text("Location"),
    $("<input type='text' class='w65'>").val(coords.join(", ")).on("change", () => {

      var coords = [this.getValue().coordinates[1], this.getValue().coordinates[0]];
      var center = ol.proj.transform(coords, 'EPSG:4326', 'EPSG:3857');
      point.setGeometry(new ol.geom.Point(center));
      map.getView().setCenter(center);
      this.checkValue();
    }),
    tracking && $("<button class='submit w15' disabled>").text("Submit").on("click", () => this.submit()),
    $("<div class='w100 map'>")
  ]);

  this.getValue = () => ({
    type: "Point",
    coordinates: this.$view.find("input").val().split(",").map(parseFloat)
  });

  var source = new ol.source.Vector({
    features: [point]
  });

  var vectorLayer = new ol.layer.Vector({ source });

  map = new ol.Map({
    layers: [
      new ol.layer.Tile({
        source: new ol.source.OSM()
      }),
      new ol.layer.Image({
        source: new ol.source.ImageWMS({
          url: 'http://portal.i-locate.eu/geoserver/ilocate/wms',
          params: {'LAYERS': 'production_g'},
          ratio: 1,
          serverType: 'openlayers'
        })
      }),
      vectorLayer
    ],
    target: this.$view.find(".map")[0],
    controls: new ol.Collection(),
    view: new ol.View({
      center: center,
      zoom: coords+"" == "0,0" ? 2 : 17
    })
  });

  map.on("click", (event) => {

    var coords = ol.proj.transform(event.coordinate, 'EPSG:3857', 'EPSG:4326');
    coords = [coords[1], coords[0]]; // lat/lon > lon/lat
    point.setGeometry(new ol.geom.Point(event.coordinate));
    this.$view.find("input").val(coords.join(", "));
    this.checkValue();
  });

  map.setSize([600, 400]);
}


ValueView.View["rectangle"] = function(entity, attr, tracking) {

  var map;
  
  var $input = $("<input type='text' class='w65'>")
    .on("change", () => {
      fromString($input.val());
      this.checkValue();
    });
  
  this.$view.append([
    $("<label class='w20'>").text("Edges"),
    $input,
    tracking && $("<button class='submit w15' disabled>").text("Submit").on("click", () => this.submit()),
    $("<div class='w100 map'>")
  ]);

  var source = new ol.source.Vector({});

  var vectorLayer = new ol.layer.Vector({ source });

  map = new ol.Map({
    layers: [
      new ol.layer.Tile({
        source: new ol.source.OSM()
      }),
      new ol.layer.Image({
        source: new ol.source.ImageWMS({
          url: 'http://portal.i-locate.eu/geoserver/ilocate/wms',
          params: {'LAYERS': 'production_g'},
          ratio: 1,
          serverType: 'openlayers'
        })
      }),
      vectorLayer
    ],
    target: this.$view.find(".map")[0],
    controls: new ol.Collection(),
    view: new ol.View({
      center: [0, 0],
      zoom: entity[attr].value ? 17 : 2
    })
  });
  
  var draw = new ol.interaction.Draw({
    source: source,
    type: 'Circle',
    geometryFunction: ol.interaction.Draw.createBox()
  });
  
  map.addInteraction(draw);
  
  var feature = null;
  
  if(entity[attr].value) {
    
    var json = JSON.stringify(entity[attr].value);
    $input.val(json.substr(1, json.length-2));
    fromString($input.val());
  } else {
    
    $input.val("");
  }
  
  
  draw.on("drawend", (event) => {
    fromGeometry(event.feature.getGeometry().getCoordinates()[0])
    feature = event.feature;
    this.checkValue();
  });

  map.setSize([600, 400]);
  
  this.getValue = () => JSON.parse("["+$input.val()+"]");
  
  //
  
  function fromGeometry(edges) {
    
    if(feature) source.removeFeature(feature);
    if(! edges.length) {
      
      $input.val("[0, 0], [0, 0]");
      return;
    }
    
    var A = [-Infinity, -Infinity],
        B = [Infinity, Infinity];
    
    for(var point of edges) {
      B[0] = Math.min(B[0], point[0]);
      B[1] = Math.min(B[1], point[1]);
      A[0] = Math.max(A[0], point[0]);
      A[1] = Math.max(A[1], point[1]);  
    }

    A = ol.proj.transform(A, 'EPSG:3857', 'EPSG:4326');
    B = ol.proj.transform(B, 'EPSG:3857', 'EPSG:4326');
    
    $input.val(`[${ B[1] }, ${ B[0] }], [${ A[1] }, ${ A[0] }]`);
  }
  
  function fromString(str) {
    
    if(feature) source.removeFeature(feature);
    var edges = JSON.parse("["+str+"]");
    if(edges.length !== 2) return;
    
    var A = edges[0],
        B = edges[1];

    A = ol.proj.transform([A[1], A[0]], 'EPSG:4326', 'EPSG:3857');
    B = ol.proj.transform([B[1], B[0]], 'EPSG:4326', 'EPSG:3857');

    var geometry = new ol.geom.Polygon([[
      A,
      [A[0], B[1]],
      B,
      [B[0], A[1]]
    ]]);
    
    var extent = geometry.getExtent();
    
    feature = new ol.Feature({ geometry });
    
    source.addFeature(feature);

    map.getView().setCenter([(A[0]+B[0])/2, (A[1]+B[1])/2]);
    map.getView().fit(extent, { size: [600, 400] });
  }
}


ValueView.View["polygon"] = function(entity, attr, tracking) {

  var map;
  
  var $input = $("<input type='text' class='w65'>")
    .on("change", () => {
      fromString($input.val());
      this.checkValue();
    });
  
  this.$view.append([
    $("<label class='w20'>").text("Edges"),
    $input,
    tracking && $("<button class='submit w15' disabled>").text("Submit").on("click", () => this.submit()),
    $("<div class='w100 map'>")
  ]);

  var source = new ol.source.Vector({});

  var vectorLayer = new ol.layer.Vector({ source });

  map = new ol.Map({
    layers: [
      new ol.layer.Tile({
        source: new ol.source.OSM()
      }),
      new ol.layer.Image({
        source: new ol.source.ImageWMS({
          url: 'http://portal.i-locate.eu/geoserver/ilocate/wms',
          params: {'LAYERS': 'production_g'},
          ratio: 1,
          serverType: 'openlayers'
        })
      }),
      vectorLayer
    ],
    target: this.$view.find(".map")[0],
    controls: new ol.Collection(),
    view: new ol.View({
      center: [0, 0],
      zoom: entity[attr].value ? 17 : 2
    })
  });
  
  var draw = new ol.interaction.Draw({
    source: source,
    type: 'Polygon',
  });
  
  map.addInteraction(draw);
  
  var feature = null;
  
  if(entity[attr].value) {
    
    var json = JSON.stringify(entity[attr].value);
    $input.val(json.substr(1, json.length-2));
    fromString($input.val());
  } else {
    
    $input.val("");
  }
  
  
  draw.on("drawend", (event) => {
    fromGeometry(event.feature.getGeometry().getCoordinates()[0])
    feature = event.feature;
    this.checkValue();
  });

  map.setSize([600, 400]);
  
  this.getValue = () => JSON.parse("["+$input.val()+"]");
  
  //
  
  function fromGeometry(edges) {
    
    if(feature) source.removeFeature(feature);
    if(! edges.length) {
      
      $input.val("");
      return;
    }
    
    edges.pop();
    var json = JSON.stringify(edges
      .map(point => ol.proj.transform(point, 'EPSG:3857', 'EPSG:4326'))
      .map(point => [point[1], point[0]]));
    
    $input.val(json.substr(1, json.length-2));
  }
  
  function fromString(str) {
    
    if(feature) source.removeFeature(feature);
    var edges = JSON.parse("["+str+"]");

    edges = edges.map(point => ol.proj.transform([point[1], point[0]], 'EPSG:4326', 'EPSG:3857'))
    
    edges.push(edges[0]);

    var geometry = new ol.geom.Polygon([edges]);
    feature = new ol.Feature({ geometry });
    
    var extent = geometry.getExtent();
    
    source.addFeature(feature);
    
    var center = edges.reduce((a, b) => [a[0]+b[0], a[1]+b[1]], [0, 0])
      .map(c => c/edges.length);

    map.getView().setCenter(center);
    map.getView().fit(extent, { size: [600, 400] });
  }
}
