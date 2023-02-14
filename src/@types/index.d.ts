type RunMode = {
  STEP,
  NORMAL,
  FAST,
  NOT_RUNNING,
  PAUSED
};

class Qtenv {
  getMainWindow(): MainWindow;
}

class MainWindow {
  runSimulation: (mode: RunMode) => void;
  stopSimulation: () => void;
}

interface Window {
  qtenvReady: boolean;
  Module: {
    instantiateWasm: (imports, callback) => Object,
    localteFile: (filename: string) => string,
    print: (msg: any) => void,
    printErr: (msg: any) => void,
    onAbort: (msg: any) => void,
    quit: (code, exception) => void,
    mainScriptUrlOrBlob: Blob,
    qtCanvasElements: Array<HTMLCanvasElement>,
    getPreloadedPackage: (_packageName, _packageSize) => ArrayBuffer
    setStatus: (msg) => void,
    monitorRunDependencies: () => void,
    preRun: Array<string>,
    getQtenv: () => Qtenv,
    RunMode: RunMode
    getMainWindow: () => MainWindow,
    runSimulation: (RunMode) => void,
  }
}
