#!/usr/bin/env node

const path = require('path');
const { execSync } = require('child_process');

const command = process.argv[2];
const args = process.argv.slice(3);

if (!command) {
  console.log('Usage: qu <command> [options]');
  console.log('\nAvailable commands:');
  console.log('  build              Build the application');
  console.log('  serve [options]    Watch and rebuild on file changes');
  console.log('    --port, -p       Specify port (default: 4300)');
  console.log('  help               Show this help message');
  process.exit(0);
}

if (command === 'help' || command === '--help' || command === '-h') {
  console.log('Usage: qu <command> [options]');
  console.log('\nAvailable commands:');
  console.log('  build              Build the application');
  console.log('  serve [options]    Watch and rebuild on file changes');
  console.log('    --port, -p       Specify port (default: 4300)');
  console.log('  help               Show this help message');
  console.log('\nExamples:');
  console.log('  qu serve');
  console.log('  qu serve --port 3000');
  console.log('  qu serve -p 8080');
  process.exit(0);
}

function findQuarcCliPath(cwd) {
  // Try local quarc/cli first
  const localPath = path.join(cwd, 'quarc', 'cli');
  if (require('fs').existsSync(localPath)) {
    return localPath;
  }
  // Try dependencies/quarc/cli (relative to project root)
  const depsPath = path.join(cwd, '..', '..', 'dependencies', 'quarc', 'cli');
  if (require('fs').existsSync(depsPath)) {
    return depsPath;
  }
  // Fallback to CLI's own directory
  return path.join(__dirname, '..');
}

if (command === 'build') {
  try {
    const cwd = process.cwd();
    const cliPath = findQuarcCliPath(cwd);
    const buildScript = path.join(cliPath, 'build.ts');
    const tsNodePath = path.join(cwd, 'node_modules', '.bin', 'ts-node');
    const buildArgs = args.join(' ');
    execSync(`${tsNodePath} ${buildScript} ${buildArgs}`, { stdio: 'inherit', cwd });
  } catch (error) {
    process.exit(1);
  }
} else if (command === 'serve') {
  try {
    const cwd = process.cwd();
    const cliPath = findQuarcCliPath(cwd);
    const serveScript = path.join(cliPath, 'serve.ts');
    const tsNodePath = path.join(cwd, 'node_modules', '.bin', 'ts-node');
    execSync(`${tsNodePath} ${serveScript}`, { stdio: 'inherit', cwd });
  } catch (error) {
    process.exit(1);
  }
} else {
  console.error(`Unknown command: ${command}`);
  console.error('Run "qu help" for usage information');
  process.exit(1);
}
