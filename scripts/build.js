const fs = require('node:fs');
const path = require('node:path');
const { spawnSync } = require('node:child_process');

const projectRoot = path.resolve(__dirname, '..');
const releaseDirectory = path.join(projectRoot, 'release');
fs.mkdirSync(releaseDirectory, { recursive: true });

const npmCommand = process.platform === 'win32' ? 'npm.cmd' : 'npm';
const result = spawnSync(npmCommand, ['pack', '--pack-destination', releaseDirectory], {
  cwd: projectRoot,
  stdio: 'inherit',
});

if (result.error) throw result.error;
process.exitCode = result.status ?? 1;
