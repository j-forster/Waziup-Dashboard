const aboutViewTemplate = `
<section class="content">    
  <h1>Waziup Dashboard</h1>
  <p>
    Johann Forster, 2017<br>
    <i class="material-icons">mail_outline</i> <a href='mailto:johann@forster.family'>johann@forster.family</a>
  </p>
  <p>
    Project work summer semester 2017.
  </p>
  <p>
    Waziup GitHub: <a href="https://github.com/Waziup/Platform" target="_blank">github.com/Waziup/Platform</a>
  </p>
  <hr>
  <h2>3rd Party Software</h2>
  <ul>
    <li>
      <img src="http://openlayers.org/assets/theme/img/logo70.png" alt="OpenLayers"> OpenLayers <a href="http://openlayers.org/">openlayers.org</a>.
      Licensed under <a href="http://www.tldrlegal.com/license/bsd-2-clause-license-(freebsd)">2-Clause BSD</a>.
    </li>
    <li>
      <img src="https://jquery.org/jquery-wp-content/themes/jquery/images/logo-jquery-foundation.png" alt="jQuery"> jQuery <a href="https://jquery.com/">jquery.com/</a>.
      Licensed under <a href="https://tldrlegal.com/license/mit-license">MIT license</a>.
    </li>
    <li>
      KeyCloak JS-Adapter.
      Licensed under <a href="http://www.apache.org/licenses/LICENSE-2.0">Apache License v2.0</a>.
    </li>
    <li>
      Push.js <a href="https://nickersoft.github.io/push.js/">nickersoft.github.io/push.js</a>
      Licensed under <a href="https://tldrlegal.com/license/mit-license">MIT license</a>.
    </li>
    <li>
      Datepair.js <a href="https://jonthornton.github.io/Datepair.js/">jonthornton.github.io/Datepair.js</a>
      Licensed under <a href="https://tldrlegal.com/license/mit-license">MIT license</a>.
    </li>
    <li>
      jquery.timepicker <a href="http://jonthornton.github.io/jquery-timepicker">jonthornton.github.io/jquery-timepicker</a>
      Licensed under <a href="https://tldrlegal.com/license/mit-license">MIT license</a>.
    </li>
    <li>
      bootstrap-datepicker <a href="https://github.com/uxsolutions/bootstrap-datepicker">github.com/uxsolutions/bootstrap-datepicker</a>
      Licensed under <a href="http://www.apache.org/licenses/LICENSE-2.0">Apache License v2.0</a>.
    </li>
    <li>
      <img src="http://www.chartjs.org/img/chartjs-logo.svg" alt="Chart.js"> Chart.js <a href="http://www.chartjs.org/">chartjs.org</a>
      Licensed under <a href="https://tldrlegal.com/license/mit-license">MIT license</a>.
    </li>
  </ul>
</section>
`;

ViewLoader.loadStylesheet("view/about/about.css");


class AboutView extends View {
  
  constructor() {
    super(aboutViewTemplate);
    
    $(this.content).addClass("about-view");
  }
};


ViewLoader.define("about", AboutView);
