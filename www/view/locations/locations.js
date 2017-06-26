const locationsViewTemplate = `
<div class="brand"></div>
`;

const locationsFooterTemplate = `
<span class="checkbox" name="show-streetmap" checked>Show Streetmap</span>
<span class="checkbox" name="show-buildings" checked>Show Buildings</span>
<hr class="vr">
`;


const LocationsSidebarTemplate = `
<div class="locations-sidebar">
  <div class="head">
    <button name="entities" class="active">Entities</button>
    <button name="fences">Fences</button>
    <i class="material-icons" title="Create Fence">add</i>
    <button name="buildings">Buildings</button>
    <i class="material-icons" title="Create Building">add</i>
  </div>
  <ul class="entities"></ul>
  <ul class="fences" style="display:none"></ul>
  <ul class="buildings" style="display:none"></ul>
</div>
`;

Promise.all([
  
  ViewLoader.loadScript("view/entities/entities.js"),
  ViewLoader.loadStylesheet("view/locations/locations.css"),
  ViewLoader.loadStylesheet("style/ol.css"),
  ViewLoader.loadScript("js/ol.js")
]).then(() => {


class LocationsView extends View {
  
  constructor() {
    super(locationsViewTemplate);
    
    $(this.content).addClass("locations-view content");
    
    this.$sidebar = $(LocationsSidebarTemplate);
    this.$footer = $(locationsFooterTemplate);
    this.$showBuildingsCheckbox = this.$footer.filter("[name='show-buildings']");
    this.$showStreetmapCheckbox = this.$footer.filter("[name='show-streetmap']");
    
    this.$brand = this.$(".brand");
    
    this.$buildings = this.$sidebar.find(".buildings");
    this.$entities = this.$sidebar.find(".entities");
    this.$fences = this.$sidebar.find(".fences");
    
    this.layers = null;
    this.map = null;
    
    this.refreshEntity = this.refreshEntity.bind(this);
    this.entities = {};
    this.fences = {};
    
    //
    
    this.$sidebar.find(".head").on("click", (event) => {
      
      this.$sidebar.find(".head button").removeClass("active");
      $(event.target).addClass("active");
      
      this.$sidebar.find("ul").hide();
      this.$sidebar.find("ul."+$(event.target).attr("name")).show();
    });
    
    //
    
    this.$sidebar.find("[name='buildings'] + i").on("click", () =>
      app.setView("entity#"+JSON.stringify({
        _template_: {
          id: "",
          type: "Building",
          name: {
            type: "String",
            value: "My new Building",
          },
          bounds: {
            type: "Rectangle",
            value: null,
            _hint_: "A rectangle around the buildings geographical border."
          }
        }
      }))
    );
    
    this.$sidebar.find("[name='fences'] + i").on("click", () =>
      app.setView("entity#"+JSON.stringify({
        _template_: {
          id: "",
          type: "Fence",
          name: {
            type: "String",
            value: "My new Fence",
          },
          entities: {
            type: "Collection",
            value: null,
            _hint_: "Select all entities, that are bound to this fence."
          },
          outline: {
            type: "Polygon",
            value: null,
            _hint_: "The geographical border - a polygon."
          },
          notify: {
            type: "Subscription",
            value: null,
            _hint_: "Click to get notified if an event occurs."
          }
        }
      }))
    );
    
    //
    
    this.currentEntity = null;
    this.$popup = $("<div class='popup'>");
    this.popup = new ol.Overlay({
      element: this.$popup[0],
      stopEvent: false
    });
    
    
    
    //
    
    this.$showBuildingsCheckbox.on("click", toggleCheckbox.bind(this));
    this.$showStreetmapCheckbox.on("click", toggleCheckbox.bind(this));
    
    function toggleCheckbox(event) {
      
      var checkbox = $(event.target);
      checkbox.attr("checked", ! checkbox.attr("checked"));
      
      var showStreetmap = !! this.$showStreetmapCheckbox.attr("checked"),
          showBuildings = !! this.$showBuildingsCheckbox.attr("checked");
      
      this.layers[0].setVisible(showStreetmap);
      this.layers[1].setVisible(showBuildings);
      
      if(!showBuildings || showStreetmap) this.$brand.empty();
    }
  }
  
  refreshBuildings() {
    
    this.$buildings.empty();
    
    broker.get("v2/entities?type=Building", (err, data) => {
      
      if(err) {
        console.error("Failed to load buildings list.", err);
        return;
      }
      
      data.forEach(building => {
        
        if(! building.bounds || ! building.bounds.type === "Rectangle"
          || ! building.name || ! building.name.type === "String") {
          
          console.warn("Unaccepted building: ", building);
          return;
        }
        
        new LocationsView.Building(this, building); 
      });
    });
  }
  
  load(parentNode) {
    
    super.load(parentNode);
    
    if(! this.map)
      this.init();
    
    $("#sidebar .inner").append(this.$sidebar);
    $("#footer").prepend(this.$footer);
    this.refreshBuildings();
    this.refreshEntites();
    this.refreshFences();
  }
  
  refreshEntites() {
    
    broker.get("v2/entities?q=location", (err, data) => {
      
      if(err) {
        console.error("Failed to load location entity list.", err);
        return;
      }
      
      Object.values(this.entities).forEach(entity => broker.unsubscribe(entity, this.refreshEntity));
      
      var entities = data.filter(entity => entity.location && entity.location.type === "geo:json");
      entities.forEach(entity => {
        
        broker.subscribe(entity, this.refreshEntity);
        
        if(entity.id in this.entities)
          this.entities[entity.id].setLocation(entity.location.value.coordinates);
        else
          this.entities[entity.id] = new LocationsView.Entity(this, entity);
      });
    });
  }
  
  refreshEntity(entity) {
    
    if(entity.location && entity.location.type === "geo:json" && entity.id in this.entities)
      this.entities[entity.id].setLocation(entity.location.value.coordinates);
  }
  
  refreshFences() {
    
    broker.get("v2/entities?type=Fence", (err, data) => {
      
      if(err) {
        console.error("Failed to load location fences list.", err);
        return;
      }
      
      var fences = data.filter(fence =>
        (fence.name && fence.name.type === "String") &&
        (fence.outline && fence.outline.type === "Polygon"));
      
      fences.forEach(fence => {
        
        if(fence.id in this.fences)
          this.fences[fence.id].updateWith(fence);
        else
          this.fences[fence.id] = new LocationsView.Fence(this, fence);
      });
    });
  }
  
  unload() {
    
    super.unload();
    this.$footer.detach();
    this.$sidebar.detach();
    this.unsubscribe();
  }
  
  unsubscribe() {
    
    Object.values(this.entities).forEach(entity => broker.unsubscribe(entity, this.refreshEntity));
  }
  
  init() {
    
    this.vectorSource = new ol.source.Vector({});

    this.layers = [
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
      new ol.layer.Vector({
        source: this.vectorSource
      })
    ];
    
    this.map = new ol.Map({
      layers: this.layers,
      target: this.content,
      controls: new ol.Collection(),
      view: new ol.View({
        center: [0, 0],
        zoom: 2
      })
    });

    this.map.addOverlay(this.popup);
    
    this.map.on("pointermove", (event) => {
      
      var feature = this.map.forEachFeatureAtPixel(event.pixel, (feature, layer) => feature),
          entity = (feature && feature.entity) || null,
          canvas = this.map.getTarget();

      if(entity) {
        
        if(entity !== this.currentEntity) {
          
          this.currentEntit = entity;
          canvas.style.cursor = "pointer";
          this.$popup.show().text(nameOfEntity(entity));
          this.popup.setPosition(feature.getGeometry().getCoordinates());
        }
        
      } else {
        
        this.currentEntity = null;
        canvas.style.cursor = "";
        this.$popup.hide();
      }
    });
    
    this.map.on("click", (event) => {
      
      var feature = this.map.forEachFeatureAtPixel(event.pixel, (feature, layer) => feature),
          entity = (feature && feature.entity) || null;

      if(entity) {
        
        app.pinEntity(entity);
      }
    });
  }
};

  
//
  
LocationsView.Entity = class Entity {
  
  
  constructor(view, entity) {

    this.id = entity.id;
    this.type = entity.type;
    
    this.point = new ol.Feature({});
    this.point.entity = entity;
    
    view.vectorSource.addFeature(this.point);
    
    this.setLocation(entity.location.value.coordinates);
    
    var $edit = $("<span class='edit'>")
      .html('<i class="material-icons">reply</i>')
      .attr("title", "Edit "+nameOfEntity(entity))
      .on("click", (event) => {
        event.stopPropagation();
        app.pinEntity(entity);
      });
    
    $("<li>")
      .append([
        window.Entity.formatType(entity),
        $("<strong>").text(" "+nameOfEntity(entity)),
        $edit
      ])
      .attr("title", "Click to zoom to "+nameOfEntity(entity))
      .appendTo(view.$entities)
      .on("click", () => {
      
        view.map.getView().setCenter(this.coords);
        if(view.map.getView().getZoom() < 16)
          view.map.getView().setZoom(20);
      });
  }
  
  get coords() {
    
    return ol.proj.transform([this.location[1], this.location[0]], 'EPSG:4326', 'EPSG:3857');
  }
  
  setLocation(loc) {
    
    this.location = loc;
    this.point.setGeometry(new ol.geom.Point(this.coords));
  }
}
  
  
LocationsView.Fence = class Fence {
  
  
  constructor(view, fence) {

    this.id = fence.id;
    this.type = "Fence";
    
    this.feature = new ol.Feature({});
    this.vectorSource = view.vectorSource;
    
    this.updateWith(fence);
    
    var $edit = $("<span class='edit'>")
      .html('<i class="material-icons">reply</i>')
      .attr("title", "Edit "+nameOfEntity(fence))
      .on("click", (event) => {
        event.stopPropagation();
        app.pinEntity(fence);
      });
    
    $("<li>")
      .html('<i class="material-icons">panorama_horizontal</i> ')
      .append([
        $("<span>").text(nameOfEntity(fence)),
        $edit
      ])
      .appendTo(view.$fences)
      .on("mouseover", () => {
      
        this.vectorSource.addFeature(this.feature);
      })
      .on("mouseout", () => {
      
        this.vectorSource.removeFeature(this.feature);
      })
      .on("click", () => {
      
        var extent = this.feature.getGeometry().getExtent();
        view.map.getView().fit(extent, { size: view.map.getSize() });
      });
  }
  
  updateWith(data) {
    
    var outline = data.outline.value;
    
    var edges = outline.map(point => ol.proj.transform([point[1], point[0]], 'EPSG:4326', 'EPSG:3857'))
    
    edges.push(edges[0]);

    var geometry = new ol.geom.Polygon([edges]);
    this.feature.setGeometry(geometry);
  }
}
  
  
LocationsView.Building = class Building {
  
  
  constructor(view, building) {

    var bounds = building.bounds.value,
        name = nameOfEntity(building);
    
    var A = bounds[0],
        B = bounds[1];

    A = ol.proj.transform([A[1], A[0]], 'EPSG:4326', 'EPSG:3857');
    B = ol.proj.transform([B[1], B[0]], 'EPSG:4326', 'EPSG:3857');

    var geometry = new ol.geom.Polygon([[
      A,
      [A[0], B[1]],
      B,
      [B[0], A[1]]
    ]]);

    var extent = geometry.getExtent();
    
    //
    
    var $edit = $("<span class='edit'>")
      .html('<i class="material-icons">reply</i>')
      .attr("title", "Edit "+name)
      .on("click", (event) => {
        event.stopPropagation();
        app.pinEntity(building);
      });
    
    $("<li>")
      .html('<i class="material-icons">home</i> ')
      .append([
        $("<span>").text(name),
        $edit
      ])
      .appendTo(view.$buildings)
      .on("click", () => {

        view.$brand.text(name);
        view.map.getView().fit(extent, { size: view.map.getSize() });
      });
  }
}

///////////////////////////////////////////////////////////
  

function nameOfEntity(entity) {
  
  return (entity.name && entity.name.type === "String") ? entity.name.value : entity.id;
}

//

ViewLoader.define("locations", LocationsView);
  
});
