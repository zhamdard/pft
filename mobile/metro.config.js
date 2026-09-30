/**
 * Metro config for the PFT native app.
 *
 * The point of this file is one line: `watchFolders`. The shared logic layer
 * (money, dates, stats, earnings, history, Firestore services) lives in the
 * web app's `src/` so both apps run the same code and the same 27 unit tests.
 * Metro only watches the project root by default, so without this it cannot
 * even see those files.
 *
 * `nodeModulesPaths` pins bare imports (react, firebase, …) to THIS app's
 * node_modules. The repo root has its own copy for the web build — React
 * 19.3 vs React 19.2.3 — and letting Metro wander up would resolve the wrong
 * one and hand React two different copies.
 */
const { getDefaultConfig } = require('expo/metro-config')
const path = require('path')

const projectRoot = __dirname
const repoRoot = path.resolve(projectRoot, '..')

const config = getDefaultConfig(projectRoot)

config.watchFolders = [repoRoot]
config.resolver.nodeModulesPaths = [path.resolve(projectRoot, 'node_modules')]

module.exports = config
