#!/usr/bin/env node

import * as fs from 'fs';
import * as path from 'path';
import * as zlib from 'zlib';
import { execSync } from 'child_process';
import * as esbuild from 'esbuild';
import { minify } from 'terser';
import Table from 'cli-table3';
import * as sass from 'sass';
import { liteTransformer } from './lite-transformer';
import { consoleTransformer } from './build/transformers/console-transformer';

const projectRoot = process.cwd();
const srcDir = path.join(projectRoot, 'src');
const publicDir = path.join(srcDir, 'public');
const distDir = path.join(projectRoot, 'dist');
const configPath = path.join(projectRoot, 'quarc.json');

interface SizeThreshold {
  warning: string;
  error: string;
}

interface EnvironmentConfig {
  treatWarningsAsErrors: boolean;
  minifyNames: boolean;
  generateSourceMaps: boolean;
  compressed?: boolean;
}

interface ActionsConfig {
  prebuild?: string[];
  postbuild?: string[];
}

interface LiteConfig {
  environment: string;
  build: {
    actions?: ActionsConfig;
    minifyNames: boolean;
    scripts?: string[];
    externalEntryPoints?: string[];
    styles?: string[];
    externalStyles?: string[];
    limits: {
      total: SizeThreshold;
      main: SizeThreshold;
      sourceMaps: SizeThreshold;
      components?: SizeThreshold;
    };
  };
  environments: {
    [key: string]: EnvironmentConfig;
  };
}

interface ValidationResult {
  status: 'success' | 'warning' | 'error';
  message: string;
  actual: number;
  limit: number;
}

function parseSizeString(sizeStr: string): number {
  const match = sizeStr.match(/^([\d.]+)\s*(B|KB|MB|GB)$/i);
  if (!match) throw new Error(`Invalid size format: ${sizeStr}`);

  const value = parseFloat(match[1]);
  const unit = match[2].toUpperCase();

  const multipliers: { [key: string]: number } = {
    B: 1,
    KB: 1024,
    MB: 1024 * 1024,
    GB: 1024 * 1024 * 1024,
  };

  return value * (multipliers[unit] || 1);
}

function getCliEnvironment(): string | undefined {
  const args = process.argv.slice(2);
  const envIndex = args.findIndex(arg => arg === '--environment' || arg === '-e');
  if (envIndex !== -1 && args[envIndex + 1]) {
    return args[envIndex + 1];
  }
  return undefined;
}

function loadConfig(): LiteConfig {
  const cliEnv = getCliEnvironment();

  if (!fs.existsSync(configPath)) {
    return {
      environment: cliEnv ?? 'development',
      build: {
        minifyNames: false,
        limits: {
          total: { warning: '50 KB', error: '60 KB' },
          main: { warning: '15 KB', error: '20 KB' },
          sourceMaps: { warning: '10 KB', error: '20 KB' },
        },
      },
      environments: {
        development: {
          treatWarningsAsErrors: false,
          minifyNames: false,
          generateSourceMaps: true,
        },
        production: {
          treatWarningsAsErrors: true,
          minifyNames: true,
          generateSourceMaps: false,
        },
      },
    };
  }

  const content = fs.readFileSync(configPath, 'utf-8');
  const config = JSON.parse(content) as LiteConfig;

  if (cliEnv) {
    config.environment = cliEnv;
  }

  return config;
}

function getEnvironmentConfig(config: LiteConfig): EnvironmentConfig {
  const envConfig = config.environments[config.environment];
  if (!envConfig) {
    console.warn(`Environment '${config.environment}' not found in config, using defaults`);
    return {
      treatWarningsAsErrors: false,
      minifyNames: false,
      generateSourceMaps: true,
    };
  }
  return envConfig;
}

function ensureDirectoryExists(dir: string): void {
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
}

function copyDirectory(src: string, dest: string): void {
  if (!fs.existsSync(src)) {
    console.warn(`Source directory not found: ${src}`);
    return;
  }

  ensureDirectoryExists(dest);

  const files = fs.readdirSync(src);
  files.forEach(file => {
    const srcPath = path.join(src, file);
    const destPath = path.join(dest, file);
    const stat = fs.statSync(srcPath);

    if (stat.isDirectory()) {
      copyDirectory(srcPath, destPath);
    } else {
      fs.copyFileSync(srcPath, destPath);
    }
  });
}

async function bundleTypeScript(): Promise<void> {
  try {
    console.log('Bundling TypeScript with esbuild...');
    const config = loadConfig();
    const envConfig = getEnvironmentConfig(config);
    const mainTsPath = path.join(srcDir, 'main.ts');

    await esbuild.build({
      entryPoints: [mainTsPath],
      bundle: true,
      minify: false,
      sourcemap: envConfig.generateSourceMaps,
      outdir: distDir,
      format: 'esm',
      target: 'ES2020',
      splitting: true,
      chunkNames: 'chunks/[name]-[hash]',
      external: [],
      plugins: [liteTransformer(), consoleTransformer()],
      tsconfig: path.join(projectRoot, 'tsconfig.json'),
      treeShaking: true,
      logLevel: 'info',
      define: {
        'process.env.NODE_ENV': config.environment === 'production' ? '"production"' : '"development"',
      },
      drop: config.environment === 'production' ? ['console', 'debugger'] : ['debugger'],
      pure: config.environment === 'production' ? ['console.log', 'console.error', 'console.warn', 'console.info', 'console.debug'] : [],
      globalName: undefined,
    });

    console.log('TypeScript bundling completed.');
    await bundleExternalEntryPoints();
    await obfuscateAndMinifyBundles();
  } catch (error) {
    console.error('TypeScript bundling failed:', error instanceof Error ? error.message : String(error));
    process.exit(1);
  }
}

async function bundleExternalEntryPoints(): Promise<void> {
  const config = loadConfig();
  const envConfig = getEnvironmentConfig(config);
  const externalEntryPoints = config.build.externalEntryPoints || [];

  if (externalEntryPoints.length === 0) {
    return;
  }

  console.log('Bundling external entry points...');
  const externalDistDir = path.join(distDir, 'external');
  ensureDirectoryExists(externalDistDir);

  for (const entryPoint of externalEntryPoints) {
    const entryPath = path.join(projectRoot, entryPoint);

    if (!fs.existsSync(entryPath)) {
      console.warn(`External entry point not found: ${entryPath}`);
      continue;
    }

    const basename = path.basename(entryPoint, '.ts');

    await esbuild.build({
      entryPoints: [entryPath],
      bundle: true,
      minify: false,
      sourcemap: envConfig.generateSourceMaps,
      outfile: path.join(externalDistDir, `${basename}.js`),
      format: 'esm',
      target: 'ES2020',
      splitting: false,
      external: [],
      plugins: [liteTransformer(), consoleTransformer()],
      tsconfig: path.join(projectRoot, 'tsconfig.json'),
      treeShaking: true,
      logLevel: 'info',
      define: {
        'process.env.NODE_ENV': config.environment === 'production' ? '"production"' : '"development"',
      },
      drop: config.environment === 'production' ? ['console', 'debugger'] : ['debugger'],
      pure: config.environment === 'production' ? ['console.log', 'console.error', 'console.warn', 'console.info', 'console.debug'] : [],
    });

    console.log(`✓ Bundled external: ${basename}.js`);
  }
}

async function obfuscateAndMinifyBundles(): Promise<void> {
  try {
    console.log('Applying advanced obfuscation and minification...');
    const config = loadConfig();
    const envConfig = getEnvironmentConfig(config);

    const collectJsFiles = (dir: string, prefix = ''): { file: string; filePath: string }[] => {
      const results: { file: string; filePath: string }[] = [];
      if (!fs.existsSync(dir)) return results;

      const entries = fs.readdirSync(dir, { withFileTypes: true });
      for (const entry of entries) {
        const fullPath = path.join(dir, entry.name);
        const relativePath = prefix ? `${prefix}/${entry.name}` : entry.name;

        if (entry.isDirectory()) {
          results.push(...collectJsFiles(fullPath, relativePath));
        } else if (entry.name.endsWith('.js') && !entry.name.endsWith('.map')) {
          results.push({ file: relativePath, filePath: fullPath });
        }
      }
      return results;
    };

    const jsFiles = collectJsFiles(distDir);

    for (const { file, filePath } of jsFiles) {
      const code = fs.readFileSync(filePath, 'utf-8');

      const result = await minify(code, {
        compress: {
          passes: 3,
          unsafe: true,
          unsafe_methods: true,
          unsafe_proto: true,
          drop_console: config.environment === 'production',
          drop_debugger: true,
          inline: 3,
          reduce_vars: true,
          reduce_funcs: true,
          collapse_vars: true,
          dead_code: true,
          evaluate: true,
          hoist_funs: true,
          hoist_vars: true,
          if_return: true,
          join_vars: true,
          loops: true,
          properties: false,
          sequences: true,
          side_effects: true,
          switches: true,
          typeofs: true,
          unused: true,
        },
        mangle: envConfig.minifyNames ? {
          toplevel: true,
          keep_classnames: false,
          keep_fnames: false,
          properties: false,
        } : false,
        output: {
          comments: false,
          beautify: false,
          max_line_len: 1000,
        },
      });

      if (result.code) {
        fs.writeFileSync(filePath, result.code, 'utf-8');
        const originalSize = code.length;
        const newSize = result.code.length;
        const reduction = ((1 - newSize / originalSize) * 100).toFixed(2);
        console.log(`✓ ${file}: ${originalSize} → ${newSize} bytes (${reduction}% reduction)`);
      }
    }

    console.log('Obfuscation and minification completed.');
  } catch (error) {
    console.error('Obfuscation failed:', error instanceof Error ? error.message : String(error));
    process.exit(1);
  }
}

async function compileStyleFile(stylePath: string, outputDir: string): Promise<void> {
  const fullPath = path.join(projectRoot, stylePath);

  if (!fs.existsSync(fullPath)) {
    console.warn(`Style file not found: ${fullPath}`);
    return;
  }

  const ext = path.extname(fullPath);
  const basename = path.basename(fullPath, ext);
  const outputPath = path.join(outputDir, `${basename}.css`);

  ensureDirectoryExists(outputDir);

  if (ext === '.scss' || ext === '.sass') {
    try {
      const result = sass.compile(fullPath, {
        style: 'compressed',
        sourceMap: false,
      });
      fs.writeFileSync(outputPath, result.css, 'utf-8');
      console.log(`✓ Compiled ${stylePath} → ${basename}.css`);
    } catch (error) {
      console.error(`Failed to compile ${stylePath}:`, error instanceof Error ? error.message : String(error));
      throw error;
    }
  } else if (ext === '.css') {
    fs.copyFileSync(fullPath, outputPath);
    console.log(`✓ Copied ${stylePath} → ${basename}.css`);
  }
}

async function compileSCSS(): Promise<void> {
  const config = loadConfig();
  const styles = config.build.styles || [];
  const externalStyles = config.build.externalStyles || [];

  if (styles.length === 0 && externalStyles.length === 0) {
    return;
  }

  console.log('Compiling SCSS files...');

  for (const stylePath of styles) {
    await compileStyleFile(stylePath, distDir);
  }

  const externalDistDir = path.join(distDir, 'external');
  for (const stylePath of externalStyles) {
    await compileStyleFile(stylePath, externalDistDir);
  }
}

function injectScriptsAndStyles(indexPath: string): void {
  if (!fs.existsSync(indexPath)) {
    console.warn(`Index file not found: ${indexPath}`);
    return;
  }

  const config = loadConfig();
  let html = fs.readFileSync(indexPath, 'utf-8');

  const styles = config.build.styles || [];
  const scripts = config.build.scripts || [];

  let styleInjections = '';
  for (const stylePath of styles) {
    const basename = path.basename(stylePath, path.extname(stylePath));
    const cssFile = `${basename}.css`;
    if (!html.includes(cssFile)) {
      styleInjections += `    <link rel="stylesheet" href="./${cssFile}">\n`;
    }
  }

  if (styleInjections) {
    html = html.replace('</head>', `${styleInjections}</head>`);
  }

  let scriptInjections = '';
  for (const scriptPath of scripts) {
    const basename = path.basename(scriptPath);
    if (!html.includes(basename)) {
      scriptInjections += `    <script type="module" src="./${basename}"></script>\n`;
    }
  }

  const mainScript = `    <script type="module" src="./main.js"></script>\n`;
  if (!html.includes('main.js')) {
    scriptInjections += mainScript;
  }

  if (scriptInjections) {
    html = html.replace('</body>', `${scriptInjections}</body>`);
  }

  fs.writeFileSync(indexPath, html, 'utf-8');
  console.log('Injected scripts and styles into index.html');
}

function formatBytes(bytes: number): string {
  if (bytes === 0) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
}

function getGzipSize(content: Buffer | string): number {
  const buffer = typeof content === 'string' ? Buffer.from(content) : content;
  return zlib.gzipSync(buffer, { level: 9 }).length;
}

function displayBuildStats(): void {
  const files: { name: string; size: number; gzipSize: number; path: string }[] = [];
  let totalSize = 0;
  let totalGzipSize = 0;
  let mainSize = 0;
  let mapSize = 0;
  let externalSize = 0;

  const config = loadConfig();
  const envConfig = getEnvironmentConfig(config);
  const showGzip = envConfig.compressed ?? false;

  const isExternalFile = (relativePath: string): boolean => relativePath.startsWith('external/');
  const isMapFile = (name: string): boolean => name.endsWith('.map');

  const walkDir = (dir: string, prefix = ''): void => {
    const entries = fs.readdirSync(dir, { withFileTypes: true });

    entries.forEach(entry => {
      const fullPath = path.join(dir, entry.name);
      const relativePath = prefix ? `${prefix}/${entry.name}` : entry.name;

      if (entry.isDirectory()) {
        walkDir(fullPath, relativePath);
      } else if (!entry.name.endsWith('.gz')) {
        const content = fs.readFileSync(fullPath);
        const size = content.length;
        const gzipSize = getGzipSize(content);

        files.push({ name: entry.name, size, gzipSize, path: relativePath });

        if (isMapFile(entry.name)) {
          mapSize += size;
        } else if (isExternalFile(relativePath)) {
          externalSize += size;
        } else {
          totalSize += size;
          totalGzipSize += gzipSize;
        }

        if (entry.name === 'main.js') mainSize = size;
      }
    });
  };

  walkDir(distDir);
  files.sort((a, b) => b.size - a.size);

  const validationResults: { [key: string]: ValidationResult } = {};

  // Validate limits
  const totalWarning = parseSizeString(config.build.limits.total.warning);
  const totalError = parseSizeString(config.build.limits.total.error);
  const mainWarning = parseSizeString(config.build.limits.main.warning);
  const mainError = parseSizeString(config.build.limits.main.error);
  const mapWarning = parseSizeString(config.build.limits.sourceMaps.warning);
  const mapError = parseSizeString(config.build.limits.sourceMaps.error);

  validationResults.total = validateSizeWithThresholds('Total Size', totalSize, totalWarning, totalError);
  validationResults.main = validateSizeWithThresholds('Main Bundle', mainSize, mainWarning, mainError);
  validationResults.sourceMaps = validateSizeWithThresholds('Source Maps', mapSize, mapWarning, mapError);

  console.log(`\n📊 Size breakdown:`);
  console.log(`   App total: ${formatBytes(totalSize)}`);
  console.log(`   External:  ${formatBytes(externalSize)}`);
  console.log(`   Maps:      ${formatBytes(mapSize)}`);

  // Display table
  const tableHead = showGzip
    ? ['📄 File', '💾 Size', '📦 Gzip', '✓ Status']
    : ['📄 File', '💾 Size', '✓ Status'];
  const colWidths = showGzip ? [32, 12, 12, 10] : [40, 15, 12];

  const table = new Table({
    head: tableHead,
    style: { head: [], border: ['cyan'] },
    wordWrap: true,
    colWidths,
  });

  files.forEach(file => {
    const sizeStr = formatBytes(file.size);
    const gzipStr = formatBytes(file.gzipSize);
    const fileName = file.path.length > 28 ? file.path.substring(0, 25) + '...' : file.path;

    if (showGzip) {
      table.push([fileName, sizeStr, gzipStr, '✓']);
    } else {
      table.push([fileName, sizeStr, '✓']);
    }
  });

  if (showGzip) {
    table.push([
      '\x1b[1mTOTAL\x1b[0m',
      '\x1b[1m' + formatBytes(totalSize) + '\x1b[0m',
      '\x1b[1m' + formatBytes(totalGzipSize) + '\x1b[0m',
      '\x1b[1m✓\x1b[0m',
    ]);
  } else {
    table.push(['\x1b[1mTOTAL\x1b[0m', '\x1b[1m' + formatBytes(totalSize) + '\x1b[0m', '\x1b[1m✓\x1b[0m']);
  }

  console.log('\n' + table.toString());

  // Display validation results


  // Check if build should fail
  const hasErrors = Object.values(validationResults).some(r => r.status === 'error');
  const hasWarnings = Object.values(validationResults).some(r => r.status === 'warning');
  const treatWarningsAsErrors = envConfig.treatWarningsAsErrors;

  if (hasErrors || (hasWarnings && treatWarningsAsErrors)) {
    console.error('\n❌ Build validation failed!');
    Object.entries(validationResults).forEach(([key, result]) => {
      if (result.status === 'error' || (result.status === 'warning' && treatWarningsAsErrors)) {
        console.error(`   ${result.message}`);
      }
    });
    process.exit(1);
  }

  if (hasWarnings) {
    console.warn('\n⚠️  Build completed with warnings:');
    Object.entries(validationResults).forEach(([key, result]) => {
      if (result.status === 'warning') {
        console.warn(`   ${result.message}`);
      }
    });
  }
}

function validateSizeWithThresholds(name: string, actual: number, warningLimit: number, errorLimit: number): ValidationResult {
  if (actual > errorLimit) {
    return {
      status: 'error',
      message: `${name}: ${formatBytes(actual)} exceeds error limit of ${formatBytes(errorLimit)}`,
      actual,
      limit: warningLimit,
    };
  }

  if (actual > warningLimit) {
    return {
      status: 'warning',
      message: `${name}: ${formatBytes(actual)} exceeds warning limit of ${formatBytes(warningLimit)}`,
      actual,
      limit: warningLimit,
    };
  }

  return {
    status: 'success',
    message: `${name}: ${formatBytes(actual)} is within limits`,
    actual,
    limit: warningLimit,
  };
}

function generateCompressedFiles(): void {
  const config = loadConfig();
  const envConfig = getEnvironmentConfig(config);

  if (!envConfig.compressed) {
    return;
  }

  console.log('Generating compressed files...');

  const compressibleExtensions = ['.js', '.css', '.html', '.json', '.svg', '.xml'];

  const walkAndCompress = (dir: string): void => {
    const entries = fs.readdirSync(dir, { withFileTypes: true });

    entries.forEach(entry => {
      const fullPath = path.join(dir, entry.name);

      if (entry.isDirectory()) {
        walkAndCompress(fullPath);
      } else {
        const ext = path.extname(entry.name).toLowerCase();
        if (compressibleExtensions.includes(ext)) {
          const content = fs.readFileSync(fullPath);
          const compressed = zlib.gzipSync(content, { level: 9 });
          const gzPath = fullPath + '.gz';
          fs.writeFileSync(gzPath, compressed);
        }
      }
    });
  };

  walkAndCompress(distDir);
  console.log('✓ Compressed files generated (.gz)');
}

function runBuildActions(phase: 'prebuild' | 'postbuild'): void {
  const config = loadConfig();
  const actions = config.build.actions?.[phase] || [];

  if (actions.length === 0) return;

  console.log(`🔧 Running ${phase} actions...`);

  for (const action of actions) {
    console.log(`   ▶ ${action}`);
    try {
      execSync(action, {
        cwd: projectRoot,
        stdio: 'inherit',
      });
    } catch (err) {
      console.error(`   ❌ Action failed: ${action}`);
      throw err;
    }
  }
}

async function build(): Promise<void> {
  try {
    console.log('Starting build process...');

    runBuildActions('prebuild');

    if (fs.existsSync(distDir)) {
      fs.rmSync(distDir, { recursive: true, force: true });
    }
    ensureDirectoryExists(distDir);

    console.log('Copying public files...');
    copyDirectory(publicDir, distDir);

    await compileSCSS();

    await bundleTypeScript();

    const indexPath = path.join(distDir, 'index.html');
    injectScriptsAndStyles(indexPath);

    generateCompressedFiles();

    displayBuildStats();

    runBuildActions('postbuild');

    console.log('Build completed successfully!');
    console.log(`Output directory: ${distDir}`);
  } catch (error) {
    console.error('Build failed:', error instanceof Error ? error.message : String(error));
    process.exit(1);
  }
}

build().catch(error => {
  console.error('Build process failed:', error);
  process.exit(1);
});
