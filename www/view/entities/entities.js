const entitiesViewTemplate = `

<div id="toolbar" class="toolbar">
  <button data-action="showSensorsList"><i class="material-icons">view_list</i><br>Entity List</button>
  <button data-action="createNewEntity"><i class="material-icons">devices_other</i><br>New Entity</button>
  <div class="entities-list-btns" style="display: none">
    <button data-action="removeNewEntity" class="inline"><i class="material-icons">search</i><span>Search Entity</span></button><br>
    <button data-action="removeEntity" class="inline"><i class="material-icons">clear</i><span>Remove Entity</span></button>
  </div>
  <div class="entities-list-btns" style="display: none">
    <button data-action="refresh" class="inline"><i class="material-icons">refresh</i><span>Refresh</span></button>
  </div>
  <hr class="vr">
  <button data-action="showTemplates"><i class="material-icons">bookmark_border</i><br>Templates</button>
</div>
<div class="remove-message" style="display:none">
  <span class="hint">Select all the entities you want to remove.</span>
  <button class="do-remove" style="display: none"></button>
  <button class="cancel-remove">Cancel</button>
</div>
<div class="content"></div>
`;

Promise.all([
  
  ViewLoader.loadStylesheet("view/entities/entities.css")
]).then(() => {
  

class EntitiesView extends View {
  
  constructor() {
    super(entitiesViewTemplate);
    
    $(this.content).addClass("entities-view");
    this.$removeMessage = this.$(".remove-message");
    this.$doRemoveBtn = this.$(".do-remove");
    
    this.loader = new ViewLoader(this.$(".content"));
    
    
    this.$toolbar.on("click", (event) => {
      
      var action = event.target.getAttribute("data-action");
      if(action) this[action]();
    });
    
    this.showSensorsList();
    
    //
    
    this.$doRemoveBtn.on("click", () => {
      
      var entitiesList = this.view;
      
      var entities = entitiesList.getSelectedEntities();
      $(... entitiesList.selection).remove();
      
      this.view.renumber();
      this.stopSelection();
      
      var promises = entities.map(entity => broker.delete("v2/entities/"+entity.id+"?type="+entity.type));
      Promise.all(promises).catch((err) => {
        
        alert("Deleting on or more enitities failed.\n"+err);
        this.view.refresh(); // TODO: might fail if view changed
      });
    });
    
    this.$(".cancel-remove").on("click", () => this.stopSelection());
  }

  get view() {
    
    return this.loader.view;
  }
  
  refresh() {
    
    this.view.refresh();
  }
  
  showSensorsList(refresh) {
    
    this.loader.setView("entities-list", (view) => {
      
      if(refresh) view.refresh();
      this.$(".entities-list-btns").show();
    });
  }
  
  createNewEntity(template, name) {
    
    this.loader.setView("entity", (view, initial) => {
      
      if(initial) {
        
        view.on("submit-new", (entity) => {
          
          broker.setEntityFilter(entity.type);
          this.showSensorsList(true);
        });
      }
      
      if(name) view.title = name;
      if(template) view.newEntity(template);
    });
    this.$(".entities-list-btns").hide();
  }
  
  removeEntity() {
    
    var list = this.view;
    
    if(list.selecting) {
      
      list.stopSelection();
      return;
    }
    
    //this.$removeMessage.show();
    
    list.startSelection([], "remove", (entities) => {
      
      if(entities && entities.length) {
    
        var confirm = window.confirm("You want to delete "+entities.length+(entities.length===1?" entity":" entities")+".\nThis cannot be undone.");
        if(confirm) {
          
          list.removeSelected();
          var promises = entities.map(entity => broker.delete("v2/entities/"+entity.id+"?type="+entity.type));
          Promise.all(promises).catch((err) => {

            alert("Deleting on or more enitities failed.\n"+err);
            list.refresh(); // TODO: might fail if view changed
          });
          list.stopSelection();
        }
      }
      
      // if(set.size == 0) this.$doRemoveBtn.hide();
      // else this.$doRemoveBtn.show().html(`Remove ${ set.size } ${ set.size > 1 ? "entities" : "entity"}.`);
    });
  }

  stopSelection() {
    
    this.$removeMessage.hide();
    this.$doRemoveBtn.hide();
    this.view.stopSelection();
  }
  
  showTemplates() {
    
    this.loader.setView("entity-templates", (view, init) => {
      
      if(init) view.on("submit", (template, name) => {
        
        this.createNewEntity(template, name);
      });
    });
  }
};


///////////////////////////////////////////////////////////


ViewLoader.define("entities", EntitiesView);

});



///////////////////////////////////////////////////////////


var Entity = {
  
  formatAttr(entity, attrId) {
    
    var attr = entity[attrId];
    var type = attr.type.toLowerCase();
    var value = attr.value;
    var unit = Entity.getUnit(attr);
    
    var $span = $("<span>").addClass("entity-attr");
    
    if(type === "geo:json") {
      
      var coords = (value && value.coordinates) || ["?", "?"];
      $span.addClass("icon").html('<i class="material-icons">location_on</i> '+attrId+": "+coords[0]+", "+coords[1]);
    } else if(type === "number" || type === "string") {
      
      $span.text(attrId+": "+value+" "+unit);
    } else if(type === "rectangle") {
      
      $span.addClass("icon").html('<i class="material-icons">crop_landscape</i>'+ attrId+": ")
        .append($("<span>").text(JSON.stringify(value)));
    } else if(type === "collection") {
      
      $span.addClass("icon").html('<i class="material-icons">view_list</i> '+attrId+": "+(value||[]).length+" Entities");
    } else if(type === "subscription") {
      
      $span.addClass("icon").html('<i class="material-icons">info_outline</i> '+attrId+": ")
        .append($("<span>").text(JSON.stringify(value)));
    }  else if(type === "polygon") {
      
      $span.addClass("icon").html('<i class="material-icons">panorama_horizontal</i> '+attrId+": "+(value||[]).length+" Points");
    }  else if(type === "assert") {
      
      var asserts = {eq: "=", neq: "≠", lte:"≤", gte:"≥", gt:"&gt;", lt:"&lt;"};
      $span.html('Assert <em>'+attrId+"</em>: "+value.map(assert => asserts[assert.type]+" "+assert.value).join(", "));
    } else {

      $span.text(attrId+": "+JSON.stringify(value));
    }

    return $span;
  },
  
  formatOwner(entity) {
    
    var owner = Entity.getOwner(entity);
    return $("<span>").text(owner?(owner===app.username?owner+" (You)":owner):"-");
  },
  
  formatType(entity) {
    
    var type = entity.type.toLowerCase();
    var $span = $("<span>");
    
    if(type==="person" || type==="user") {
      
      $span.addClass("icon").html('<i class="material-icons">person</i> Person');
    } else if(type === "sensingdevice") {
      
      $span.addClass("icon").html('<i class="material-icons">devices_other</i> SensingDevice');
    } else if(type === "fence") {
      
      $span.addClass("icon").html('<i class="material-icons">panorama_horizontal</i> Fence');
    } else if(type === "building") {
      
      $span.addClass("icon").html('<i class="material-icons">home</i> Building');
    } else if(type === "notification") {
      
      $span.addClass("icon").html('<i class="material-icons">visibility</i> Notification');
    } else {
      
      $span.text(entity.type);
    }
    
    return $span;
  },
  
  hasUnit(attr) {
    
    return !! attr.metadata.unit;
  },
    
  getOwner(entity) {
    
    return (entity.owner && entity.owner.value) || "";
  },
  
  getUnit(attr) {
    
    return (attr.metadata && attr.metadata.unit) ? attr.metadata.unit.value : "";
  },
  
  getAttrs() {
    
    return Object.keys(this)
      .filter(key => ! ["id", "type", "owner", "dateCreated", "dateModified"].includes(key))
  }
}
