const _issue148ViewTemplate = `
<div class="content">
  <h1><i class="material-icons" style="font-size: 1em;">build</i> Waziup API Change</h1>
  <h3>Because of a Waziup API change <a href="https://github.com/Waziup/Platform/issues/148">issue 148</a> some features might be disabled.</h3>

  <div class="box">
    <h2>Reduced Functionality</h2>
    Click, to use the reduced functionality version for now.
  </div>
  <div class="box">
    <h2>Complete Functionality</h2>
    To use this, you need to <a>disable CORS in your browser.</a>
  </div>
</div>

`;


ViewLoader.loadStylesheet("view/issue148/issue148.css");

class _issue148View extends View {
  
  constructor() {
    super(_issue148ViewTemplate);
    
    $(this.content).addClass("_issue148-view");
    var a = this.$("a:not([href])")[0];
    
    var userAgent = navigator.userAgent || "";
    if(userAgent.includes("Chrome/")) a.href = "https://www.google.de/search?q=disable+cors+in+google+chrome";
    else if(userAgent.includes("Firefox/")) a.href = "https://www.google.de/search?q=disable+cors+in+firefox";
    else a.href = "https://www.google.de/search?q=disable+cors";
    
    var boxes = this.$(".box");
    $(boxes[0]).on("click", () => {
      
      Waziup = {
        name: "Waziup.io CORS",
        servicePath: "TEST",
        fiwareOrion: null,
        fiwareOrionV1: null,
        fiwareOrionV2: "http://orion.waziup.io/v1/data",
        cygnus: "http://historicaldata.waziup.io/STH",
      }
      
      this.proceed();
    });
    $(boxes[1]).on("click", () => {
      
      this.proceed();
    });
  }
  
  proceed() {
    
    app.views[app.current].unload();
    app.current = "";
    delete ViewLoader.cache.home;
    delete app.views.home;
    app.setView("home", null, false);
  }
}

ViewLoader.define("home", _issue148View);
