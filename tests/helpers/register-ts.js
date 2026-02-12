const fs = require('node:fs');
const path = require('node:path');
const Module = require('node:module');
const ts = require('typescript');

if (!global.__PH_TS_REGISTERED__) {
  const projectRoot = path.resolve(__dirname, '..', '..');

  const originalResolveFilename = Module._resolveFilename;
  Module._resolveFilename = function patchedResolveFilename(request, parent, isMain, options) {
    if (typeof request === 'string' && request.startsWith('@/')) {
      request = path.join(projectRoot, request.slice(2));
    }
    return originalResolveFilename.call(this, request, parent, isMain, options);
  };

  function compileTs(module, filename) {
    const source = fs.readFileSync(filename, 'utf8');
    const { outputText } = ts.transpileModule(source, {
      fileName: filename,
      compilerOptions: {
        module: ts.ModuleKind.CommonJS,
        moduleResolution: ts.ModuleResolutionKind.NodeJs,
        target: ts.ScriptTarget.ES2020,
        jsx: ts.JsxEmit.ReactJSX,
        esModuleInterop: true,
        resolveJsonModule: true,
      },
    });
    module._compile(outputText, filename);
  }

  require.extensions['.ts'] = compileTs;
  require.extensions['.tsx'] = compileTs;
  global.__PH_TS_REGISTERED__ = true;
}
