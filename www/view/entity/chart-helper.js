var ChartHelper = {

  make(container, values, attr, unit, min, max) {

    var canvas = $("<canvas>")
      .css({
        width: "540px",
        height: "400px"
      })
      .appendTo(container);
    
    var context = canvas[0].getContext("2d");
    
    new Chart(context, {
      type: "line",
      data: {
        datasets: [{
          data: values.map(val => ({
            x: new Date(val.recvTime),
            y: val.attrValue
          }))
        }],
        fill: false
      },
      options: {
        responsive: false,
        legend: {
          display: false
        },
        scales: {
          xAxes: [{
            type: "time",
            display: true,
            min: min,
            max: max
          }],
          yAxes: [{
            display: true,
            scaleLabel: {
              display: !! unit,
              labelString: unit
            }
          }]
        }
      }
    });
  }
}
