// Expo Metro config for consuming the shared `flock-core` package (the repo's
// top-level ../../lib) from this out-of-root Expo app.
//
// flock-core is installed as a `file:../../lib` dependency, so npm places a
// symlink at node_modules/flock-core pointing to ../../lib. Metro resolves it
// like any node_module; we add the workspace root to watchFolders so Metro
// watches/serves the real source behind that symlink. nodeModulesPaths stays
// pinned to this app's own node_modules — flock-core has zero external
// dependencies, so no second copy of React is ever pulled from the repo root.
const { getDefaultConfig } = require("expo/metro-config");
const path = require("path");

const projectRoot = __dirname;
const sharedLib = path.resolve(projectRoot, "../../lib");

const config = getDefaultConfig(projectRoot);
// Watch only the shared lib (the symlink target behind node_modules/flock-core),
// not the whole repo root — keeps the dev server from crawling .next/node_modules.
config.watchFolders = [sharedLib];
config.resolver.nodeModulesPaths = [path.resolve(projectRoot, "node_modules")];

module.exports = config;
