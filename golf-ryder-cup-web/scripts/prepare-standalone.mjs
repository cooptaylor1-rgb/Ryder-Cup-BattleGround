import { cp, mkdir, rm } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import path from 'node:path';

const appRoot = process.cwd();
const standaloneRoot = path.join(appRoot, '.next', 'standalone', 'golf-ryder-cup-web');

async function copyIfExists(source, destination) {
  if (!existsSync(source)) return false;

  await rm(destination, { recursive: true, force: true });
  await mkdir(path.dirname(destination), { recursive: true });
  await cp(source, destination, { recursive: true });
  return true;
}

if (!existsSync(standaloneRoot)) {
  throw new Error(`Standalone output not found at ${standaloneRoot}`);
}

const copiedStatic = await copyIfExists(
  path.join(appRoot, '.next', 'static'),
  path.join(standaloneRoot, '.next', 'static')
);
const copiedPublic = await copyIfExists(
  path.join(appRoot, 'public'),
  path.join(standaloneRoot, 'public')
);

console.log('[Build] Prepared standalone runtime assets', {
  static: copiedStatic,
  public: copiedPublic,
});
