const subscriptionViewTemplate = `

<div class="modal">
  <h2><i class="material-icons">description</i> New Subscription</h2>
  <p>
  	<label class="w80">Entities</label><button class="w20" name="select-entities"><i class="material-icons">devices_other</i> Select</button>
    <input type="text" name="entities" class="w100" placeholder="Click 'Select'." disabled>
  </p>
  <p>
  	<label class="w100">Attributes</label>
    <select name="attributes" class="w100" multiple></select>
  </p>
  <p>
    <label class="w50">Notification</label><label class="notif-http w25" checked>HTTP</label><label class="notif-cygnus w25">Cygnus</label>
    <input type="text" name="notification" class="w100" value="" placeholder="http://your-endpoint.com/notify"> 
  </p>
  <p>
    <label class="w25">Throttling</label><input type="text" name="throttling" class="w75" value="PT1S"> 
    <label class="w25">Duration</label><input type="text" name="duration" class="w75" value="P1M"> 
  </p>
  <p class="error" style="display: none"></p><p>
    <button name="create" class="w35 primary">Create Subscription</button><!--
 --><button name="reset" class="w20">Reset</button>
  </p>
</div>
<div class="overlay" style="display:none"></div>
`;



class SubscriptionView extends View {
  
  constructor() {
    super(subscriptionViewTemplate);
    
    $(this.content).addClass("subscription");
    
    this.$entities = this.$("[name='entities']");
    this.$notification = this.$("[name='notification']");
    this.$attributes = this.$("[name='attributes']");
    this.$notifHTTPRad = this.$(".notif-http");
    this.$notifCygnusRad = this.$(".notif-cygnus");
    this.$notification = this.$("[name='notification']");
    this.$throttling = this.$("[name='throttling']");
    this.$duration = this.$("[name='duration']");
    
    this.$createBtn = this.$("[name='create']");
    this.$resetBtn = this.$("[name='reset']");
    
    this.$selectBtn = this.$("[name='select-entities']");
    this.$overlay = this.$(".overlay");
    this.$doSelectBtn = this.$("[name='do-select']");
    this.$doCancelBtn = this.$("[name='cancel']");
    
    this.entities = [];
    
    //
    
    this.$createBtn.on("click", () => this.submit());
    
    //
    
    this.$notifHTTPRad.on("click", () => {
      
      this.$notifHTTPRad.attr("checked", true);
      this.$notifCygnusRad.attr("checked", false);
      
      this.$notification.val("").prop("disabled", false).focus();
    });
    
    this.$notifCygnusRad.on("click", () => {
      
      this.$notifCygnusRad.attr("checked", true);
      this.$notifHTTPRad.attr("checked", false);
      
      this.$notification.val("Internal Cygnus Data Sink").prop("disabled", true);
    });
    
    //
    
    
    this.$selectBtn.on("click", () => {
      
      this.$overlay.show();
      
      new ViewLoader(this.$overlay).setView("entities-list", (list) => {

        list.startSelection(this.entities, "normal", (entities) => {
          
          if(entities !== null) {
            
            this.entities = entities;
            this.$entities.val(entities.map(entity => entity.id).join(", "));
            
            var attrs = new Set;
            entities.forEach(entity => {
              Entity.getAttrs.call(entity).forEach(attr => {
                attrs.add(attr);
              });
            });

            this.$attributes
              .empty()
              .append(... Array.from(attrs).map(attr => 
                $("<option>").text(attr).attr("value", attr)));
          }
          
          this.$overlay.empty().hide();
        });
      });
    });
  }

  get view() {
    
    return this.loader.view;
  }
  
  submit() {
    
    if(! this.entities.length) {
      
      alert("Please select at least one entity for observation.");
      return;
    }
    
    var attributes = Array.from(this.$attributes.children(":selected"))
      .map(option => $(option).val());

    if(! attributes) {

      alert("Please select at least one attribute for observation.");
      return;
    }
    
    this.$createBtn.prop("disabled", true).text("Please wait...");
    
    var entities = this.entities.map(entity => ({
      id: entity.id,
      type: entity.type,
      isPattern: false
    }));

    var url = this.$notifCygnusRad.attr("checked") ? "http://cygnus:5050/notify" : this.$notification.val();
    
    var subscription = {
      entities: entities,
      attributes,
      reference: url,
      duration: this.$duration.val(),
      notifyConditions: [
        {
          type: "ONCHANGE",
          condValues: attributes
        }
      ],
      throttling: this.$throttling.val()
    };

    console.info("Subscription", subscription);

    broker.post("v1/subscribeContext", subscription, (err, data) => {

      err = err || data.subscribeError;

      if(err) {

        alert("Faild to create a subscription.\n"+err);
      } else {

        var subsId = data.subscribeResponse.subscriptionId;
        broker.get("v2/subscriptions/"+subsId).then((subs) => {

          this.emit("submit", subs);
        });
      }

      this.$createBtn.prop("disabled", false).text("Create Entity");
    });
  }
};


///////////////////////////////////////////////////////////


ViewLoader.define("subscription", SubscriptionView);
