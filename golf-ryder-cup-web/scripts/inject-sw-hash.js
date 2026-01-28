#!/usr/bin/env node
/**
 * Post-build script to inject build hash into service worker
 *
 * This ensures the SW cache is automatically invalidated on new builds.
 * The hash is derived from package.json version + build timestamp.
 */

const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

// Generate build hash from version and timestamp
const packageJson = require('../package.json');
const version = packageJson.version;
const timestamp = Date.now().toString(36);
const buildHash = crypto
  .createHash('md5')
  .update(`${version}-${timestamp}`)
  .digest('hex')
  .slice(0, 8);

console.log(`[Build] Injecting build hash: ${buildHash}`);

// Path to the built service worker
const swPaths = [
  path.join(__dirname, '../.next/static/sw.js'),
  path.join(__dirname, '../public/sw.js'),
];

for (const swPath of swPaths) {
  if (fs.existsSync(swPath)) {
    let content = fs.readFileSync(swPath, 'utf8');

    // Inject build hash at the start of the file
    if (!content.includes('self.__BUILD_HASH__')) {
      content = `self.__BUILD_HASH__ = '${buildHash}';\n` + content;
    } else {
      // Replace existing placeholder
      content = content.replace(
        /self\.__BUILD_HASH__\s*=\s*['"][^'"]*['"];?/,
        `self.__BUILD_HASH__ = '${buildHash}';`
      );
    }

    fs.writeFileSync(swPath, content);
    console.log(`[Build] Updated SW at ${swPath}`);
  }
}

console.log('[Build] Service worker build hash injection complete');
