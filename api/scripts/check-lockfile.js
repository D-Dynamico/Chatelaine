// Fails when package-lock.json is missing an optional dependency of a locked package.
// npm 11.5 drops optional platform bindings (rolldown, lightningcss) from the lockfile on
// any install after the first, and `npm ci` on Linux then installs vitest without its
// native binding. Nothing fails locally because node_modules still has it, so the lint
// gate checks the lockfile itself. Fix: delete node_modules and package-lock.json, then
// run `npm install` once (docs/WORKFLOWS.md §28).
import { readFileSync } from 'node:fs';

const LOCKFILE = new URL('../package-lock.json', import.meta.url);
const NODE_MODULES = 'node_modules/';

const { packages } = JSON.parse(readFileSync(LOCKFILE, 'utf8'));

/** Mirrors Node's lookup: the package's own node_modules, then each ancestor's. */
function isLocked(fromPath, name) {
  let dir = fromPath;
  for (;;) {
    const candidate = `${dir ? `${dir}/` : ''}${NODE_MODULES}${name}`;
    if (candidate in packages) return true;
    if (dir === '') return false;
    dir = dir.slice(0, dir.lastIndexOf(NODE_MODULES)).replace(/\/$/, '');
  }
}

const missing = Object.entries(packages).flatMap(([path, entry]) =>
  Object.keys(entry.optionalDependencies ?? {})
    .filter((name) => !isLocked(path, name))
    .map((name) => `  ${name} (optional dependency of ${path || 'the root package'})`),
);

if (missing.length > 0) {
  process.stderr.write(
    `package-lock.json is missing ${String(missing.length)} optional dependencies:\n` +
      `${missing.join('\n')}\n` +
      'Delete node_modules and package-lock.json, then run npm install once.\n',
  );
  process.exitCode = 1;
}
