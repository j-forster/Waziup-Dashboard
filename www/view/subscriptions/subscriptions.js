const subscriptionsViewTemplate = `

<div id="toolbar" class="toolbar">
  <button data-action="showSubscriptionsList"><i class="material-icons">view_list</i><br>Subscriptions</button>
  <button data-action="createNewSubscription"><i class="material-icons">description</i><br>New Subscription</button>
  <div class="subscriptions-btns">
    <button data-action="removeSubscription" class="inline"><i class="material-icons">clear</i><span>Remove Subscription</span></button><br>
    <button data-action="refresh" class="inline"><i class="material-icons">refresh</i><span>Refresh</span></button>
  </div>
</div>
<div class="remove-message" style="display:none">
  <span class="hint">Select all subscriptions you want to remove.</span>
  <button class="do-remove" style="display: none"></button>
  <button class="cancel-remove">Cancel</button>
</div>
<div class="content"></div>
`;

ViewLoader.loadStylesheet("view/subscriptions/subscriptions.css");


class SubscriptionsView extends View {
  
  constructor() {
    super(subscriptionsViewTemplate);
    
    $(this.content).addClass("subscriptions-view");
    this.$removeMessage = this.$(".remove-message");
    this.$doRemoveBtn = this.$(".do-remove");
    
    this.loader = new ViewLoader(this.$(".content"));
    
    this.$toolbar.on("click", (event) => {
      
      var action = event.target.getAttribute("data-action");
      if(action) this[action]();
    });
    
    this.showSubscriptionsList();
    
    //
    
    this.$doRemoveBtn.on("click", () => {
      
      var ids = Array.from(this.view.selection).map(tr => $(tr).attr("data-subs"));
      $(... this.view.selection).remove();
      
      this.view.renumber();
      this.stopSelection();
      
      var promises = ids.map(id => broker.delete("v2/subscriptions/"+id));
      Promise.all(promises).catch((err) => {
        
        alert("Deleting on or more subscriptions failed.\n"+err.message);
        this.view.refresh(); // TODO: might fail if view changed
      });
    });
    
    this.$(".cancel-remove").on("click", () => this.stopSelection())
  }

  get view() {
    
    return this.loader.view;
  }
  
  refresh() {
    
    this.view.refresh();
  }
  
  showSubscriptionsList(additionalSubs = null) {
    
    this.$(".subscriptions-btns").show();
    
    this.loader.setView("subscriptions-list", (view) => {
      
      if(additionalSubs)
        view.appendSubscription(additionalSubs);
    });
  }
  
  removeSubscription() {
    
    if(this.view.selecting) {
      
      this.stopSelection();
      return;
    }
    
    this.$removeMessage.show();
    this.view.startSelection("remove", (set) => {
      
      if(set.size == 0) this.$doRemoveBtn.hide();
      else this.$doRemoveBtn.show().html(`Remove ${ set.size } ${ set.size > 1 ? "subscriptions" : "subscription"}.`);
    });
  }

  stopSelection() {
    
    this.$removeMessage.hide();
    this.$doRemoveBtn.hide();
    this.view.stopSelection();
  }
  
  createNewSubscription() {
    
    this.$(".subscriptions-btns").hide();
    
    this.loader.setView("subscription", (view, initial) => {
      
      if(initial) {
        
        view.on("submit", (newSubs) => {
          
          this.showSubscriptionsList(newSubs);
        });
      }
    });
  }
  /*
  setMessage(name) {
    
    var active = $("#message .active");
    active.style.display = "none";
    $("#message [data-msg='"+name+"']").style.display = "block";
  }
  */
};


///////////////////////////////////////////////////////////


var Subscription = {
  
  getNotification() {
    
    
    var col = $([]);
    
    var n = this.notification.timesSent;
    if(! n) {
      
      col = col.add($("<span>").text("Sent: 0 times sent"))
    } else {
      
      col = col.add($("<span>").text("Sent: "+n+" times sent"))
        .add($("<br>"))
        .add($("<span>").append(
          document.createTextNode("Last: "),
          normalTime(this.notification.lastNotification)))
    }
    
    col = col.add($("<hr>"))
      .add($("<h4>").text("Reference"));
    
    var url = this.notification.http.url;
    
    if(url === "http://cygnus:5050/notify")
      col = col.add($("<em>")
        .text("Internal Cygnus Data Sink")
        .attr("title", url));
    else
      col = col.add($("<em>").text(url));
    
    return col;
  },
  
  getSubject() {
    
    var n = this.subject.entities.length;
    
    return $([])
      .add($("<h4>").text(n+" "+(n===1?"Entity":"Entities")))
      .add($("<ul>").append(
        this.subject.entities.map(entity =>
          $("<li class='entity'>").append(
            $("<strong>").text(entity.id+" "),
            $("<em>").text(entity.type)
          ).on("click", () => {
          
            app.pinEntity(entity);
          })
        )
      ))
      .add($("<hr>"))
      .add($("<h4>").text("Attributes"))
      .add($("<ul>").append(
        this.subject.condition.attrs.map(attr => 
          $("<li>").text(attr)
        )
      ))
  },
  
  getStatus() {
    
    return $("<span>")
      .text(this.status)
      .attr("data-status", this.status);
  },
  
  getExpires() {
    
    var date = new Date(Date.parse(this.expires)).toLocaleString();
    return document.createTextNode(date);
  }
} 

///////////////////////////////////////////////////////////


ViewLoader.define("subscriptions", SubscriptionsView);
