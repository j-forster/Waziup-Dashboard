const attributeViewTemplate = `
<section class="message">Attribute!</section>
<canvas class="canvas"></canvas>
`;


ViewLoader.loadStylesheet("view/home/home.css");
ViewLoader.loadScript("js/chart.bundle.js").then(() => {

  

  class AttributeView extends View {

    constructor() {
      super(attributeViewTemplate);

      $(this.content).addClass("attribute-view content");
      this.$message = this.$(".message");
      this.$canvas = this.$(".canvas");
      this.context = this.$canvas[0].getContext("2d");
    }

    load(parentNode, name) {

      super.load(parentNode);
      var [viewName, id, type, attr] = name.split("#");
      this.set({id, type}, attr);
    }
    
    set(entity, attrId) {
      
      broker.visible("get", ["v2/entities/"+entity.id+"/attrs/"+attrId], this.$message, (attribute) => {
        attribute.id = attrId;
        
        broker.visible("history", ["type/"+entity.type+"/id/"+entity.id+"/attributes/"+attrId+"?lastN=6"], this.$message, (data) => {
          
          var values = data.contextResponses[0].contextElement.attributes[0].values;
          console.log(entity.id, values);
          values = [
            {"recvTime":"2017-03-14T14:30:22.213Z","attrType":"Number","attrValue":"19"},
            {"recvTime":"2017-03-14T15:30:22.213Z","attrType":"Number","attrValue":"12"},
            {"recvTime":"2017-03-14T15:40:22.213Z","attrType":"Number","attrValue":"24"},
            {"recvTime":"2017-03-14T15:50:22.213Z","attrType":"Number","attrValue":"25"},
            {"recvTime":"2017-03-14T16:05:22.213Z","attrType":"Number","attrValue":"23"},
            {"recvTime":"2017-03-14T16:17:32.301Z","attrType":"Number","attrValue":"19"}
          ];
          
          this.lineChart(entity, attribute, values);
        });
      });
    }
    
    lineChart(entity, attribute, values) {
      
      this.$canvas.show();
      
      var unit = Entity.hasUnit(attribute) ? " (" + Entity.getUnit(attribute) + ")" : "";
      
      var myChart = new Chart(this.context, {
        type: 'line',
        data: {
          datasets: [{
            label: entity.id+" / "+attribute.id,
            data: values.map(val => ({
              x: val.recvTime,
              y: val.attrValue
            }))
          }],
          fill: false
        },
        options: {
          responsive: true,
          maintainAspectRatio: false,
          scales: {
            xAxes: [{
              type: "time",
              display: true,
              scaleLabel: {
                display: true,
                labelString: "Date"
              }
            }],
            yAxes: [{
              display: true,
              scaleLabel: {
                display: true,
                labelString: attribute.id+unit
              }
            }]
          }
        }
      });
    }
  }

  ViewLoader.define("attribute", AttributeView);
  
});

//View.setCache("home", new HomeView);
