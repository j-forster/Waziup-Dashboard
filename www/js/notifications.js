class Notifications extends Events {
  
  constructor(username) {
    super();
    
    this.entities = new Set;
    this.triggers = [];
    this.check = this.check.bind(this);
    
    this.$list = $("<div class='notifications-list free'>")
      .appendTo("body")
      .html("<ul></ul>")
    
    this.$opener = $("<div class='notifications-opener'>")
      .text("Notifications")
      .appendTo("#footer")
      .on("mouseover", () => {
      
        this.$list.addClass("visible");
      })
      .on("mouseout", () => {
      
        this.$list.removeClass("visible");
      })
      .on("click", () => {
      
        this.$list.toggleClass("attached");
        $("#content").toggleClass("notifications-indent");
        dispatchEvent(new Event("resize")); // for ol.js
      });

    this.refreshTrigger();
  }
  
  refreshTrigger() {
    
    var Fence = Notifications.Fence,
        ValueObs = Notifications.ValueObservation;
    
    broker.get("v2/entities?type=Fence,Notification", (err, data) => {
      
      this.triggers = [];
      
      if(err) {
        console.error("Failed to get notifications for triggering.", err);
        return;
      }
      
      for(var entity of data) {
        
        if(Fence.matches(entity)) {
          
          var fence = new Fence(entity);
          if(fence.affected) this.triggers.push(fence);
          
        } else if(ValueObs.matches(entity)) {
          
          var valueObs = new ValueObs(entity);
          if(valueObs.affected) this.triggers.push(valueObs);
        } else {
          
          console.warn("Skipped mal formatted notification entity.", entity);
        }
      }
      
      if(this.triggers.length) {
        
        Push.Permission.request(null, null /* showPermissionError */);
      }
      
      this.refreshSubscriptions();
    });
  }
  
  refreshSubscriptions() {
    
    var entities = new Set;
    for(var trigger of this.triggers) {
      
      for(var entity of trigger.entities)
        entities.add(entity);
    }
    
    Array.from(this.entities)
      .map(entity => entity.split("@"))
      .map(entity => ({id: entity[0], type: entity[1]}))
      .forEach(entity => broker.unsubscribe(entity, this.check));
    
    Array.from(entities)
      .map(entity => entity.split("@"))
      .map(entity => ({id: entity[0], type: entity[1]}))
      .forEach(entity => broker.subscribe(entity, this.check));
    
    this.entities = entities;
  }
  
  check(entity) {
    
    this.triggers.forEach(trigger => trigger.check(entity));
  }
    
  push(title, text, icon, cb) {
    
    Push.create(title, {
      body: text,
      icon: icon,
      timeout: 10000,
      onClick: function () {
        if(cb) cb();
        this.close();
      }
    });
    
    this.$opener.addClass("flash");
    setTimeout(() => this.$opener.removeClass("flash"), 1000);
    
    var list = this.$list[0];
    var scrolledDown = list.scrollTop === (list.scrollHeight - list.offsetHeight);
    
    $("<li class='flash'>")
      .append([
        $("<img>").attr("src", icon),
        $("<h3>").text(title),
        $("<p>").text(text)
      ])
      .on("click", cb)
      .css("cursor", cb && "pointer")
      .appendTo(this.$list.find("ul"));  
    
    if(this.$list.find("li").length > 40)
      this.$list.find("li:first-child").remove();
    
    if(scrolledDown) list.scrollTop = list.scrollHeight - list.offsetHeight;

  }
}


Notifications.Fence = class Fence {
  
  static matches(entity) {
    
    return entity.type === "Fence" &&
      entity.outline && entity.outline.type.toLowerCase() === "polygon" &&
      entity.entities && entity.entities.type.toLowerCase() === "collection" &&
      entity.notify && entity.notify.type.toLowerCase() === "subscription";
  }
  
  constructor(fence) {
    
    this.innerEntities = new Set;
    this.entities = fence.entities.value.map(entity => entity.id+"@"+entity.type);
    this.outline = fence.outline.value;
    this.affected = fence.notify.value.includes(app.username);
    this.name = (fence.name && fence.name.type.toLowerCase() === "String") ? fence.name.value : fence.id;
  }
  
  check(entity) {
    
    if(entity.location && entity.location.type === "geo:json") {
      
      if(this.entities.includes(entity.id+"@"+entity.type))
        this.testEntity(entity);
    }
  }

  
  testEntity(entity) {
    
    var key = entity.id+"@"+entity.value;
    
    if(this.isInpolygon(entity.location.value.coordinates)) {
      
      this.innerEntities.add(key);
    } else {
      
      if(this.innerEntities.has(key)) {
        
        this.innerEntities.delete(key);
        notifications.push(
          "Fence Notification",
          entity.id+" ("+entity.type+") is now outside "+this.name+".",
          "img/info_outline.png", () => {
            
            app.pinEntity(entity);
          });
      }
    }
  }
  
  isInpolygon(point) {
    // https://github.com/substack/point-in-polygon/blob/master/index.js
    
    var x = point[0], y = point[1];
    
    var inside = false;
    for (var i = 0, j = this.outline.length - 1; i < this.outline.length; j = i++) {
        var xi = this.outline[i][0], yi = this.outline[i][1];
        var xj = this.outline[j][0], yj = this.outline[j][1];
        
        var intersect = ((yi > y) != (yj > y))
            && (x < (xj - xi) * (y - yi) / (yj - yi) + xi);
        if (intersect) inside = !inside;
    }
    
    return inside;
  }
}


Notifications.ValueObservation = class ValueObservation {
  
  static matches(entity) {
    
    return entity.type === "Notification" &&
      entity.entities && entity.entities.type.toLowerCase() === "collection" &&
      entity.notify && entity.notify.type.toLowerCase() === "subscription";
  }
  
  constructor(entity) {
    
    this.badEntities = new Set;
    this.entities = entity.entities.value.map(entity => entity.id+"@"+entity.type);
    
    this.asserts = [];
    
    for(var attr in entity) {
      
      if(typeof entity[attr] === "object" && (entity[attr].type+"").toLowerCase() === "assert") {
        
        for(var assert of entity[attr].value) {
          
          this.asserts.push({
            type: assert.type,
            value: JSON.parse(assert.value),
            attr
          });
        }
      }
    }
    
    this.affected = entity.notify.value.includes(app.username);
    this.name = (entity.name && entity.name.type.toLowerCase() === "String") ? entity.name.value : entity.id;
  }
  
  check(entity) {
    
    if(this.entities.includes(entity.id+"@"+entity.type))
      this.testEntity(entity);
  }

  
  testEntity(entity) {
    
    var entityOk = true;
    var entityKey = entity.id+"@"+entity.value;
    var oppositeAssert = {eq: "≠", neq: "=", lte:">", gte:"<", gt:"≤", lt:"≥"};
    
    for(var assert of this.asserts) {
      
      if(! this.testAssert(entity, assert)) {
        
        if(this.badEntities.has(entityKey))
          return;
          
        this.badEntities.add(entityKey);
        notifications.push(
          "Entity "+capitalize(assert.attr)+" Notification",
          entity.id+" ("+entity.type+") has "+capitalize(assert.attr)+" "+oppositeAssert[assert.type]+" "+assert.value+".\n"+
          "Current value: "+entity[assert.attr].value,
          "img/info_outline.png", () => {

            app.pinEntity(entity);
          });
        return;
      }
    }
    
    this.badEntities.delete(entityKey);

    //

    function capitalize(name) {
      return name[0].toUpperCase() + name.slice(1);
    }
  }
  
  testAssert(entity, assert) {
    
    if(! (assert.attr in entity))
      return true;
    
    var value = entity[assert.attr].value;
    
    switch(assert.type) {
      case "eq": return value == assert.value;
      case "neq": return value != assert.value;
      case "lt": return value < assert.value;
      case "gt": return value > assert.value;
      case "gte": return value >= assert.value;
      case "lte": return value <= assert.value;
    }
  }
  
  isInpolygon(point) {
    // https://github.com/substack/point-in-polygon/blob/master/index.js
    
    var x = point[0], y = point[1];
    
    var inside = false;
    for (var i = 0, j = this.outline.length - 1; i < this.outline.length; j = i++) {
        var xi = this.outline[i][0], yi = this.outline[i][1];
        var xj = this.outline[j][0], yj = this.outline[j][1];
        
        var intersect = ((yi > y) != (yj > y))
            && (x < (xj - xi) * (y - yi) / (yj - yi) + xi);
        if (intersect) inside = !inside;
    }
    
    return inside;
  }
}

/*
var hasSeenPermissionError = false;

function showPermissionError() {
  
  if(hasSeenPermissionError)
    return;
  hasSeenPermissionError = true;

  ...
}
*/
