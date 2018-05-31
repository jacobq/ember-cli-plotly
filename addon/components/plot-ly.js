import { A } from '@ember/array';
import Component from '@ember/component';
import EmberObject, { observer } from '@ember/object';
//import { observes } from '@ember-decorators/object';
import { scheduleOnce } from '@ember/runloop';

import layout from '../templates/components/plot-ly';

import { extend } from 'lodash';
import Plotly from 'plotly';
import debug from 'debug';
const log = debug('ember-cli-plotly:plot-ly-component');
const warn = debug('ember-cli-plotly:plot-ly-component');
/* eslint-disable no-console */
warn.log = console.warn.bind(console);
/* eslint-enable no-console */

// TODO: Make configurable via ENV
// https://github.com/plotly/plotly.js/blob/5bc25b490702e5ed61265207833dbd58e8ab27f1/src/plot_api/plot_config.js#L22-L184
const defaultOptions = {
  staticPlot: false,
  editable: true,
  edits: {
    annotationPosition: false,
    annotationTail: false,
    annotationText: false,
    axisTitleText: false,
    colorbarPosition: false,
    colorbarTitleText: false,
    legendPosition: false,
    legendText: false,
    shapePosition: false,
    titleText: false
  },
  autosizable: false,
  queueLength: 0,
  fillFrame: false,
  frameMargins: 0,
  scrollZoom: false,
  doubleClick: 'reset+autosize',
  showTips: false,
  showAxisDragHandles: true,
  showAxisRangeEntryBoxes: true,
  showLink: false,
  sendData: true,
  linkText: 'Edit chart',
  showSources: false,
  displayModeBar: 'hover',
  modeBarButtonsToRemove: ['sendDataToCloud'],
  modeBarButtonsToAdd: [],
  modeBarButtons: false,
  displaylogo: true,
  plotGlPixelRatio: 2,
  setBackground: 'transparent',
  topojsonURL: 'https://cdn.plot.ly/',
  mapboxAccessToken: null,
  globalTransforms: [],
  locale: 'en-US',
};

const knownPlotlyEvents = [
  'afterplot',
  'animated',
  'autosize',
  'click',
  'deselect',
  'doubleclick',
  'hover',
  'legendclick',
  'legenddoubleclick',
  'redraw',
  'relayout',
  'restyle',
  'selected',
  'selecting',
  'unhover',
].map(suffix => `plotly_${suffix}`);

//export default Component.extend({
export default class PlotlyComponent extends Component.extend({
  // TODO: Figure out how to re-write this in ES2015 class form
  init() {
    this._super(...arguments);
    log('init');
    this.set('layout', layout);
    const plotlyEvents = this.get('plotlyEvents') || []; // TODO: Get from config/env
    this.setProperties({
      chartData: this.get('chartData') || A(),
      chartLayout: this.get('chartLayout') || EmberObject.create(),
      chartOptions: extend(defaultOptions, this.get('chartOptions')),
      plotlyEvents
    });
    this._logUnrecognizedPlotlyEvents();
  },

  // Private
  // TODO: Use @observes decorator once it is available
  _logUnrecognizedPlotlyEvents: observer('plotlyEvents.[]', function() {
    const plotlyEvents = this.get('plotlyEvents');
    if (plotlyEvents && typeof plotlyEvents.forEach === 'function') {
      plotlyEvents.forEach(eventName => {
        if (!knownPlotlyEvents.find(name => name === eventName)) {
          warn(`Passing unrecognized plotly event: '${eventName}'`);
        }
      });
    }
    else {
      log(`plotlyEvents does not appear to be an array`, plotlyEvents);
    }
  })
}) {
  // Lifecycle hooks
  willUpdate() {
    log('willUpdate');
    this._unbindPlotlyEventListeners();
  }

  didRender() {
    log('didRender');
    scheduleOnce('render', this, '_newPlot');
  }

  willDestroyElement() {
    log('willDestroyElement');
    this._unbindPlotlyEventListeners();
  }

  // Consumers should override this if they want to handle plotly_events
  onPlotlyEvent(eventName, ...args) {
    log('onPlotlyEvent fired (does nothing since it was not overridden)', eventName, ...args);
  }

  // Private
  _bindPlotlyEventListeners() {
    const plotlyEvents = this.get('plotlyEvents');
    log('_bindPlotlyEventListeners', plotlyEvents, this.element);
    plotlyEvents.forEach((eventName) => {
      // Note: Using plotly.js' 'on' method (copied from EventEmitter)
      this.element.on(eventName, (...args) => this.onPlotlyEvent(eventName, ...args));
    });
  }

  _unbindPlotlyEventListeners() {
    const events = this.get('plotlyEvents');
    log('_unbindPlotlyEventListeners', events, this.element);
    events.forEach((eventName) => {
      // Note: Using plotly.js' 'removeListener' method (copied from EventEmitter)
      if (typeof this.element.removeListener === 'function') {
        this.element.removeListener(eventName, this.onPlotlyEvent);
      }
    });
  }

  // TODO: Eventually we'd like to be smarter about when to call `newPlot` vs `restyle` / `relayout`
  _newPlot() {
    log('_newPlot');
    const id = this.elementId;
    const data = this.get('chartData');
    const layout = this.get('chartLayout');
    const options = this.get('chartOptions');
    this._unbindPlotlyEventListeners();
    Plotly.newPlot(id, data, layout, options).then(() => {
      log('newPlot finished');
      this._bindPlotlyEventListeners();
    });
  }
}
