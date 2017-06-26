
const entityTemplatesTemplate = `
<h1>Common Entities</h1>
<div class="box" data-template="SensingDevice">
  <i class="material-icons">devices_other</i>
  <h2>SensingDevice</h2>
</div>
<div class="box" data-template="Person">
  <i class="material-icons">perm_identity</i>
  <h2>Person</h2>
</div>
<hr>
<h1>Location Entities</h1>
<div class="box" data-template="Fence">
  <i class="material-icons">panorama_horizontal</i>
  <h2>Fence</h2>
</div>
<div class="box" data-template="Building">
  <i class="material-icons">home</i>
  <h2>Building</h2>
</div>
<hr>
<h1>Notification / Observation</h1>
<div class="box" data-template="Notification">
  <i class="material-icons">visibility</i>
  <h2>Notification</h2>
</div>
<hr>
<h1>Other</h1>
<div class="box" data-template="Empty">
  <i class="material-icons">devices_other</i>
  <h2>Empty Template</h2>
</div>
<div class="box" data-template="_Entity">
  <i class="material-icons">dashboard</i>
  <h2>All Attributes</h2>
</div>

`;

var EntityTemplate = {
  SensingDevice: {
    "": {
      type: "Number",
      value: null,
      metadata: {}
    },
    id: "",
    type: "SensingDevice",
    location: {
      type: "geo:json",
      value: {
        type: "Point",
        coordinates: [0, 0]
      },
      metadata: {}
    }
  },
  
  Person: {
    id: "",
    type: "Person",
    name: {
      type: "String",
      value: ""
    },
    location: {
      type: "geo:json",
      value: {
        type: "Point",
        coordinates: [0, 0]
      },
      metadata: {}
    }
  },
  
  Fence: {
    id: "",
    type: "Fence",
    name: {
      type: "String",
      value: ""
    },
    entities: {
      type: "Collection",
      value: [],
      metadata: {
        unit: {
          type: "String",
          value: "Person"
        }
      }
    },
    notify: {
      type: "Subscription",
      value: []
    },
    outline: {
      type: "Polygon",
      value: null
    }
  },
  
  Building: {
    id: "",
    type: "Building",
    name: {
      type: "String",
      value: ""
    },
    bounds: {
      type: "Rectangle",
      value: null
    }
  },
  
  Notification: {
    id: "",
    type: "Notification",
    name: {
      type: "String",
      value: ""
    },
    entities: {
      type: "Collection",
      value: [],
      metadata: {
        unit: {
          type: "String",
          value: "Person"
        }
      }
    },
    notify: {
      type: "Subscription",
      value: []
    },
    "": {
      type: "assert",
      value: []
    }
  },
  
  Empty: {
    id: "",
    type: "SensingDevice"
  },
  
  _Entity: {
    id: "",
    type: "SensingDevice",
    name: {
      type: "String",
      value: ""
    },
    entities: {
      _hint_: "A collection is a list of entities. Use this for grouping etc.",
      type: "Collection",
      value: [],
      metadata: {
        unit: {
          type: "String",
          value: "Person"
        }
      }
    },
    notify: {
      _hint_: "A subscription is based on a list of entities, the subscribers. Click to insert yourself into the list.",
      type: "Subscription",
      value: []
    }, 
    location: {
      _hint_: "A geographical location. Lat / Long",
      type: "geo:json",
      value: {
        type: "Point",
        coordinates: [0, 0]
      },
      metadata: {}
    },
    outline: {
      _hint_: "A polygon is a series of geographical points os by fences.",
      type: "Polygon",
      value: null
    },
    bounds: {
      _hint_: "A rectangle is based on geographical point, used to outline things.",
      type: "Rectangle",
      value: null
    },
    "": {
      _hint_: "Insert any JSON value below.",
      type: "JSON",
      value: {
        this_is_a: "json value :)"
      }
    }
  }
};

var EntityTemplateTitle = {
  SensingDevice: '<i class="material-icons">devices_other</i> New SensingDevice',
  Person: '<i class="material-icons">perm_identity</i> New Person',
  Fence: '<i class="material-icons">panorama_horizontal</i> New Fence',
  Building: '<i class="material-icons">home</i> New Building',
  Notification: '<i class="material-icons">visibility</i> New Notification',
  Empty: '<i class="material-icons">devices_other</i> New Entity',
  GeneralTemplate: '<i class="material-icons">dashboard</i> New Entity'
}

Promise.all([
  ViewLoader.loadScript("view/entities/entities.js"),
  ViewLoader.loadStylesheet("view/entities/entities.css"), // fouc
]).then(() => {
  

class EntityTemplatesView extends View {
  
  constructor() {
    super(entityTemplatesTemplate);
    
    $(this.content).addClass("entity-templates-view");
    this.$("[data-template]").on("click", (event) => {
      
      var name = $(event.currentTarget).attr("data-template");
      this.submitTemplate(name);
    });
  }
  
  submitTemplate(name) {
    
    var template = EntityTemplate[name],
        name = EntityTemplateTitle[name];
    
    template = JSON.parse(JSON.stringify(template));
    
    this.emit("submit", template, name);
  }
}

ViewLoader.define("entity-templates", EntityTemplatesView);

});
