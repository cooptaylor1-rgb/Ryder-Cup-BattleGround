import { spawn } from 'node:child_process';

const SKIP = process.env.RAILWAY_HEALTH_SMOKE_SKIP === '1';
const PORT = process.env.RAILWAY_HEALTH_SMOKE_PORT || '4300';
const TIMEOUT_MS = Number(process.env.RAILWAY_HEALTH_SMOKE_TIMEOUT_MS || 60_000);
const MODE = process.env.RAILWAY_HEALTH_SMOKE_MODE || 'liveness';
const HEALTH_URL = `http://127.0.0.1:${PORT}/api/health`;
const IS_READINESS = MODE === 'readiness';

if (SKIP) {
  console.log('[Railway Smoke] Skipping local health smoke.');
  process.exit(0);
}

const server = spawn('pnpm', ['start'], {
  cwd: process.cwd(),
  env: {
    ...process.env,
    PORT,
    HEALTHCHECK_STRICT: process.env.HEALTHCHECK_STRICT ?? (IS_READINESS ? '1' : '0'),
  },
  stdio: ['ignore', 'pipe', 'pipe'],
});

let output = '';
let exited = false;

server.stdout.on('data', (chunk) => {
  output += chunk.toString();
});

server.stderr.on('data', (chunk) => {
  output += chunk.toString();
});

server.on('exit', (code, signal) => {
  exited = true;
  if (code !== 0 && code !== null) {
    console.error(`[Railway Smoke] Server exited early with code ${code}.`);
  } else if (signal) {
    console.error(`[Railway Smoke] Server exited from signal ${signal}.`);
  }
});

function wait(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function stopServer() {
  if (server.killed) return;
  server.kill('SIGTERM');
  await wait(1500);
  if (!server.killed) server.kill('SIGKILL');
}

async function readHealth() {
  const response = await fetch(HEALTH_URL, {
    cache: 'no-store',
    method: IS_READINESS ? 'GET' : 'HEAD',
  });

  if (!IS_READINESS) {
    return { response, body: { status: response.ok ? 'healthy' : 'unhealthy' } };
  }

  const text = await response.text();
  let body;
  try {
    body = JSON.parse(text);
  } catch {
    body = { raw: text };
  }

  return { response, body };
}

try {
  const startedAt = Date.now();
  let lastError = null;

  while (Date.now() - startedAt < TIMEOUT_MS) {
    if (exited) {
      throw new Error(`Next server exited before health passed.\n${output}`);
    }

    try {
      const { response, body } = await readHealth();
      if (response.ok && body.status === 'healthy') {
        console.log(`[Railway Smoke] ${HEALTH_URL} healthy.`);
        await stopServer();
        process.exit(0);
      }

      lastError = new Error(
        `Health returned ${response.status}: ${JSON.stringify(body, null, 2)}`
      );
    } catch (err) {
      lastError = err;
    }

    await wait(1000);
  }

  throw lastError ?? new Error(`Timed out waiting for ${HEALTH_URL}`);
} catch (err) {
  await stopServer();
  console.error('[Railway Smoke] Health smoke failed.');
  console.error(err instanceof Error ? err.message : err);
  if (output.trim()) {
    console.error('[Railway Smoke] Server output:');
    console.error(output.trim());
  }
  process.exit(1);
}
