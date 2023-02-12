// Copyright (c) zigen
// Distributed under the terms of the Modified BSD License.

import {
  DOMWidgetModel,
  DOMWidgetView,
  ISerializers,
} from '@jupyter-widgets/base';
import { CombinedModelConstructorOptions } from 'backbone';
import { MODULE_NAME, MODULE_VERSION } from './version';
import { generateSource } from './iframeContent';

// Import the CSS
import '../css/widget.css';

const baseUrl =
  'https://aqua.sfc.wide.ad.jp/quisp-online/jupyter-quisp-widget/';
// const baseUrl = 'http://localhost:8000/';
const wasmUrl = baseUrl + 'quisp.wasm';
const emscriptenModuleUrl = baseUrl + 'quisp.js';
const packageDataUrl = baseUrl + 'quisp.data';

const readFile = (w: any, filename: string): Promise<string | null> => {
  return new Promise((res, rej) => {
    try {
      w.postMessage({ command: 'readFile', args: { filename } });
      const f = (e: any) => {
        console.log('widget receive message', e);
        window.removeEventListener('message', f);
        res(e.data.result);
      };
      window.addEventListener('message', f);
    } catch (e) {
      console.error(e);
      rej(e);
    }
  });
};

export class QuispIFrameModel extends DOMWidgetModel {
  iframe: HTMLIFrameElement = document.createElement(
    'IFRAME'
  ) as HTMLIFrameElement;
  currentViewId: string | null = null;
  constructor(
    attributes?: any,
    options?: CombinedModelConstructorOptions<any>
  ) {
    super(attributes, options);
    // @ts-ignore
    this.on('msg:custom', this.handleMessages, this);
  }
  defaults() {
    return {
      ...super.defaults(),
      _model_name: QuispIFrameModel.model_name,
      _model_module: QuispIFrameModel.model_module,
      _model_module_version: QuispIFrameModel.model_module_version,
      _view_name: QuispIFrameModel.view_name,
      _view_module: QuispIFrameModel.view_module,
      _view_module_version: QuispIFrameModel.view_module_version,
      value: 'Hello World',
      iniContent: undefined,
      nedContent: undefined,
    };
  }

  useIframe(viewId: string): HTMLIFrameElement | null {
    if (this.currentViewId === null) {
      this.setupIframe();
      this.currentViewId = viewId;
    }
    if (this.currentViewId === viewId) {
      return this.iframe;
    }
    return null;
  }

  reset() {
    this.iframe = document.createElement('IFRAME') as HTMLIFrameElement;
    this.setupIframe();
  }

  setupIframe() {
    const nedContent = this.get('nedContent');
    const iniContent = this.get('iniContent');
    const source = generateSource(
      wasmUrl,
      emscriptenModuleUrl,
      packageDataUrl,
      nedContent,
      iniContent
    );
    this.iframe.srcdoc = `<canvas id="main"><script>${source}</script>`;
    this.iframe.style.width = '100%';
    this.iframe.style.height = '897px';
  }

  async handleMessages(content: any) {
    console.log('handle custome message: ', content, this);
    const mainWindow =
      // @ts-ignore
      this.iframe.contentWindow.Module.getQtenv().getMainWindow();
    // @ts-ignore
    const RunMode = this.iframe.contentWindow.Module.RunMode;
    switch (content.msg) {
      case 'runNormal':
        // @ts-ignore
        mainWindow.runSimulation(RunMode.NORMAL);
        break;
      case 'runStep':
        // @ts-ignore
        mainWindow.runSimulation(RunMode.STEP);
        break;
      case 'runFast':
        // @ts-ignore
        mainWindow.runSimulation(RunMode.FAST);
        break;
      case 'stop':
        // @ts-ignore
        mainWindow.stopSimulation();
        break;
      case 'load':
        console.log('loading....');
        this.set('iniContent', content.ini);
        this.set('nedContent', content.ned);
        this.setupIframe();
        break;
      case 'readResult':
        // @ts-ignore
        const FS = this.iframe.contentWindow.FS;
        // @ts-ignore
        const jsonl = await readFile(
          this.iframe.contentWindow,
          '/result.jsonl'
        );
        // @ts-ignore
        const output = await readFile(
          this.iframe.contentWindow,
          '/result.output'
        );
        this.send({ jsonl, output }, (m: any) =>
          console.log('model load callback', m)
        );
        break;
    }
  }

  static serializers: ISerializers = {
    ...DOMWidgetModel.serializers,
    // Add any extra serializers here
  };

  static model_name = 'QuispIFrameModel';
  static model_module = MODULE_NAME;
  static model_module_version = MODULE_VERSION;
  static view_name = 'QuispIFrameView';
  static view_module = MODULE_NAME;
  static view_module_version = MODULE_VERSION;
}

export class QuispIFrameView extends DOMWidgetView {
  model: QuispIFrameModel;
  initialize() {}

  render() {
    this.el.classList.add('custom-widget');
    if (this.el.children.length == 0) {
      const iframe = this.model.useIframe(this.cid);
      if (iframe) {
        this.el.appendChild(iframe);
        this.model.send({ state_change: 'rendered' }, () => {});
      } else {
        this.el.textContent = 'see other view';
      }
    }
  }
}
