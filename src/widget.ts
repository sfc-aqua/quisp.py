// Copyright (c) zigen
// Distributed under the terms of the Modified BSD License.

import {
  DOMWidgetModel,
  DOMWidgetView,
  ISerializers,
} from '@jupyter-widgets/base';
import { CombinedModelConstructorOptions } from 'backbone';
import { MODULE_NAME, MODULE_VERSION } from './version';

// Import the CSS
import '../css/widget.css';

// const baseUrl = "https://aqua.sfc.wide.ad.jp/quisp-online/master/"
const baseUrl = 'http://localhost:8000/';
const wasmUrl = baseUrl + 'quisp.wasm';
const emscriptenModuleUrl = baseUrl + 'quisp.js';
const packageDataUrl = baseUrl + 'quisp.data';

// const QtenvInstance: Qtenv | null = null;

export class ExampleModel extends DOMWidgetModel {
  canvas: HTMLCanvasElement | null = null;
  loadingPromise: Promise<[WebAssembly.Module, string, ArrayBuffer]>;
  constructor(
    attributes?: any,
    options?: CombinedModelConstructorOptions<any>
  ) {
    super(attributes, options);
    console.log('Model Ctor:', this.cid);
    this.loadingPromise = Promise.all([
      this.loadWasm(),
      this.loadEmscriptenModule(),
      this.loadPackageData(),
    ]);
  }
  defaults() {
    return {
      ...super.defaults(),
      _model_name: ExampleModel.model_name,
      _model_module: ExampleModel.model_module,
      _model_module_version: ExampleModel.model_module_version,
      _view_name: ExampleModel.view_name,
      _view_module: ExampleModel.view_module,
      _view_module_version: ExampleModel.view_module_version,
      value: 'Hello World',
    };
  }

  static serializers: ISerializers = {
    ...DOMWidgetModel.serializers,
    // Add any extra serializers here
  };

  static model_name = 'ExampleModel';
  static model_module = MODULE_NAME;
  static model_module_version = MODULE_VERSION;
  static view_name = 'ExampleView'; // Set to null if no view
  static view_module = MODULE_NAME; // Set to null if no view
  static view_module_version = MODULE_VERSION;

  addCanvas() {
    // and run Quisp
    console.log('add canvas:', this.canvas);
    if (this.canvas != null) {
      return this.canvas;
    }
    this.canvas = document.createElement('CANVAS') as HTMLCanvasElement;
    this.canvas.style.width = '100%';
    this.canvas.style.height = '100%';
    this.canvas.id = 'qtcanvas';
    this.canvas.oncontextmenu = (event) => {
      event.preventDefault();
    };
    this.canvas.contentEditable = 'true';
    return this.canvas;
  }

  handleCustomMessage(content: any) {
    console.log('handle custome message: ', content, this);
    if (this.get('mainWindow') == null) {
      this.set('qtenv', globalThis.window.Module.getQtenv());
      this.set(
        'mainWindow',
        globalThis.window.Module.getQtenv().getMainWindow()
      );
    }
    const mainWindow = this.get('mainWindow');
    console.log(this.get('mainWindow'), this.get('qtenv'));
    const RunMode = globalThis.window.Module.RunMode;
    switch (content.msg) {
      case 'runNormal':
        mainWindow.runSimulation(RunMode.NORMAL);
        break;
      case 'runStep':
        mainWindow.runSimulation(RunMode.STEP);
        break;
      case 'runFast':
        mainWindow.runSimulation(RunMode.FAST);
        break;
      case 'stop':
        mainWindow.stopSimulation();
        break;
    }
  }

  loadWasm(): Promise<WebAssembly.Module> {
    const resp = fetch(wasmUrl);
    if (typeof WebAssembly.compileStreaming !== 'undefined') {
      return WebAssembly.compileStreaming(resp);
    } else {
      return resp.then((r) => r.arrayBuffer()).then(WebAssembly.compile);
    }
  }

  loadEmscriptenModule(): Promise<string> {
    return fetch(emscriptenModuleUrl).then((r) => r.text());
  }

  loadPackageData(): Promise<ArrayBuffer> {
    return fetch(packageDataUrl).then((r) => r.arrayBuffer());
  }

  async startQuisp() {
    const [wasmModule, emscriptenSource, packageData] = await this
      .loadingPromise;
    // @ts-ignore
    globalThis.window.Module = {
      instantiateWasm: (imports, callback) => {
        console.log('instantiate!');
        WebAssembly.instantiate(wasmModule, imports).then((instance) =>
          callback(instance, wasmModule)
        );
        return {};
      },
      localteFile: (filename: string) => {
        console.log('locateFile:', filename);
        return filename;
      },
      print: (msg: any) => {
        console.log(msg);
      },
      printErr: (msg: any) => {
        console.error(msg);
      },
      onAbort: (msg: any) => {
        console.error('abort: ', msg);
      },
      quit: (code, exception) => {
        console.error('quit: ', { code, exception });
      },
      mainScriptUrlOrBlob: new Blob([emscriptenSource], {
        type: 'text/javascript',
      }),
      qtCanvasElements: [this.canvas!],
      getPreloadedPackage: (_packageName, _packageSize) => packageData,
      setStatus: (msg: any) => {
        console.log('status changed: ', msg);
      },
      monitorRunDependencies: () => {},
      preRun: [],
    };
    globalThis.window.qtenvReady = false;
    const timer = setInterval(() => {
      if (globalThis.window.qtenvReady) {
        clearInterval(timer);
        console.log(this);
        this.set('qtenv', globalThis.window.Module.getQtenv());
        this.set('mainWindow', this.get('qtenv').getMainWindow());
        console.log('qtenv ready');
      }
    }, 100);
    const args = [
      '-m',
      '-u',
      'Qtenv', // "Cmdenv"
      '-n',
      './networks:./channels:./modules',
      '-f',
      './networks/omnetpp.ini',
      '-c',
      'Example_run',
      '-r',
      '0',
      '--image-path=/quisp/images',
    ];
    console.log(JSON.stringify(args));

    self.eval(
      emscriptenSource.substring(
        emscriptenSource.lastIndexOf('arguments_=['),
        -1
      ) +
        'arguments_=' +
        JSON.stringify(args)
    );
  }
}

export class ExampleView extends DOMWidgetView {
  model: ExampleModel;
  initialize() {
    console.log('initialize', this);
  }
  render() {
    this.el.classList.add('custom-widget');
    this.el.appendChild(this.model.addCanvas());
    this.model.startQuisp();
  }
}
