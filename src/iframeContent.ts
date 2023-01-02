export const generateSource = (
  wasmUrl: string,
  emscriptenModuleUrl: string,
  packageDataUrl: string
) => `
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
              // FS.writeFile('/networks/custom.ned', nedContent);
              // FS.writeFile('/networks/omnetpp.ini', iniContent);
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
          '-c', 'Example_run',
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
    `;
