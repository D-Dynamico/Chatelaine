// Fails when package-lock.json is missing an optional dependency of a locked package.
// npm 11.5 drops optional platform bindings (rolldown, lightningcss) from the lockfile on
// any install after the first, and `npm ci` on Linux then installs vitest without its
// native binding. Nothing fails locally because node_modules still has it, so the lint
// gate checks the lockfile itself. Fix: delete node_modules and package-lock.json, then
// run `npm install` once (docs/WORKFLOWS.md §28).
//
// A dependency only counts as locked when the copy Node would resolve has a matching
// version. A nested package (vite's own rolldown) can lose its bindings while the hoisted
// copy of a different version keeps bindings of the same name, which npm ci would then
// pair with the wrong rolldown.
import { readFileSync } from 'node:fs';

const LOCKFILE = new URL('../package-lock.json', import.meta.url);
const NODE_MODULES = 'node_modules/';

const { packages } = JSON.parse(readFileSync(LOCKFILE, 'utf8'));

/** Covers the spec forms platform bindings use: exact, `~` and `^`. Others pass. */
function satisfies(version, spec) {
  const match = /^([~^]?)(\d+)\.(\d+)\.(\d+)$/.exec(spec);
  if (!match) return true;
  const [, operator, ...wanted] = match;
  const [major, minor, patch] = wanted.map(Number);
  const [vMajor, vMinor, vPatch] = version.split(/[.+-]/).slice(0, 3).map(Number);
  if (operator === '') return version === spec;
  if (vMajor !== major) return false;
  if (operator === '~' || major === 0) {
    return vMinor === minor && vPatch >= patch;
  }
  return vMinor > minor || (vMinor === minor && vPatch >= patch);
}

/** Mirrors Node's lookup: the package's own node_modules, then each ancestor's. */
function resolve(fromPath, name) {
  let dir = fromPath;
  for (;;) {
    const candidate = `${dir ? `${dir}/` : ''}${NODE_MODULES}${name}`;
    if (candidate in packages) return packages[candidate];
    if (dir === '') return undefined;
    dir = dir.slice(0, dir.lastIndexOf(NODE_MODULES)).replace(/\/$/, '');
  }
}

const missing = Object.entries(packages).flatMap(([path, entry]) =>
  Object.entries(entry.optionalDependencies ?? {})
    .filter(([name, spec]) => {
      const locked = resolve(path, name);
      return locked === undefined || !satisfies(locked.version, spec);
    })
    .map(
      ([name, spec]) => `  ${name}@${spec} (optional dependency of ${path || 'the root package'})`,
    ),
);

if (missing.length > 0) {
  process.stderr.write(
    `package-lock.json is missing ${String(missing.length)} optional dependencies:\n` +
      `${missing.join('\n')}\n` +
      'Delete node_modules and package-lock.json, then run npm install once.\n',
  );
  process.exitCode = 1;
}
