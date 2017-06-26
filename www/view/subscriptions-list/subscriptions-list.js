
const subscriptionsListTemplate = `

<table class="normal">
  <thead>
    <tr>
      <td></td>
      <td>Subject</td>
      <td>Notification</td>
      <td>Status</td>
      <td>Expires</td>
    </tr>
  </thead>
  <tbody></tbody>
</table>

<div class="message"></div>
`;




class SubscriptionsList extends View {
  
  constructor() {
    super(subscriptionsListTemplate);
    
    $(this.content).addClass("subscriptions-list");
    this.$message = this.$(".message");
    this.$table = this.$("tbody");
    
    this.refresh = this.refresh.bind(this);
    this.refresh();
    
    //
    
    this.selecting = false;
    this.selection = new Set;
    this.selectingCallback = null;
    
    this.$table.on("click", (event) => {
      
      if(this.selecting) {
        
        var tr = $(event.target).closest("tr[data-subs]")

        tr.toggleClass("selected");
        if(tr.is(".selected")) this.selection.add(tr[0]);
        else this.selection.delete(tr[0]);

        this.selectingCallback(this.selection)
      }
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
  

  renumber() {
    
    this.$table.children().each((i, tr) => {
      
      $(tr.firstElementChild).html(i+1);
    });
  }
  
  appendSubscription(subs) {
    
    var i = this.$table.children().length+1;
    
    this.$table.append($("<tr>")
      .attr("data-subs", subs.id)
      .append($("<td>").text(i))
      .append($("<td>").append(Subscription.getSubject.call(subs)))
      .append($("<td>").append(Subscription.getNotification.call(subs)))
      .append($("<td>").append(Subscription.getStatus.call(subs)))
      .append($("<td>").append(Subscription.getExpires.call(subs))));
    
    //
    
    function getEntityAttrs() {
      
      return $("<ul>").append(
        ... Object.keys(entity)
          .filter(key => ! ["id", "type", "owner", "dateCreated", "dateModified"].includes(key))
          .map(attr => $("<li>")
            .append(Entity.formatAttr(entity, attr))
            .on("click", (event) => {
              event.stopPropagation();
              main.setView(["attribute", entity.id, entity.type, attr].join("#"));
            })
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
    
    broker.visible("GET", ["v2/subscriptions"], this.$message, (subscriptions) => {
      
      if(subscriptions.length) {

        this.$table.removeClass("empty");
        subscriptions.forEach(subs => this.appendSubscription(subs));
      } else {

        this.$table.addClass("empty");
        this.$message.show().html('<h1>There are not subscriptions set.</h1>');
      }
    });
  }
  
  startSelection(type, onSelecting) {
    
    this.stopSelection();
    this.selecting = true;
    this.$table.attr("data-select", type);
    this.selectingCallback = onSelecting;
    $(this.content).addClass("selecting");
  }
  
  stopSelection() {
    
    this.selecting = false;
    this.selectingCallback = null;
    this.selection = new Set;
    $(this.content).removeClass("selecting");
    this.$table.children().removeClass("selected");
  }
}

///////////////////////////////////////////////////////////

ViewLoader.define("subscriptions-list", SubscriptionsList);
