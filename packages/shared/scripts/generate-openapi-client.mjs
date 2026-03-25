import { spawnSync } from 'node:child_process';
import { rmSync } from 'node:fs';
import path from 'node:path';
import process from 'node:process';

const targets = {
  alpha: {
    outputDir: 'client',
    specPath: '/api/alpha-json',
  },
  v1: {
    outputDir: 'client-v1',
    specPath: '/api/v1-json',
  },
};

const targetName = process.argv[2];
if (!targetName || !(targetName in targets)) {
  console.error('Usage: node ./scripts/generate-openapi-client.mjs <alpha|v1>');
  process.exit(1);
}

const target = targets[targetName];
const baseUrl = (process.env.BLUELIGHT_OPENAPI_BASE_URL ?? process.env.OPENAPI_GENERATOR_BASE_URL ?? 'https://localhost:3091').replace(/\/+$/, '');
const specUrl = `${baseUrl}${target.specPath}`;

rmSync(path.resolve(process.cwd(), target.outputDir), { recursive: true, force: true });

console.log(`[generate-api] Target: ${targetName}`);
console.log(`[generate-api] Spec:   ${specUrl}`);

const pnpmBinary = process.platform === 'win32' ? 'pnpm.cmd' : 'pnpm';
const result = spawnSync(pnpmBinary, ['exec', 'openapi-generator-cli', 'generate', '-g=typescript-fetch', '-i', specUrl, '-o', `./${target.outputDir}`, '--skip-validate-spec'], {
  env: process.env,
  stdio: 'inherit',
});

if (result.error) {
  throw result.error;
}

process.exit(result.status ?? 1);
