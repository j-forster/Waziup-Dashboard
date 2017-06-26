
const entitiesListTemplate = `
<div class="head">
  <button name='select'>Select</button>
  <span>Click to select entities.</span>
  <button name='cancel'>✕ Cancel</button>
</div>
<table class="normal">
  <thead>
    <tr>
      <td></td>
      <td>ID</td>
      <td>Entity Type</td>
      <td>Owner</td>
      <td>Values</td>
    </tr>
  </thead>
  <tbody></tbody>
</table>

<div class="message"></div>
`;

Promise.all([
  ViewLoader.loadScript("view/entities/entities.js"),
  ViewLoader.loadStylesheet("view/entities/entities.css"), // fouc
]).then(() => {
  

class EntitiesList extends View {
  
  constructor() {
    super(entitiesListTemplate);
    
    $(this.content).addClass("entities-list");
    this.$message = this.$(".message");
    this.$head = this.$(".head");
    this.$table = this.$("tbody");
    
    this.$select = this.$("[name='select']");
    this.$cancel = this.$("[name='cancel']");
    
    this.state = -1;
    
    this.refresh = this.refresh.bind(this);
    //this.refresh();
    
    this.entities = [];
    this.entityFilter = null;
    
    //
    
    this.selecting = false;
    this.selection = [];
    this.selectionCallback = null;
    
    this.$table.on("click", (event) => {
      
      var tr = $(event.target).closest("tr[data-entity]"),
        id = tr.attr("data-entity"),
        type = tr.attr("data-type");

      if(this.selecting) {

        tr.toggleClass("selected");
        if(tr.is(".selected")) {
          
          for(var entity of this.selection)
            if(entity.id === id && entity.type === type)
              return;
          
          var entity = this.entities.find(entity => entity.id === id && entity.type === type)
          if(entity) this.selection.push(entity);
          
        } else {
          
          this.selection = this.selection.filter(entity => entity.id !== id || entity.type !== type);
        }
        
        this.$select.text("Select "+this.selection.length+(this.selection.length!==1?" entities.": " entity."));
      } else {

        app.pinEntity({id, type});
      }
    });
    
    this.on("refresh", () => {
      
      if(this.selecting) {
        
        this.selection.forEach(entity => this.$("tr"+
          "[data-entity='"+entity.id+"']"+
          "[data-type='"+entity.type+"']"
        ).addClass("selected"));
      }
    });
    
    //
    
    this.$cancel.on("click", () => {
      
      this.selectionCallback(null);
      this.stopSelection();
    });
    
    this.$select.on("click", () => {
      
      this.selectionCallback(this.selection);
      this.stopSelection();
    });
  }
  
  load() {
    
    broker.on("change", this.refresh);
    if(this.state !== broker.state)
      this.refresh();
    
    super.load(... arguments);
  }
  
  unload() {
    
    broker.off("change", this.refresh);
    super.unload(... arguments);
  }
  
  setFilter(filter) {
    
    this.entityFilter = filter || null;
    if(this.loaded)
      this.refresh();
  }
  
  removeSelected() {
    
    this.$table.children(".selected").remove();
    this.renumber();
  }
  
  startSelection(preselected, type, onSelecting) {
    
    this.stopSelection();
    
    this.selection = (preselected || []).slice();
    this.selecting = true;
    this.selectionCallback = onSelecting;
    $(this.content).add(this.$table).addClass("selecting").attr("data-select", type)
    this.$head.show();
    
    this.selection.forEach(entity => this.$("tr"+
      "[data-entity='"+entity.id+"']"+
      "[data-type='"+entity.type+"']"
    ).addClass("selected"));
    
    this.$select.text("Select "+this.selection.length+(this.selection.length!==1?" entities.": " entity."));
  }
  
  stopSelection() {
    
    this.selecting = false;
    this.selectionCallback = null;
    this.selection = new Set;
    $(this.content).add(this.$table).removeClass("selecting").removeAttr("data-select");
    this.$head.hide();
    this.$table.children().removeClass("selected");
  }
  
  /*
  getSelectedIds() {
    
    return Array.from(this.selection)
      .map(tr => $(tr).attr("data-entity"));
  }
  
  setSelectedIds(ids) {
    
    this.$table.children().removeClass("selected");
    
    for(var id of ids)
      this.$("tr[data-entity='"+id+"']").addClass("selected");
    
    this.selection = new Set(this.$table.children(".selected"));
    this.selectingCallback(this.selection);
  }
  */
  
  renumber() {
    
    this.$table.children().each((i, tr) => {
      
      $(tr.firstElementChild).html(i+1);
    });
  }
  
  appendEntity(entity) {
    
    this.entities.push(entity);
    
    var i = this.$table.children().length+1;
    
    this.$table.append($("<tr>")
      .attr("data-entity", entity.id)
      .attr("data-type", entity.type)
      .append($("<td>").text(i))
      .append($("<td>").text(entity.id))
      .append($("<td>").append(Entity.formatType(entity)))
      .append($("<td>").append(Entity.formatOwner(entity)))
      .append($("<td>").append(getEntityAttrs())));
    
    //
    
    function getEntityAttrs() {
      
      return $("<ul>").append(
        Entity.getAttrs.call(entity)
          .map(attr => $("<li>")
            .append(Entity.formatAttr(entity, attr))   
            
            /* .on("click", (event) => {
              event.stopPropagation();
              app.setView(["attribute", entity.id, entity.type, attr].join("#"));
            }) */
          )
        );
    }
    
    function getEntityAttr(id) {
      
      return document.createTextNode(id+": "+entity[id].value+" ("+entity[id].type+")");
    }
    
    function getEntityOwner() {
      
      return document.createTextNode(entity.owner ? entity.owner.value : "-");
    }
  }
  
  refresh() {
    
    this.state = broker.state;
    
    this.$table.empty();
    this.$("table").addClass("empty");
    this.entities = [];
    
    var filter = this.entityFilter || broker.entityFilter;

    broker.visible("GET", ["v2/entities?"+broker.normalizeEntityFilter(filter)], this.$message, (entities) => {
      
      
      if(entities.length) {

        this.$("table").removeClass("empty");
        entities.forEach(entity => this.appendEntity(entity));
      } else {

        this.$("table").addClass("empty");
        this.$message.show().html('<h1>There are not entities in this list.</h1>');
      }
      
      this.emit("refresh");
    });
  }
}

ViewLoader.define("entities-list", EntitiesList);

});
