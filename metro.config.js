const path = require('path');
const { getDefaultConfig } = require('expo/metro-config');

/** @type {import('expo/metro-config').MetroConfig} */
const config = getDefaultConfig(__dirname);

// zustand v4 ships an ESM build that reads `import.meta.env.MODE` for its deprecation
// warnings. On web Metro picks that build up through the "import" export condition and
// copies `import.meta` verbatim into the bundle — but `expo export` links the bundle with
// a plain `<script defer>`, so the browser throws "Cannot use 'import.meta' outside a
// module". Point every bare `zustand` specifier at the CommonJS build (the same one the
// native platforms already resolve to via the "react-native" condition), which guards on
// `process.env.NODE_ENV` instead.
const zustandRoot = path.dirname(require.resolve('zustand/package.json', { paths: [__dirname] }));
const defaultResolveRequest = config.resolver.resolveRequest;

config.resolver.resolveRequest = (context, moduleName, platform) => {
  if (moduleName === 'zustand' || moduleName.startsWith('zustand/')) {
    const subpath = moduleName.slice('zustand'.length).replace(/^\//, '') || 'index';
    return { type: 'sourceFile', filePath: path.join(zustandRoot, `${subpath}.js`) };
  }

  const resolve = defaultResolveRequest ?? context.resolveRequest;
  return resolve(context, moduleName, platform);
};

module.exports = config;
