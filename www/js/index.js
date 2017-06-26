
var broker = null;
var notifications = null;

//


var app = new class App extends ViewLoader {
  
  constructor() {
    
    super($("#content"));
    this.autoChanger($("#sidebar .buttons"), $("#content"));
    
    this.authenticated = false;
    this.username = "";
    
    this.keycloak = Keycloak({
      url: "http://aam.waziup.io/auth",
      realm: "waziup",
      clientId: "waziup"
    });
    
    var waiting = true;
    
    this.keycloak.init({
      token: localStorage.getItem("keycloak.token"),
      refreshToken: localStorage.getItem("keycloak.refreshToken"),
      idToken: localStorage.getItem("keycloak.idToken")
    }).success((auth) => {
      
      this.keycloak.timeSkew = 0;

      if(auth) {
        
        if(this.keycloak.isTokenExpired(0)) {
          
          localStorage.removeItem("keycloak.token");
          localStorage.removeItem("keycloak.refreshToken");
          localStorage.removeItem("keycloak.idToken");
          
          this.keycloak.updateToken(0).success((refreshed) => {

            waiting = false;
            this.onKeycloakAuth(refreshed);
          }).error(() => {

            waiting = false;
            this.setView("home", null, false);
          });
        } else {
          
          waiting = false;
          this.onKeycloakAuth(true);
        }
        
      } else {

        waiting = false;
        this.setView("home", null, false);
      }
      
    }).error(() => {

      waiting = false;
      alert("Keycloak adapter failed to initialize.\nCheck http://aam.waziup.io/auth");
      this.setView("home", null, false);
    });
    
    setTimeout(() => {
      
      if(waiting) {
        
        this.setView("home", null, false);
      }
    }, 6000);
  }
  
  onKeycloakAuth(auth) {
    
    if(auth) {
      
      localStorage.setItem("keycloak.idToken", this.keycloak.idToken);
      localStorage.setItem("keycloak.refreshToken", this.keycloak.refreshToken);
      localStorage.setItem("keycloak.token", this.keycloak.token);

      this.onLoginSuccess(this.keycloak.token);
      this.keycloak.loadUserProfile().success(profile => {

        profile.url = this.keycloak.createAccountUrl();
        this.onProfileLoad(profile);
        $("#profile .logout").on("click", () => this.keycloak.logout());
      });
    } else {
      
      this.setView("home", null, false);
    }
  }
  
  login() {
    
    this.keycloak.login();
  }
  
  testConnection(cb) {
    
    broker.get("version", (err, data) => {
      
      if(err) {
        
        alert("!! Failed to connect to the Waziup broker. !!\n"+
          "URL: "+broker.waziupBroker+"\n"+
          "Make sure the broker is up and allows requests from this domain (CORS)!\n\n"+
          err);
      }
      
      cb(err)
    });
  }
  
  onLoginSuccess(token) {
    
    this.authenticated = true;
    broker = new Broker(Waziup, token);

    // this.testConnection((err) => {
      
      $("#profile").show();
      $("#sidebar button").removeAttr("disabled");

      var hash = location.hash.substr(1) || "home";
      if(hash) this.setView(hash, null, false);

      //

      window.onpopstate = (event) => {

        var hash = location.hash.substr(1) || "home";
        if(hash) this.setView(hash, null, false);
      }
    // })
  }
  
  setView(name, cb, tracking=true) {
    
    super.setView(name, (view, initial) => {
      
      if(view) {
        if(tracking) history.pushState(null, name, "#"+name);
        else location.hash = name;
      }
      if(cb) cb(view, initial);
    });
  }
  
  pinEntity(entity) {

    var view = "entity#"+JSON.stringify({id: entity.id, type: entity.type});
    
    if($("#sidebar .buttons [data-view='"+view+"']").length === 0) {
      
      $("<button class='entity'>")
        .append([
          $('<i class="material-icons">devices_other</i>'),
          $(`<div><h3>${ entity.id }</h3><h4>${ entity.type }</h4></div>`),
          $(`<span class="close">✕</span>`),
        ])
        .appendTo("#sidebar .buttons")
        .attr("data-view", view);
    }
    
    this.setView(view);
  }

  onProfileLoad(profile) {

    if("username" in profile) {

      this.username = profile.username;
      notifications = new Notifications(this.username);
      
      var name = profile.firstName && profile.lastName
        ? (profile.firstName + " " +profile.lastName)
        : profile.username;

      if(name) {
        
        $("#profile .name").text(name);
        $("#profile .email").text(profile.email || "");
        if(profile.url)
          $("#profile .personal")
            .on("click", () => window.open(profile.url))
            .css("cursor", "pointer");
        $("#profile .personal").show();
      }
    }
  }
}
