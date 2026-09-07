const { getDefaultConfig } = require('expo/metro-config');
const { withNativeWind } = require('nativewind/metro');

const config = getDefaultConfig(__dirname);

// Some packages (zod's unified v3/v4 package, in particular) ship a `package.json`
// "exports" map that Metro's package-exports resolver mis-resolves — even for plain
// relative imports made from inside the package itself. Falling back to "main"/legacy
// resolution avoids that whole class of bug; nothing in this app relies on exports-only
// packages that require it.
config.resolver.unstable_enablePackageExports = false;

// Use more available CPU cores for parallel JS transforms.
// Metro defaults to Math.ceil(numCPUs / 2) = 6 on a 12-core machine.
// Leaving 2 cores for the OS; this alone saves ~2–3 s on a cold build.
config.maxWorkers = 10;

// Exclude native-code directories from the Haste module map scan.
// react-native-reanimated ships ~674 non-JS files and react-native-worklets
// ships ~127 — Metro indexes all of them despite never using them, which
// accounts for ~1–2 s of the cold-start Haste rebuild.
const existingBlockList = config.resolver.blockList;
config.resolver.blockList = [
  ...(existingBlockList
    ? Array.isArray(existingBlockList) ? existingBlockList : [existingBlockList]
    : []),
  /node_modules[/\\]react-native-reanimated[/\\](android|ios)[/\\].*/,
  /node_modules[/\\]react-native-worklets[/\\](android|ios)[/\\].*/,
];

module.exports = withNativeWind(config, { input: './global.css' });
