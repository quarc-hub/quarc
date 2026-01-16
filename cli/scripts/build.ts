#!/usr/bin/env node

import { BaseBuilder } from './base-builder';

class Builder extends BaseBuilder {
  async run(): Promise<void> {
    try {
      if (this.isVerbose()) console.log(`Starting build process (environment: ${this.config.environment})...`);

      this.runBuildActions('prebuild');

      if (this.distDir && require('fs').existsSync(this.distDir)) {
        require('fs').rmSync(this.distDir, { recursive: true, force: true });
      }
      this.ensureDirectoryExists(this.distDir);

      if (this.isVerbose()) console.log('Copying public files...');
      this.copyDirectory(this.publicDir, this.distDir);

      await this.compileSCSS();
      await this.bundleTypeScript();

      const indexPath = require('path').join(this.distDir, 'index.html');
      this.injectScriptsAndStyles(indexPath);

      this.generateCompressedFiles();
      this.displayBuildStats();
      this.runBuildActions('postbuild');

      if (!this.isVerbose()) {
        console.log(`\n✅ Build completed | Environment: ${this.config.environment} | Output: ${this.distDir}`);
      } else {
        console.log('Build completed successfully!');
        console.log(`Output directory: ${this.distDir}`);
      }
    } catch (error) {
      console.error('Build failed:', error instanceof Error ? error.message : String(error));
      process.exit(1);
    }
  }
}

const builder = new Builder();
builder.run().catch(error => {
  console.error('Build process failed:', error);
  process.exit(1);
});
