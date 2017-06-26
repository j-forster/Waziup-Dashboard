
const entityViewTemplate = `

<div class="entity modal">
  <h2><i class="material-icons">devices_other</i> New Entity</h2>
  <div class="edata" style="display:none">
    <label class="w40 small">Owner</label><label class="w30 small">Created</label><label class="w30 small">Modified</label>
    <input type="text" name="owner" class="w40" disabled><input type="text" name="created" class="w30" disabled><input type="text" name="modified" class="w30" disabled>
  </div>
  <p>
    <label class="w15">ID</label><input type="text" name="id" class="w85" placeholder="My Sensor 1">
    <label class="w15">Type</label><input type="text" name="type" class="w85" value="SensingDevice">
  </p><p>
    <label class="w90">Attributes</label><button class="w10" name="add-attr"></button>
    <label class="w35 small">Name</label><label class="w30 small">Type</label><label class="w35 small">Unit</label>
  </p>
  <ul class="attributes"></ul>
  <p class="error" style="display: none"></p><p>
    <button name="modify-entity" class="w25 primary" style="display:none">Apply Changes</button><!--
 --><button name="create-entity" class="w25 primary" style="display:none">Create Entity</button><!--
 --><button name="reset-entity" class="w20">Reset</button>
  </p>
</div>
<div class="message"></div>
`;

const reservedEntityKeys = ["id", "dateCreated", "dateModified", "owner", "type"];

const emptyEntity = {
  id: "",
  type: "",
  metadata: {}
}

const emptyEntityAttribute = {
  name: "",
  type: "",
  metadata: {},
  value: null
}

Promise.all([
  ViewLoader.loadScript("view/entities/entities.js"),
  ViewLoader.loadStylesheet("view/entities/entities.css"), // fouc
  
  ViewLoader.loadScript("js/ol.js"),
  ViewLoader.loadStylesheet("style/ol.css"),
  ViewLoader.loadScript("view/entity/chart-helper.js"),
  ViewLoader.loadScript("view/entity/chart.bundle.js"),
  ViewLoader.loadScript("view/entity/datepair.js"),
  ViewLoader.loadScript("view/entity/jquery.datepair.js"),
  ViewLoader.loadScript("view/entity/jquery.timepicker.js"),
  ViewLoader.loadStylesheet("view/entity/jquery.timepicker.css"),
  ViewLoader.loadScript("view/entity/bootstrap-datepicker.js"),
  ViewLoader.loadStylesheet("view/entity/bootstrap-datepicker.css"),
  ViewLoader.loadScript("view/entity/value-view.js")
]).then(function onDependenciesLoaded() {


class EntityView extends View {
  
  constructor() {
    super(entityViewTemplate);
    $(this.content).addClass("content");
    
    this.$title = this.$("h2");
    this.$entity = this.$(".entity");
    this.$error = this.$(".error");
    this.$ul = this.$("ul");
    this.$id = this.$("[name='id']");
    this.$type = this.$("[name='type']");
    this.$owner = this.$("[name='owner']");
    this.$created = this.$("[name='created']");
    this.$modified = this.$("[name='modified']");
    this.$message = this.$(".message");
    this.$edata = this.$(".edata");
    
    this.$addAttrBtn = this.$("[name='add-attr']");
    this.$createEntityBtn = this.$("[name='create-entity']");
    this.$modifyEntityBtn = this.$("[name='modify-entity']");
    this.$resetEntityBtn = this.$("[name='reset-entity']");
    
    this.tracking = false;
    this.entity = null;
    this.virginEntity = null;
    
    //
    
    this.$addAttrBtn.on("click", () => this.appendNewAttr());
    
    //
    
    this.$createEntityBtn.on("click", () => this.submitNew());
    this.$modifyEntityBtn.on("click", () => this.submitModified());
    this.$resetEntityBtn.on("click", () => this.setEntity(this.entity));
    
    //
    
    this.$id.on("change", () => {
      
      this.entity.id = this.$id.val();
    });
    
    this.$type.on("change", () => {
      
      this.entity.type = this.$type.val();
    });
  }
  
  appendNewAttr() {
    
    var name = "__temporary";
    var i = 1;
    while((name+i) in this.entity) i++
    name += i;
    
    this.entity[name] = {
      value: null,
      type: "Number",
      metadata: {}      
    }
    
    this.appendAttr(name, false);
  }
  
  appendAttr(name, tracking) {

    var attr = this.entity[name];
    
    var $li = $("<li>")
      .appendTo(this.$ul)
      .attr("data-attr", name)
      .attr("data-value", JSON.stringify(attr.value));
    
    var value = attr.value;
    
    var $head = $("<div>")
      .appendTo($li)
      .addClass("head")
      .append([
        attr._hint_ && $("<label class='w100 small'>")
          .text(attr._hint_),
        $("<input type='text' name='attrId' class='w35' placeholder='NewAttribute'>")
          .prop("disabled", tracking)
          .on("change", onNameChange.bind(this))
          .val(name.startsWith("__")?"":name),
        $("<input type='text' name='attrType' class='w30' placeholder='Number'>")
          .prop("disabled", tracking)
          .on("change", onTypeChange.bind(this))
          .val(tracking?attr.type:(attr.type==="Number"?"":attr.type)),
        $("<input type='text' name='attrUnit' class='w30' placeholder='-'>")
          .prop("disabled", tracking)
          .on("change", onUnitChange.bind(this))
          .val(Entity.getUnit(attr)),
        /* $("<input type='number' name='attrValue'>")
          .on("change", onValueChange.bind(this))
          .addClass(tracking?"w15":"w20")
          .val(attr.value),
        $("<div>")
          .addClass("placeholder")
          .addClass(tracking?"w15":"w20"), */
        $("<button class='w5 small'>")
          .on("click", onRemoveAttrClick.bind(this))
          .attr("title", "Remove this attribute.")
          .text("✕")
      ])
    .on("click", showValue.bind(this))
    
    
    var $attrType = $head.find("[name='attrType']"),
        $attrId = $head.find("[name='attrId']"),
        $attrUnit = $head.find("[name='attrUnit']"),
        $placeholder = $head.find(".placeholder");
    
    showValue.call(this);
    
    /*
    if(tracking) {
      li.append($("<button class='w5 small'>")
        // .on("click", () => app.setView(["attribute", this.$id.val(), this.$type.val(), attr].join("#")))
        .on("click", showHistorical.bind(this))
        .attr("title", "See historical values.")
        .html(`<i class="material-icons">keyboard_arrow_right</i>`));
    
    }
    */
    
    
    return $li;
    
    //
    
    var valueView = null;
    
    function showValue() {
      
      if(! valueView) {
    
        valueView = new ValueView($li, this.entity, name, tracking);
        valueView.on("submit", submitValue.bind(this));
        valueView.on("change", onValueChange.bind(this));
      }
    }
    
    function onNameChange() {
      
      var newName = $attrId.val();
      if(newName in this.entity) {
        alert("Attribute name '"+newName+"' is already in use.");
        var i=2;
        while((newName+i) in this.entity) i++;
        newName += i;
        $attrId.val(newName)
      }
      
      var attr = this.entity[name];
      delete this.entity[name];
      this.entity[newName] = attr;
      name = newName;
      
      onChange.call(this);
    }
    
    function onUnitChange() {
      
      this.entity[name].metadata.unit = {
        value: $attrUnit.val(),
        type: "String"
      }
      
      onChange.call(this);
    }
    
    function onTypeChange() {
      
      this.entity[name].type = $attrType.val()
      
      if(valueView) {
        valueView.remove();
        valueView = null;
      }
      
      showValue.call(this);
      onChange.call(this);
    }
    
    function onValueChange(value) {
      
      //$li.attr("data-value", JSON.stringify(value));
      this.entity[name].value = value;
    }
    
    function onRemoveAttrClick(event) {
      
      if(tracking) {
        
        var flagDelete = $li.toggleClass("flag-delete").hasClass("flag-delete");
        $li.children("input").prop("disabled", flagDelete);
        this.showModBtnIfMod();
        
        if(valueView) {
          valueView.remove();
          valueView = null;
        }
      } else {
        
        $li.remove();
        delete this.entity[name];
      }
      
      event.stopPropagation();
    }
    
    function submitValue(val, cb) {
      
      this.entity[name].value = value;
      
      this.submitValue(name, val, (err) => {
        
        if(! err) $li.addClass("flag-changed");
        setTimeout(() => $li.removeClass("flag-changed"), 1600);
        cb(err);
      });
    }
    
    function onChange(event) {
      
      if(this.tracking) {
        
        if(! isUntouched()) $li.addClass("flag-new");
        else $li.removeClass("flag-new");
      }
      
      this.showModBtnIfMod();
    }
    
    function isUntouched() {
      
      return ! $attrId.val() && ! $attrUnit.val();
    }
  }
  
  submitValue(attr, value, cb) {
    
    console.info("Value "+this.id+"."+attr, value);
    broker.put("v2/entities/"+this.id+"/attrs/"+attr+"/value", value, cb);
  }
  
  showModBtnIfMod() {
    
    var isModified = this.$(".flag-changed, .flag-new, .flag-delete").length != 0;
    this.$modifyEntityBtn.prop("disabled", ! isModified);
  }
  
  load(parentNode, name) {
    
    var json = name.split("#", 2)[1];
    
    super.load(parentNode);
    
    if(! this.entity) {
      
      if(json) {

        var entity = JSON.parse(json);

        if(entity._template_)
          this.newEntity(entity._template_);
        else
          if(this.$id.val() !== entity.id || this.$type.val() !== entity.type)
              this.loadEntity(entity.id, entity.type);

      } else {

        this.newEntity();
      }
    }
    
    this.$("[name='id']")[0].focus();
  }
  
  set title(html) {
    
    this.$title.html(html);
  }
  
  get title() {
    
    return this.$title.html();
  }
  
  newEntity(template) {
    
    this.tracking = false;

    template = template || {
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
    }
    
    template.owner = {
      value: app.username
    }
    
    this.setEntity(template);
    
    this.$createEntityBtn.show();
    this.$resetEntityBtn.show();
    this.$modifyEntityBtn.hide();
  }
  
  modifyEntity(entity) {
    
    this.$createEntityBtn.hide();
    this.$resetEntityBtn.show();
    this.$modifyEntityBtn.show().prop("disabled", true);
    this.setEntity(entity);
  }
  
  setEntity(entity) {
    
    this.entity = entity;
    
    this.$(".flag-changed").removeClass("flag-changed");
    this.$(".flag-new").removeClass("flag-new");
    this.$(".flag-deleted").removeClass("flag-deleted");
    if(this.tracking) this.$modifyEntityBtn.show().prop("disabled", true);
    
    this.$owner
      .val((entity.owner && entity.owner.value) || "-")
      .attr("data-value", entity.owner ? entity.owner.value : "");
    this.$created
      .val(entity.dateCreated ? new Date(entity.dateCreated.value).toLocaleString() : "-")
      .attr("data-value", entity.dateCreated ? entity.dateCreated.value : "");
    this.$modified
      .val(entity.dateModified ? new Date(entity.dateModified.value).toLocaleString() : "-")
      .attr("data-value", entity.dateModified ? entity.dateModified.value : "");
    this.$edata.show();
    
    this.$resetEntityBtn.off("click").on("click", () => this.setEntity(entity));

    this.$id.val(entity.id).prop("disabled", this.tracking).attr("placeholder", "My "+(entity.type||"Entity")+" 1");
    this.$type.val(entity.type).prop("disabled", this.tracking);
    
    //var coords = entity.location ? entity.location.value.coordinates.join(", ") : "";
    //this.$location.val(coords).attr("data-value", coords);

    this.$ul.empty();
    var attrs = Object.keys(entity)
      .filter(key => ! reservedEntityKeys.includes(key))
      .map(attr => this.appendAttr(attr, this.tracking));

    // this.appendAttr();

    this.$entity.show();
  }
  
  loadEntity(id, type) {
    
    this.title = `<i class="material-icons">devices_other</i> Entities / `+id;
    this.$entity.hide();
    this.tracking = true;

    var path = "v2/entities/"+id+"?type="+type+"&attrs=dateModified,dateCreated,*";
    broker.visible("GET", [path], this.$message, (data) => this.modifyEntity(data));
  }
  
  submitNew() {
    
    var entity = this.getEntity();
    if(! entity) return;
    
    if(app.username) {
      
      entity.owner = {
        type: "String",
        value: app.username
      }
    }
    
    entity = JSON.parse(JSON.stringify(entity));
    for(var key in entity)
      if(typeof entity[key] === "object")
        delete entity[key]._hint_;
    
    broker.post("v2/entities", entity, (err, data) => {
      
      if(err) {
        
        alert("Failed to create the entity.\n"+err.message+"\n"+JSON.stringify(data, null, 2));
      } else {
        
        this.newEntity();
        this.emit("submit-new", entity);
      }
    });
  }
  
  get id() {
    
    return this.$id.val();
  }
  
  get type() {
    
    return this.$type.val();
  }
  
  getEntity() {
      
    return this.entity;
  }
  
  submitModified() {
    
    var entity = this.getEntity();
    if(! entity) return;
    
    var id = entity.id,
        type = entity.type;
    
    // DELETE
    
    var deletePromises = Array.from(this.$ul.children(".flag-delete"))
      .map(li => ({
        id: $(li).find("[name='attrId']").val(),
        type: $(li).find("[name='attrType']").val()
      }))
      .map(attr => broker.delete("v2/entities/"+id+"/attrs/"+attr.id /* +"?type="+attr.type */));
    
    Promise.all(deletePromises).then(() => {
      
      this.$ul.children(".flag-delete").remove();
      
      // CREATE
      
      var newAttrs = Array.from(this.$ul.children(".flag-new"))
        .map(li => $(li).find("[name='attrId']").val());
      
      var createPromises = newAttrs
        .map(attrId => ({[attrId]: entity[attrId]}))
        .map(attr => { delete attr._hint_; return attr })
        .map(attr => broker.post("v2/entities/"+id+"/attrs", attr));
      
      Promise.all(createPromises).then(() => {

        this.$ul.children(".flag-new").remove();
        newAttrs.forEach(attr => this.appendAttr(attr, true))

        this.$modifyEntityBtn.prop("disabled",  true);
        this.$resetEntityBtn.off("click").on("click", () => this.setEntity(entity));

      }, (error) => {

        alert("Failed to create one or more attributes of '"+id+"'.\n"+error.message);
        this.loadEntity(id, type);
      }); 
      
    }, (error) => {
      
      alert("Failed to delete one or more attributes of '"+id+"'.\n"+error.message);
      this.loadEntity(id, type);
    });
    
    //
    
    function attrFromLi(li) {
      
      var attr = {};
      attr[$(li).find("[name='attrId']").val()] = {
        type: $(li).find("[name='attrType']").val(),
        value: 0
      }
      return attr;
    }
  }
}

ViewLoader.define("entity", EntityView);

//

}, function onDependenciesFail(err) {
  
ViewLoader.define("entity", null, err);
});
