// Bundles the React control panel (renderer/index.jsx) into renderer/dist/bundle.js
const esbuild = require('esbuild');
const path = require('path');

const root = path.join(__dirname, '..');

esbuild
  .build({
    entryPoints: [path.join(root, 'renderer', 'index.jsx')],
    bundle: true,
    outfile: path.join(root, 'renderer', 'dist', 'bundle.js'),
    platform: 'browser',
    target: 'chrome120',
    loader: { '.jsx': 'jsx' },
    define: { 'process.env.NODE_ENV': '"production"' },
    logLevel: 'info',
  })
  .catch(() => process.exit(1));
