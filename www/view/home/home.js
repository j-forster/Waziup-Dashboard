const homeViewTemplate = `
<section class="content login">
  <div class="modal">
    <h2>Login</h2>
    <p>
      <label for="login-username" class="w20">Username</label><!--
      --><input type="text" class="w80" name="username" autofocus>
    </p><p>
      <label for="login-password" class="w20">Password</label><!--
      --><input type="password" class="w80" name="password">
    </p>
    <p class="error" style="display:none"></p>
    <p><button class="primary w30">Login</button> or <button class="w35 waziup">Login with <img src="img/waziup.svg"></button></p>
  </div>
</section>

<section class="content welcome" style="display: none">    
  <h1>Welcome!</h1>
  <h3>Use the navigation on the left to explore everything.</h3>
  <div class="box" data-view="entities">
    <i class="material-icons">devices_other</i>
    <h2>List Entities</h2>
  </div><div class="box" data-view="subscriptions">
    <i class="material-icons">description</i>
    <h2>Manage Subscriptions</h2>
  </div><div class="box" data-view="locations">
    <i class="material-icons">layers</i>
    <h2>Visit Locations</h2>
  </div>
</section>`;


Promise.all([
  
  ViewLoader.loadStylesheet("view/home/home.css")
]).then(() => {



class HomeView extends View {
  
  constructor() {
    super(homeViewTemplate);
    
    $(this.content).addClass("home-view");
    this.$welcome = this.$(".welcome");
    this.$login = this.$(".login");
    this.$password = this.$("[name='$password']");
    this.$username = this.$("[name='username']");
    
    //

    this.$("button.primary").on("click", () => {

      this.$(".error").html("");

      var username = this.$username.val(),
          password = this.$password.val();

      // TODO password is ignored for now...
      
      this.$welcome.show();
      this.$login.hide();
      
      app.onLoginSuccess("");
      app.onProfileLoad({ username });
      $("#profile .logout").on("click", () => location.reload());
    });
    
    this.$welcome.on("click", (event) => {
      
      var view = $(event.target).closest("[data-view]").attr("data-view");
      if(view) app.setView(view);
    });
    
    //
    
    this.$("button.waziup").on("click", () => {

      app.login();
    });
  }
  
  load(parentNode, name) {
    super.load(parentNode);

    this.$welcome.hide();
    this.$login.hide();

    if(app.authenticated) this.$welcome.show();
    else this.$login.show();
  }
}

ViewLoader.define("home", HomeView);

});
