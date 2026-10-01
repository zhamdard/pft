/**
 * Metro config for the PFT native app.
 *
 * `watchFolders` is the reason this works at all: the shared logic layer
 * (money, dates, stats, earnings, history, Firestore services) lives in the
 * web app's `src/`, and Metro only watches its own project root by default —
 * without this it cannot even see those files.
 *
 * `nodeModulesPaths` adds this app's node_modules as a search location.
 *
 * It deliberately does NOT set `disableHierarchicalLookup`. That flag looks
 * like the tidy fix for "shared code resolves the web app's React", but it
 * also stops Metro walking into nested packages — `expo-asset` lives at
 * `expo/node_modules/expo-asset`, and disabling the walk makes the bundle
 * fail outright with `Unable to resolve "expo-asset"`.
 *
 * The duplicate-React hazard is handled at the boundary instead: no module
 * under `../src` that imports `react` is in this app's graph. Hooks and
 * context are React-bound UI glue and live in `mobile/src/`; everything
 * platform-neutral stays shared. See mobile/README.md.
 */
const { getDefaultConfig } = require('expo/metro-config')
const path = require('path')

const projectRoot = __dirname
const repoRoot = path.resolve(projectRoot, '..')

const config = getDefaultConfig(projectRoot)

config.watchFolders = [repoRoot]
config.resolver.nodeModulesPaths = [path.resolve(projectRoot, 'node_modules')]

module.exports = config
