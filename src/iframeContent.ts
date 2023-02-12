const DEFAULT_INI_CONTENT = `
[General]
seed-set = \\\${runnumber}
sim-time-limit = 100s
# Qnic
#**.buffers = intuniform(7,7)
image-path = "./quisp/images"
#**.logger.log_filename = "\\\${resultdir}/\\\${configname}-\\\${runnumber}.jsonl"
**.logger.log_filename = "/result.jsonl"
**.tomography_output_filename = "/result.output"

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

# when to start the BSA timing notification.
**.initial_notification_timing_buffer = 10 s
**.TrafficPattern = 1
**.LoneInitiatorAddress = 1



[Config Custom]
network = networks.Realistic_Layer2_Simple_MIM_MM_10km
seed-set = 0
**.number_of_bellpair = 7000
**.buffers = 100



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
**.purification_type = 1001`;

export const generateSource = (
  wasmUrl: string,
  emscriptenModuleUrl: string,
  packageDataUrl: string,
  nedContent = '',
  iniContent: string = DEFAULT_INI_CONTENT
) => `
      window.qtenvSkipRunSelection = true;
      const nedContent = \`${nedContent}\`;
      const iniContent = \`${iniContent}\`;
      const canvas = document.getElementById("main");
      canvas.style.width = '100%';
      canvas.style.height = '100%';
      canvas.oncontextmenu = (event) => {
        event.preventDefault();
      };
      canvas.contentEditable = 'true';
      console.log("hello world");
      Promise.all([loadWasm(), loadEmscriptenModule(), loadPackageData()])
      .then(([wasmModule, emscriptenSource, packageData]) => {
        console.log(wasmModule);
        window.Module = {
          instantiateWasm: (imports, callback) => {
            console.log('instantiate!');
            WebAssembly.instantiate(wasmModule, imports).then((instance) =>
              callback(instance, wasmModule)
            );
            return {};
          },
          localteFile: (filename) => {
            console.log('locateFile:', filename);
            return filename;
          },
          print: (msg) => console.log(msg),
          printErr: (msg) => console.error(msg),
          onAbort: (msg) => console.error('abort: ', msg),
          quit: (code, exception) => console.error('quit: ', { code, exception }),
          mainScriptUrlOrBlob: new Blob([emscriptenSource], { type: 'text/javascript' }),
          qtCanvasElements: [canvas],
          getPreloadedPackage: (_packageName, _packageSize) => packageData,
          setStatus: (msg) => {
            console.log('status changed: ', msg);
          },
          monitorRunDependencies: () => {},
          preRun: [
            () => {
              console.log(FS.readdir('/networks'));
              if (nedContent) FS.writeFile('/networks/custom.ned', nedContent);
              if (iniContent) FS.writeFile('/networks/omnetpp.ini', iniContent);
            },
          ],
        };
        window.qtenvReady = false;
        const timer = setInterval(() => {
          if (window.qtenvReady) {
            clearInterval(timer);
            console.log(this);
            window.qtenv = window.Module.getQtenv();
            window.mainWindow = window.qtenv.getMainWindow();
            console.log('qtenv ready');
          }
        }, 100);
        const args = [
          '-m', /* merge stderr into stdout */
          '-u', 'Qtenv',  /* ui */
          '-n', './networks:./channels:./modules', /* .ned file search path */
          '-f', './networks/omnetpp.ini', /* config file */
          '-c', 'Custom',
          '-r', '0',
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
      })
      function loadWasm() {
        const resp = fetch("${wasmUrl}");
        if (typeof WebAssembly.compileStreaming !== 'undefined') {
          return WebAssembly.compileStreaming(resp);
        } else {
          return resp.then((r) => r.arrayBuffer()).then(WebAssembly.compile);
        }
      }

      function loadEmscriptenModule() {
        return fetch("${emscriptenModuleUrl}").then((r) => r.text());
      }

      function loadPackageData() {
        return fetch("${packageDataUrl}").then((r) => r.arrayBuffer());
      }
      function readFile(filename) {
        try {
          return FS.readFile(filename, { encoding: 'utf8' });
        } catch {
          return null;
        }
      };
      window.addEventListener("message", (e) => {
        console.log("iframe handle message: ", e);
        if (e.data && e.data.command === "readFile") {
          const f = readFile(e.data.args.filename)
          e.source.postMessage({command: "readFile", result: f});
        }
      });
    `;
