import * as fs from 'fs';
import * as path from 'path';
import * as zlib from 'zlib';
import { execSync } from 'child_process';
import * as esbuild from 'esbuild';
import { minify } from 'terser';
import Table from 'cli-table3';
import * as sass from 'sass';
import { quarcTransformer } from '../quarc-transformer';
import { consoleTransformer } from '../build/transformers/console-transformer';
import {
  QuarcConfig,
  EnvironmentConfig,
  ValidationResult,
  BuildConfig,
} from '../types';

export abstract class BaseBuilder {
  protected projectRoot: string;
  protected srcDir: string;
  protected publicDir: string;
  protected distDir: string;
  protected configPath: string;
  protected config: QuarcConfig;
  protected envConfig: EnvironmentConfig;

  constructor() {
    this.projectRoot = process.cwd();
    this.srcDir = path.join(this.projectRoot, 'src');
    this.publicDir = path.join(this.srcDir, 'public');
    this.distDir = path.join(this.projectRoot, 'dist');
    this.configPath = path.join(this.projectRoot, 'quarc.json');
    this.config = this.loadConfig();
    this.envConfig = this.getEnvironmentConfig();
  }

  protected isVerbose(): boolean {
    const args = process.argv.slice(2);
    return args.includes('-v') || args.includes('--verbose');
  }

  protected getCliConfiguration(): string | undefined {
    const args = process.argv.slice(2);
    const configIndex = args.findIndex(arg => arg === '--configuration' || arg === '-c');
    if (configIndex !== -1 && args[configIndex + 1]) {
      return args[configIndex + 1];
    }
    const envIndex = args.findIndex(arg => arg === '--environment' || arg === '-e');
    if (envIndex !== -1 && args[envIndex + 1]) {
      return args[envIndex + 1];
    }
    return undefined;
  }

  protected loadConfig(): QuarcConfig {
    const cliConfig = this.getCliConfiguration();

    if (!fs.existsSync(this.configPath)) {
      return {
        environment: cliConfig ?? 'development',
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

    const content = fs.readFileSync(this.configPath, 'utf-8');
    const config = JSON.parse(content) as QuarcConfig;

    if (cliConfig) {
      config.environment = cliConfig;
    }

    return config;
  }

  protected getEnvironmentConfig(): EnvironmentConfig {
    const envConfig = this.config.environments[this.config.environment];
    if (!envConfig) {
      console.warn(`Environment '${this.config.environment}' not found in config, using defaults`);
      return {
        treatWarningsAsErrors: false,
        minifyNames: false,
        generateSourceMaps: true,
      };
    }
    return envConfig;
  }

  protected ensureDirectoryExists(dir: string): void {
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
  }

  protected copyDirectory(src: string, dest: string): void {
    if (!fs.existsSync(src)) {
      console.warn(`Source directory not found: ${src}`);
      return;
    }

    this.ensureDirectoryExists(dest);

    const files = fs.readdirSync(src);
    files.forEach(file => {
      const srcPath = path.join(src, file);
      const destPath = path.join(dest, file);
      const stat = fs.statSync(srcPath);

      if (stat.isDirectory()) {
        this.copyDirectory(srcPath, destPath);
      } else {
        fs.copyFileSync(srcPath, destPath);
      }
    });
  }

  protected async bundleTypeScript(): Promise<void> {
    try {
      if (this.isVerbose()) console.log('Bundling TypeScript with esbuild...');
      const mainTsPath = path.join(this.srcDir, 'main.ts');

      const dropList: ('console' | 'debugger')[] = this.envConfig.removeConsole
        ? ['console', 'debugger']
        : (this.config.environment === 'production' ? ['console', 'debugger'] : ['debugger']);

      const pureList = this.envConfig.removeConsole
        ? ['console.log', 'console.error', 'console.warn', 'console.info', 'console.debug', 'console.trace']
        : (this.config.environment === 'production' ? ['console.log', 'console.error', 'console.warn', 'console.info', 'console.debug'] : []);

      await esbuild.build({
        entryPoints: [mainTsPath],
        bundle: true,
        minify: false,
        sourcemap: this.envConfig.generateSourceMaps,
        outdir: this.distDir,
        format: 'esm',
        target: 'ES2020',
        splitting: true,
        chunkNames: 'chunks/[name]-[hash]',
        external: [],
        plugins: [quarcTransformer(undefined, this.config), consoleTransformer(this.envConfig)],
        tsconfig: path.join(this.projectRoot, 'tsconfig.json'),
        treeShaking: this.envConfig.aggressiveTreeShaking ?? true,
        ignoreAnnotations: this.envConfig.aggressiveTreeShaking ?? false,
        logLevel: this.isVerbose() ? 'info' : 'silent',
        define: {
          'process.env.NODE_ENV': this.config.environment === 'production' ? '"production"' : '"development"',
        },
        drop: dropList,
        pure: pureList,
        globalName: undefined,
        legalComments: this.envConfig.removeComments ? 'none' : 'inline',
      });

      if (this.isVerbose()) console.log('TypeScript bundling completed.');
      await this.bundleExternalEntryPoints();
      await this.obfuscateAndMinifyBundles();
    } catch (error) {
      console.error('TypeScript bundling failed:', error instanceof Error ? error.message : String(error));
      process.exit(1);
    }
  }

  protected async bundleExternalEntryPoints(): Promise<void> {
    const externalEntryPoints = this.config.build?.externalEntryPoints || [];

    if (externalEntryPoints.length === 0) {
      return;
    }

    if (this.isVerbose()) console.log('Bundling external entry points...');
    const externalDistDir = path.join(this.distDir, 'external');
    this.ensureDirectoryExists(externalDistDir);

    for (const entryPoint of externalEntryPoints) {
      const entryPath = path.join(this.projectRoot, entryPoint);

      if (!fs.existsSync(entryPath)) {
        console.warn(`External entry point not found: ${entryPath}`);
        continue;
      }

      const basename = path.basename(entryPoint, '.ts');

      await esbuild.build({
        entryPoints: [entryPath],
        bundle: true,
        minify: false,
        sourcemap: this.envConfig.generateSourceMaps,
        outfile: path.join(externalDistDir, `${basename}.js`),
        format: 'esm',
        target: 'ES2020',
        splitting: false,
        external: [],
        plugins: [quarcTransformer(undefined, this.config), consoleTransformer(this.envConfig)],
        tsconfig: path.join(this.projectRoot, 'tsconfig.json'),
        treeShaking: true,
        logLevel: this.isVerbose() ? 'info' : 'silent',
        define: {
          'process.env.NODE_ENV': this.config.environment === 'production' ? '"production"' : '"development"',
        },
        drop: this.config.environment === 'production' ? ['console', 'debugger'] : ['debugger'],
        pure: this.config.environment === 'production' ? ['console.log', 'console.error', 'console.warn', 'console.info', 'console.debug'] : [],
      });

      if (this.isVerbose()) console.log(`✓ Bundled external: ${basename}.js`);
    }
  }

  protected async obfuscateAndMinifyBundles(): Promise<void> {
    try {
      if (this.isVerbose()) console.log('Applying advanced obfuscation and minification...');

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

      const jsFiles = collectJsFiles(this.distDir);

      for (const { file, filePath } of jsFiles) {
        const code = fs.readFileSync(filePath, 'utf-8');

        const result = await minify(code, {
          compress: {
            passes: 3,
            unsafe: true,
            unsafe_methods: true,
            unsafe_proto: true,
            drop_console: this.config.environment === 'production',
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
          mangle: this.envConfig.minifyNames ? {
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
          if (this.isVerbose()) console.log(`✓ ${file}: ${originalSize} → ${newSize} bytes (${reduction}% reduction)`);
        }
      }

      if (this.isVerbose()) console.log('Obfuscation and minification completed.');
    } catch (error) {
      console.error('Obfuscation failed:', error instanceof Error ? error.message : String(error));
      process.exit(1);
    }
  }

  protected async compileStyleFile(stylePath: string, outputDir: string): Promise<void> {
    const fullPath = path.join(this.projectRoot, stylePath);

    if (!fs.existsSync(fullPath)) {
      console.warn(`Style file not found: ${fullPath}`);
      return;
    }

    const ext = path.extname(fullPath);
    const basename = path.basename(fullPath, ext);
    const outputPath = path.join(outputDir, `${basename}.css`);

    this.ensureDirectoryExists(outputDir);

    if (ext === '.scss' || ext === '.sass') {
      try {
        const result = sass.compile(fullPath, {
          style: 'compressed',
          sourceMap: false,
        });
        fs.writeFileSync(outputPath, result.css, 'utf-8');
        if (this.isVerbose()) console.log(`✓ Compiled ${stylePath} → ${basename}.css`);
      } catch (error) {
        console.error(`Failed to compile ${stylePath}:`, error instanceof Error ? error.message : String(error));
        throw error;
      }
    } else if (ext === '.css') {
      fs.copyFileSync(fullPath, outputPath);
      if (this.isVerbose()) console.log(`✓ Copied ${stylePath} → ${basename}.css`);
    }
  }

  protected async compileSCSS(): Promise<void> {
    const styles = this.config.build?.styles || [];
    const externalStyles = this.config.build?.externalStyles || [];

    if (styles.length === 0 && externalStyles.length === 0) {
      return;
    }

    if (this.isVerbose()) console.log('Compiling SCSS files...');

    for (const stylePath of styles) {
      await this.compileStyleFile(stylePath, this.distDir);
    }

    const externalDistDir = path.join(this.distDir, 'external');
    for (const stylePath of externalStyles) {
      await this.compileStyleFile(stylePath, externalDistDir);
    }
  }

  protected injectScriptsAndStyles(indexPath: string): void {
    if (!fs.existsSync(indexPath)) {
      console.warn(`Index file not found: ${indexPath}`);
      return;
    }

    let html = fs.readFileSync(indexPath, 'utf-8');

    const styles = this.config.build?.styles || [];
    const scripts = this.config.build?.scripts || [];

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
    if (this.isVerbose()) console.log('Injected scripts and styles into index.html');
  }

  protected formatBytes(bytes: number): string {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  }

  protected getGzipSize(content: Buffer | string): number {
    const buffer = typeof content === 'string' ? Buffer.from(content) : content;
    return zlib.gzipSync(buffer, { level: 9 }).length;
  }

  protected parseSizeString(sizeStr: string): number {
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

  protected validateSizeWithThresholds(name: string, actual: number, warningLimit: number, errorLimit: number): ValidationResult {
    if (actual > errorLimit) {
      return {
        status: 'error',
        message: `${name}: ${this.formatBytes(actual)} exceeds error limit of ${this.formatBytes(errorLimit)}`,
        actual,
        limit: warningLimit,
      };
    }

    if (actual > warningLimit) {
      return {
        status: 'warning',
        message: `${name}: ${this.formatBytes(actual)} exceeds warning limit of ${this.formatBytes(warningLimit)}`,
        actual,
        limit: warningLimit,
      };
    }

    return {
      status: 'success',
      message: `${name}: ${this.formatBytes(actual)} is within limits`,
      actual,
      limit: warningLimit,
    };
  }

  protected displayBuildStats(): void {
    const files: { name: string; size: number; gzipSize: number; path: string }[] = [];
    let totalSize = 0;
    let totalGzipSize = 0;
    let mainSize = 0;
    let mapSize = 0;
    let externalSize = 0;

    const showGzip = this.envConfig.compressed ?? false;

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
          const gzipSize = this.getGzipSize(content);

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

    walkDir(this.distDir);
    files.sort((a, b) => b.size - a.size);

    const validationResults: { [key: string]: ValidationResult } = {};

    const buildConfig = this.config.build as BuildConfig;
    const totalWarning = this.parseSizeString(buildConfig.limits.total.warning);
    const totalError = this.parseSizeString(buildConfig.limits.total.error);
    const mainWarning = this.parseSizeString(buildConfig.limits.main.warning);
    const mainError = this.parseSizeString(buildConfig.limits.main.error);
    const mapWarning = this.parseSizeString(buildConfig.limits.sourceMaps.warning);
    const mapError = this.parseSizeString(buildConfig.limits.sourceMaps.error);

    validationResults.total = this.validateSizeWithThresholds('Total Size', totalSize, totalWarning, totalError);
    validationResults.main = this.validateSizeWithThresholds('Main Bundle', mainSize, mainWarning, mainError);
    validationResults.sourceMaps = this.validateSizeWithThresholds('Source Maps', mapSize, mapWarning, mapError);

    console.log(`\n📊 Size breakdown:`);
    console.log(`   App total: ${this.formatBytes(totalSize)}`);
    console.log(`   External:  ${this.formatBytes(externalSize)}`);
    console.log(`   Maps:      ${this.formatBytes(mapSize)}`);

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
      const sizeStr = this.formatBytes(file.size);
      const gzipStr = this.formatBytes(file.gzipSize);
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
        '\x1b[1m' + this.formatBytes(totalSize) + '\x1b[0m',
        '\x1b[1m' + this.formatBytes(totalGzipSize) + '\x1b[0m',
        '\x1b[1m✓\x1b[0m',
      ]);
    } else {
      table.push(['\x1b[1mTOTAL\x1b[0m', '\x1b[1m' + this.formatBytes(totalSize) + '\x1b[0m', '\x1b[1m✓\x1b[0m']);
    }

    console.log('\n' + table.toString());

    const hasErrors = Object.values(validationResults).some(r => r.status === 'error');
    const hasWarnings = Object.values(validationResults).some(r => r.status === 'warning');
    const treatWarningsAsErrors = this.envConfig.treatWarningsAsErrors;

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

  protected generateCompressedFiles(): void {
    if (!this.envConfig.compressed) {
      return;
    }

    if (this.isVerbose()) console.log('Generating compressed files...');

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

    walkAndCompress(this.distDir);
    if (this.isVerbose()) console.log('✓ Compressed files generated (.gz)');
  }

  protected runBuildActions(phase: 'prebuild' | 'postbuild'): void {
    const actions = this.config.build?.actions?.[phase] || [];

    if (actions.length === 0) return;

    if (this.isVerbose()) console.log(`🔧 Running ${phase} actions...`);

    for (const action of actions) {
      if (this.isVerbose()) console.log(`   ▶ ${action}`);
      try {
        execSync(action, {
          cwd: this.projectRoot,
          stdio: 'inherit',
        });
      } catch (err) {
        console.error(`   ❌ Action failed: ${action}`);
        throw err;
      }
    }
  }

  abstract run(): Promise<void>;
}
