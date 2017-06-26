class View extends Events {
  
  constructor(html) {    
    super();
    
    this.content = document.createElement("div");
    this.content.innerHTML = html;
    
    this.$ = (sel) => $(sel, this.content); //.querySelector.bind(this.content);
    //this.$$ = this.content.querySelectorAll.bind(this.content);
    
    for(var master of this.$("[id]"))
      this["$"+master.id] = $(master);
    
    this.loaded = false;
  }
  
  load(parentNode, name) {
    
    $(parentNode).append(this.content);
    this.loaded = true;
  }
  
  unload() {
    
    $(this.content).detach();
    this.loaded = true;
  }
}

///////////////////////////////////////////////////////////

const errorViewTemplate = `
<h1><i class="material-icons">error_outline</i> Error loading dashboard.</h1>
The view failed to load. This is an internal error, but might result from a unexisting url your entered.<br>Navigate <a href='/'>home</a>.<br><br>
<em></em>
`;

function createErrorView(message) {
  
  return class ErrorView extends View {
  
    constructor() {
      super(errorViewTemplate);
      $(this.content)
        .addClass("message")
        .find("em").text(message);
    }
  }
}



class ViewLoader {
  
  constructor(element, tracking=false) {
    
    this.element = element;
    this.tracking = tracking;
    this.current = "";
    this.views = {};
    this.callback = null;
    this.changer = null;
  }
  
  get view() {
    
    return this.views[this.current] || null;
  }
  
  removeView(name) {
    
    if(name in this.views) {
      
      if(this.current === name) {
        
        this.views[name].unload();
        delete this.views[name];
        
        this.callback = null;
        
        this.setView(Object.keys(this.views)[0]);
      } else {
        
        delete this.views[name];
      }
    }
  }
  
  setView(name, cb) {
    
    if(this.callback)
      this.callback(null);
    
    if(this.changer) {
      
      $(this.changer)
        .find("[data-view]").removeClass("active")
        .filter("[data-view='"+name+"']").addClass("active");
    }
    
    this.callback = cb;
    
    if(this.current in this.views) {
      
      if(this.current === name) {
        
        if(this.callback) this.callback(this.views[this.current], false);
        this.callback = null;
        return;
      }
      
      this.views[this.current].unload();
    }
    
    this.current = name;
    
    if(name in this.views) {
      
      this.onViewReady();
    } else {
      
      var constrName = name.split("#")[0];
      
      if(constrName in ViewLoader.cache) {

        this.onViewReady();
      } else {
        
        this.fetch(constrName);
      }
    }
    
    return this;
  }
  
  onViewReady() {
    
    var name = this.current,
        initial;
    
    if(name in this.views) {
      
      initial = false;
    } else {
      
      var constrName = name.split("#")[0],
          Constructor = ViewLoader.cache[constrName];
        
      this.views[name] = new Constructor();
      initial = true;
    }
    
    if(this.callback) this.callback(this.views[name], initial);
    this.views[name].load(this.element, name);
    this.callback = null;
  }
  
  autoChanger(trigger) {
    
    this.changer = trigger;
    
    $(trigger).click((event) => {
      
      var name = $(event.target).closest("[data-view]").attr("data-view");
      if(name) {
        
        if($(event.target).is(".close")) {
          
          this.removeView(name);
          $(event.target).closest("[data-view]").remove();
        } else {
          
          this.setView(name);
        }
      }
    });
    return this;
  }
  
  fetch(name) {
    
    var viewName = name.split("#")[0];
    ViewLoader.waiting.push(this);
    var url = "view/"+viewName+"/"+viewName+".js";
    ViewLoader.loadScript(url).catch((err) => {
      
      ViewLoader.define(viewName, createErrorView("Error: unexisting view: "+viewName+" ("+url+")"));
    });
  }
  
  waiting() {
    
    return this.current && !(this.current in this.views);
  }
  
  //
  
  static loadStylesheet(href) {
    
    if(document.querySelector("link[rel='stylesheet'][href='"+href+"']"))
      return Promise.resolve();
    
    return new Promise((resolve, reject) => {
      
      var link = document.createElement("link");
      link.setAttribute("href", href);
      link.setAttribute("rel", "stylesheet");
      document.head.appendChild(link);
      
      link.addEventListener("load", () => resolve(href, link));
      link.addEventListener("error", (err) => reject(href, err));
    });
  }
  
  static loadScript(src) {
    
    if(document.querySelector("script[src='"+src+"']"))
      return Promise.resolve();
    
    return new Promise((resolve, reject) => {
      
      var script = document.createElement("script");
      script.setAttribute("src", src);
      document.head.appendChild(script);
      
      script.addEventListener("load", () => resolve(src, script));
      script.addEventListener("error", (err) => reject(src, err));
    });
  }
  
  static define(name, Constructor, err) {
    
    if(err) {
      
      alert("Failed to load the dashboard.\nMaybe your browser does not support all HTML5 features?\nAlso check your network connection..\n\n"+err);
      return;
    }
    
    ViewLoader.cache[name] = Constructor;
    
    var waiting = ViewLoader.waiting;
    ViewLoader.waiting = [];
    waiting.forEach((loader) => {
      
      if(loader.current.split("#")[0] === name)
        loader.onViewReady();
      else
        ViewLoader.waiting.push(loader);
    });
  }
}

ViewLoader.cache = {};
ViewLoader.waiting = [];








