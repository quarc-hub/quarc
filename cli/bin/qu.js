#!/usr/bin/env node

const path = require('path');
const { execSync } = require('child_process');

const command = process.argv[2];
const args = process.argv.slice(3);

if (!command) {
  console.log('Usage: qu <command> [options]');
  console.log('\nAvailable commands:');
  console.log('  build [options]    Build the application');
  console.log('  serve [options]    Watch and rebuild on file changes');
  console.log('\nGlobal options:');
  console.log('  -c, --configuration <env>  Specify environment (development/production)');
  console.log('  -e, --environment <env>    Alias for --configuration');
  console.log('\nBuild options:');
  console.log('  -v, --verbose              Show detailed build logs');
  console.log('\nServe options:');
  console.log('  -p, --port <port>          Specify port (default: 4200)');
  console.log('  -v, --verbose              Show detailed server logs');
  console.log('\nOther commands:');
  console.log('  help                       Show this help message');
  process.exit(0);
}

if (command === 'help' || command === '--help' || command === '-h') {
  console.log('Usage: qu <command> [options]');
  console.log('\nAvailable commands:');
  console.log('  build [options]    Build the application');
  console.log('  serve [options]    Watch and rebuild on file changes');
  console.log('\nGlobal options:');
  console.log('  -c, --configuration <env>  Specify environment (development/production)');
  console.log('  -e, --environment <env>    Alias for --configuration');
  console.log('\nBuild options:');
  console.log('  -v, --verbose              Show detailed build logs');
  console.log('\nServe options:');
  console.log('  -p, --port <port>          Specify port (default: 4200)');
  console.log('  -v, --verbose              Show detailed server logs');
  console.log('\nOther commands:');
  console.log('  help                       Show this help message');
  console.log('\nExamples:');
  console.log('  qu build');
  console.log('  qu build -c production');
  console.log('  qu build -v');
  console.log('  qu build -c production --verbose');
  console.log('  qu serve');
  console.log('  qu serve -v');
  console.log('  qu serve -c development --port 3000');
  console.log('  qu serve -p 8080 --verbose');
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
    const buildScript = path.join(cliPath, 'scripts', 'build.ts');
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
    const serveScript = path.join(cliPath, 'scripts', 'serve.ts');
    const tsNodePath = path.join(cwd, 'node_modules', '.bin', 'ts-node');
    const serveArgs = args.join(' ');
    execSync(`${tsNodePath} ${serveScript} ${serveArgs}`, { stdio: 'inherit', cwd });
  } catch (error) {
    process.exit(1);
  }
} else {
  console.error(`Unknown command: ${command}`);
  console.error('Run "qu help" for usage information');
  process.exit(1);
}
