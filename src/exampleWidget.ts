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

    const nedContent = `
      package networks;

      import modules.*;
      import channels.*;
      import ned.IdealChannel;
      import ned.DatarateChannel;
      import modules.Backend.Backend;
      import modules.Logger.Logger;

      network Custom {
        submodules:
        backend: Backend;
        logger: Logger;
        EndNodeA: QNode {
            address = 1;
            node_type = "EndNode";
            @display("i=COMP;p=107,159");
        }
        EndNodeB: QNode {
            address = 2;
            node_type = "EndNode";
            @display("i=COMP;p=107,234");
        }
        connections:
        EndNodeA.port++ <--> ClassicalChannel {  distance = 20km; } <--> EndNodeB.port++;
        EndNodeA.quantum_port++ <--> QuantumChannel {  distance = 20km; } <--> EndNodeB.quantum_port++;
      }
          `;
    const iniContent = `

[General]
seed-set = \${runnumber}   # this is the default =0 results in the same seed every time
sim-time-limit = 100s
# Qnic
#**.buffers = intuniform(7,7)
image-path = "./quisp/images"
**.logger.log_filename = "\${resultdir}/\${configname}-\${runnumber}.jsonl"

**.h_gate_error_rate = 1/2000
**.h_gate_x_error_ratio = 0
**.h_gate_y_error_ratio = 0
**.h_gate_z_error_ratio = 0

**.Measurement_error_rate = 1/2000
**.Measurement_x_error_ratio = 1
**.Measurement_y_error_ratio = 1
**.Measurement_z_error_ratio = 1

**.x_gate_error_rate = 1/2000
**.x_gate_x_error_ratio = 0
**.x_gate_y_error_ratio = 0
**.x_gate_z_error_ratio = 0

**.z_gate_error_rate = 1/2000
**.z_gate_x_error_ratio = 0
**.z_gate_y_error_ratio = 0
**.z_gate_z_error_ratio = 0


#Error on Target, Error on Controlled
**.cnot_gate_error_rate = 1/2000
**.cnot_gate_iz_error_ratio = 1 #checked
**.cnot_gate_zi_error_ratio = 1 #checked
**.cnot_gate_zz_error_ratio = 1 #checked
**.cnot_gate_ix_error_ratio = 1 #checked
**.cnot_gate_xi_error_ratio = 1 #checked
**.cnot_gate_xx_error_ratio = 1 #checked
**.cnot_gate_iy_error_ratio = 1 #checked
**.cnot_gate_yi_error_ratio = 1 #checked
**.cnot_gate_yy_error_ratio = 1 #checked


**.memory_x_error_rate = 1.11111111e-7
**.memory_y_error_rate = 1.11111111e-7
**.memory_z_error_rate = 1.11111111e-7
**.memory_energy_excitation_rate = 0.000198
**.memory_energy_relaxation_rate = 0.00000198
**.memory_completely_mixed_rate = 0


**.initial_notification_timing_buffer = 10 s #when to start the BSA timing notification.
**.TrafficPattern = 1
**.LoneInitiatorAddress = 1



[Config Custom]
network = networks.Custom
seed-set = 0
**.number_of_bellpair = 7000
**.buffers = 100

**.tomography_output_filename = "Example_run"


**.emission_success_probability = 0.46*0.49

# Error on optical qubit in a channel
**.channel_loss_rate = 0.04500741397 # per km. 1 - 10^(-0.2/10)
**.channel_x_error_rate = 0.01
**.channel_z_error_rate = 0.01
**.channel_y_error_rate = 0.01

# Internal HOM in QNIC
**.internal_hom_loss_rate = 0
**.internal_hom_error_rate = 0 #Not inplemented
**.internal_hom_required_precision = 1.5e-9 #Schuck et al., PRL 96,
**.internal_hom_photon_detection_per_sec = 1000000000
**.internal_hom_darkcount_probability = 10e-8 #10/s * 10^-9

#Stand-alone HOM in the network
**.hom_loss_rate = 0
**.hom_error_rate = 0 #Not inplemented
**.hom_required_precision = 1.5e-9 #Schuck et al., PRL 96,
**.hom_photon_detection_per_sec = 1000000000
**.hom_darkcount_probability = 10e-8 #1%

**.link_tomography = false
**.EndToEndConnection = true
**.initial_purification = 2
**.purification_type = 1001
          `;

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
      preRun: [
        // @ts-ignore
        () => {
          // @ts-ignore
          console.log(FS.readdir('/networks'));
          // @ts-ignore
          FS.writeFile('/networks/custom.ned', nedContent);
          // @ts-ignore
          FS.writeFile('/networks/omnetpp.ini', iniContent);
        },
      ],
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
      'Custom',
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
        JSON.stringify(args) +
        ';'
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
