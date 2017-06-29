
const usersTemplate = `
<table class="normal">
  <thead>
    <tr>
      <td></td>
      <td>Username</td>
      <td>Name</td>
      <td>Created</td>
      <td>Email</td>
      <td>Status</td>
    </tr>
  </thead>
  <tbody></tbody>
</table>

<div class="message"></div>
`;

Promise.all([
  ViewLoader.loadStylesheet("view/users/users.css"),
]).then(() => {
  

class UsersView extends View {
  
  constructor() {
    super(usersTemplate);
    
    $(this.content).addClass("users-view");
    this.$message = this.$(".message");
    this.$table = this.$("tbody");
    
    this.state = -1;
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


  renumber() {
    
    this.$table.children().each((i, tr) => {
      
      $(tr.firstElementChild).html(i+1);
    });
  }
  
  appendUser(user) {
    
    this.users.push(user);
    
    var i = this.$table.children().length+1;
    
    // console.log(user);
    
    var name = ((user.firstName||"") +" "+ (user.lastName||"")).trim() || "-";

    $("<tr>")
      .attr("data-user", user.username)
      .attr("data-enabled", user.enabled+"")
      .append($("<td>").text(i))
      .append($("<td>").text(user.username))
      .append($("<td>").text(name))
      .append($("<td>").append(normalTime(new Date(user.createdTimestamp))))
      .append($("<td>").text(user.email||"-"))
      .append($("<td>").text(user.requiredActions))
      .appendTo(this.$table);
  }
  
  refresh() {
    
    this.state = broker.state;
    
    this.$table.empty();
    this.$("table").addClass("empty");
    this.users = [];

    this.$message.html('<h1><i class="material-icons">cloud_download</i> Loading content…</h1>').show();
    
    var url = "http://aam.waziup.io/auth/admin/realms/waziup/users";
    
    var onError = (err) => {
      
      this.$message.html('<h1><i class="material-icons">error_outline</i> Error loading content.</h1>'+
        'Check your network connection and make sure the server is up and allows requests from this domain.<br>'+
        '<em>'+err.message+" at "+url+"</em>");
    }
    
    fetch(url, {
      headers: new Headers({
        "Accept": "application/json",
        "Authorization": "Bearer "+app.keycloakAdmin.access_token,
      })
    }).then(response => {

      if(response.ok) {

        response.json().then(users => {

          if(users.length) {

            this.$("table").removeClass("empty");
            this.$message.hide();
            users.forEach(user => this.appendUser(user));
          } else {

            this.$("table").addClass("empty");
            this.$message.show().html('<h1>There are not users in this list.</h1>');
          }
        });

      } else {

        onError(response);
      }
    }, onError);

    this.emit("refresh");
  }
}

ViewLoader.define("users", UsersView);

});
