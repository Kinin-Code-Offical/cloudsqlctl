import { execa } from 'execa';
import fs from 'fs-extra';
import path from 'path';
import os from 'os';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT_DIR = path.join(__dirname, '..');
const CLI_PATH = path.join(ROOT_DIR, 'dist', 'cli.cjs');
const DOCS_DIR = path.join(ROOT_DIR, 'docs');
const DOCS_FILE = path.join(DOCS_DIR, 'commands.md');

async function runCli(args) {
  const { stdout } = await execa('node', [CLI_PATH, ...args]);

  // Sanitize output: replace user-specific paths with placeholders
  // This prevents CI failures due to different user names (e.g., ymc vs runneradmin)
  let sanitized = stdout;

  const homeDir = os.homedir();
  const escapedHome = homeDir.replace(/\\/g, '\\\\');

  // Replace various forms of the home directory path
  sanitized = sanitized.split(homeDir).join('<USER_HOME>');
  sanitized = sanitized.split(escapedHome).join('<USER_HOME>');

  return sanitized;
}

async function generateDocs() {
  console.log('Generating documentation...');

  if (!(await fs.pathExists(CLI_PATH))) {
    console.error('Error: dist/cli.cjs not found. Run "npm run build" first.');
    process.exit(1);
  }

  await fs.ensureDir(DOCS_DIR);

  const version = (await runCli(['--version'])).trim();
  const date = new Date().toISOString().split('T')[0];

  let content = `# Cloud SQL Proxy CLI Reference\n\n`;
  content += `**Version:** ${version}\n`;
  content += `**Generated:** ${date}\n\n`;
  content += `## Overview\n\n`;
  content += '```text\n' + (await runCli(['--help'])) + '\n```\n\n';

  const commands = [
    'install',
    'update',
    'select',
    'list',
    'connect',
    'start',
    'stop',
    'status',
    'logs',
    'doctor',
    'reset',
    'env',
    'service',
    'ps1',
    'repair',
    'check',
    'gcloud',
    'auth',
    'setup',
    'paths',
    'upgrade',
    'support',
  ];

  content += `## Commands\n\n`;

  for (const cmd of commands) {
    console.log(`Processing ${cmd}...`);
    content += `### ${cmd}\n\n`;
    content += '```text\n' + (await runCli([cmd, '--help'])) + '\n```\n\n';
  }

  await fs.writeFile(DOCS_FILE, content.trim() + '\n');
  console.log(`Documentation generated at ${DOCS_FILE}`);
}

generateDocs().catch((err) => {
  console.error(err);
  process.exit(1);
});
