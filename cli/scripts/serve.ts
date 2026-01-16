#!/usr/bin/env node

import * as fs from 'fs';
import * as path from 'path';
import { spawn, execSync, ChildProcess } from 'child_process';
import * as http from 'http';
import * as https from 'https';
import { WebSocketServer, WebSocket } from 'ws';
import { BaseBuilder } from './base-builder';
import {
  StaticPath,
  StaticRemotePath,
} from '../types';

class Server extends BaseBuilder {
  private isBuilding = false;
  private buildQueued = false;
  private wsClients: Set<WebSocket> = new Set();
  private httpServer: http.Server | null = null;
  private wsServer: WebSocketServer | null = null;
  private actionProcesses: ChildProcess[] = [];
  private mergedWsConnections: WebSocket[] = [];

  private getDevServerPort(): number {
    const args = process.argv.slice(2);
    const portIndex = args.findIndex(arg => arg === '--port' || arg === '-p');

    if (portIndex !== -1 && args[portIndex + 1]) {
      const port = parseInt(args[portIndex + 1], 10);
      if (!isNaN(port) && port > 0 && port < 65536) {
        return port;
      }
    }

    const envConfig = this.config.environments[this.config.environment];
    return envConfig?.devServer?.port || 4200;
  }

  private getMimeType(filePath: string): string {
    const ext = path.extname(filePath).toLowerCase();
    const mimeTypes: { [key: string]: string } = {
      '.html': 'text/html',
      '.js': 'text/javascript',
      '.css': 'text/css',
      '.json': 'application/json',
      '.png': 'image/png',
      '.jpg': 'image/jpeg',
      '.jpeg': 'image/jpeg',
      '.gif': 'image/gif',
      '.svg': 'image/svg+xml',
      '.ico': 'image/x-icon',
      '.woff': 'font/woff',
      '.woff2': 'font/woff2',
      '.ttf': 'font/ttf',
      '.eot': 'application/vnd.ms-fontobject',
    };
    return mimeTypes[ext] || 'application/octet-stream';
  }

  private getWebSocketConfig() {
    const envConfig = this.config.environments[this.config.environment];
    return envConfig?.devServer?.websocket;
  }

  private attachWebSocketServer(server: http.Server): void {
    this.wsServer = new WebSocketServer({ server, path: '/qu-ws/' });

    this.wsServer.on('connection', (ws: WebSocket) => {
      this.wsClients.add(ws);
      if (this.isVerbose()) console.log('Client connected to live reload WebSocket');

      ws.on('message', (data: Buffer) => {
        try {
          const message = JSON.parse(data.toString());
          this.handleIncomingMessage(message, ws);
        } catch {
        }
      });

      ws.on('close', () => {
        this.wsClients.delete(ws);
        if (this.isVerbose()) console.log('Client disconnected from live reload WebSocket');
      });

      ws.send(JSON.stringify({ type: 'connected' }));
    });

    if (this.isVerbose()) console.log('WebSocket server attached to HTTP server');

    this.connectToMergedSources();
  }

  private connectToMergedSources(): void {
    const wsConfig = this.getWebSocketConfig();
    const mergeFrom = wsConfig?.mergeFrom || [];

    for (const url of mergeFrom) {
      this.connectToMergedSource(url);
    }
  }

  private connectToMergedSource(url: string): void {
    if (this.isVerbose()) console.log(`Connecting to merged WebSocket source: ${url}`);

    const ws = new WebSocket(url);

    ws.on('open', () => {
      if (this.isVerbose()) console.log(`Connected to merged source: ${url}`);
      this.mergedWsConnections.push(ws);
    });

    ws.on('message', (data: Buffer) => {
      try {
        const message = JSON.parse(data.toString());
        if (message.type === 'reload') {
          this.broadcastToClients(message);
        }
      } catch {
      }
    });

    ws.on('close', () => {
      if (this.isVerbose()) console.log(`Disconnected from merged source: ${url}, reconnecting...`);
      this.mergedWsConnections = this.mergedWsConnections.filter(c => c !== ws);
      setTimeout(() => this.connectToMergedSource(url), 2000);
    });

    ws.on('error', (err: Error) => {
      console.warn(`WebSocket error for ${url}:`, err.message);
    });
  }

  private handleIncomingMessage(message: { type: string; [key: string]: unknown }, sender: WebSocket): void {
    if (message.type === 'reload') {
      this.broadcastToClients(message, sender);
      this.broadcastToMergedSources(message);
    }
  }

  private broadcastToClients(message: { type: string; [key: string]: unknown }, excludeSender?: WebSocket): void {
    const data = JSON.stringify(message);
    for (const client of this.wsClients) {
      if (client !== excludeSender && client.readyState === WebSocket.OPEN) {
        client.send(data);
      }
    }
  }

  private broadcastToMergedSources(message: { type: string; [key: string]: unknown }): void {
    const data = JSON.stringify(message);
    for (const ws of this.mergedWsConnections) {
      if (ws.readyState === WebSocket.OPEN) {
        ws.send(data);
      }
    }
  }

  private getStaticPaths(): StaticPath[] {
    return this.config.serve?.staticPaths || [];
  }

  private proxyRequest(targetUrl: string, req: http.IncomingMessage, res: http.ServerResponse): void {
    const parsedUrl = new URL(targetUrl);
    const protocol = parsedUrl.protocol === 'https:' ? https : http;

    const proxyReq = protocol.request(
      targetUrl,
      {
        method: req.method,
        headers: {
          ...req.headers,
          host: parsedUrl.host,
        },
      },
      (proxyRes) => {
        res.writeHead(proxyRes.statusCode || 500, proxyRes.headers);
        proxyRes.pipe(res);
      },
    );

    proxyReq.on('error', (err) => {
      console.error('Proxy error:', err.message);
      res.writeHead(502);
      res.end('Bad Gateway');
    });

    req.pipe(proxyReq);
  }

  private isRemotePath(staticPath: StaticPath): staticPath is StaticRemotePath {
    return 'url' in staticPath;
  }

  private tryServeStaticPath(reqUrl: string, req: http.IncomingMessage, res: http.ServerResponse): boolean {
    const staticPaths = this.getStaticPaths();

    for (const staticPath of staticPaths) {
      if (reqUrl.startsWith(staticPath.location)) {
        const relativePath = reqUrl.slice(staticPath.location.length);

        if (this.isRemotePath(staticPath)) {
          const targetUrl = staticPath.url + relativePath;
          this.proxyRequest(targetUrl, req, res);
          return true;
        }

        const basePath = path.resolve(this.projectRoot, staticPath.path);
        let filePath = path.join(basePath, relativePath || 'index.html');

        const normalizedFilePath = path.normalize(filePath);
        if (!normalizedFilePath.startsWith(basePath)) {
          res.writeHead(403);
          res.end('Forbidden');
          return true;
        }

        if (fs.existsSync(filePath) && fs.statSync(filePath).isDirectory()) {
          filePath = path.join(filePath, 'index.html');
        }

        if (!fs.existsSync(filePath)) {
          res.writeHead(404);
          res.end('Not Found');
          return true;
        }

        const mimeType = this.getMimeType(filePath);
        const content = fs.readFileSync(filePath);

        res.writeHead(200, {
          'Content-Type': mimeType,
          'Cache-Control': 'no-cache',
        });
        res.end(content);
        return true;
      }
    }

    return false;
  }

  private startHttpServer(port: number): void {
    this.httpServer = http.createServer((req, res) => {
      const reqUrl = req.url || '/';

      if (this.tryServeStaticPath(reqUrl, req, res)) {
        return;
      }

      let filePath = path.join(this.distDir, reqUrl === '/' ? 'index.html' : reqUrl);

      if (filePath.includes('..')) {
        res.writeHead(403);
        res.end('Forbidden');
        return;
      }

      if (fs.existsSync(filePath) && fs.statSync(filePath).isDirectory()) {
        filePath = path.join(filePath, 'index.html');
      }

      if (!fs.existsSync(filePath)) {
        const indexPath = path.join(this.distDir, 'index.html');
        if (fs.existsSync(indexPath)) {
          filePath = indexPath;
        } else {
          res.writeHead(404);
          res.end('Not Found');
          return;
        }
      }

      const mimeType = this.getMimeType(filePath);
      const content = fs.readFileSync(filePath);

      res.writeHead(200, {
        'Content-Type': mimeType,
        'Cache-Control': 'no-cache',
      });
      res.end(content);
    });

    this.httpServer.listen(port, () => {
      if (!this.isVerbose()) {
        console.log(`\n🌐 Server: http://localhost:${port}`);
      } else {
        console.log(`\n** Quarc Live Development Server is listening on localhost:${port} **`);
        console.log(`** Open your browser on http://localhost:${port}/ **\n`);
      }
    });

    this.attachWebSocketServer(this.httpServer);
  }

  private notifyClients(): void {
    const message = { type: 'reload' };

    this.broadcastToClients(message);
    this.broadcastToMergedSources(message);

    if (this.wsClients.size > 0 && this.isVerbose()) {
      console.log('📢 Notified clients to reload');
    }
  }

  private async runBuild(): Promise<void> {
    if (this.isBuilding) {
      this.buildQueued = true;
      return;
    }

    this.isBuilding = true;
    this.buildQueued = false;

    if (this.isVerbose()) console.log('\n🔨 Building application...');
    const startTime = Date.now();

    try {
      const buildScript = path.join(__dirname, 'build.ts');
      const tsNodePath = path.join(this.projectRoot, 'node_modules', '.bin', 'ts-node');

      const configArg = ` -c ${this.config.environment}`;
      const verboseArg = this.isVerbose() ? ' -v' : '';

      execSync(`${tsNodePath} ${buildScript}${configArg}${verboseArg}`, {
        stdio: 'inherit',
        cwd: this.projectRoot,
      });

      const duration = ((Date.now() - startTime) / 1000).toFixed(2);
      if (this.isVerbose()) console.log(`✅ Build completed in ${duration}s`);

      this.notifyClients();
    } catch (error) {
      console.error('❌ Build failed');
    } finally {
      this.isBuilding = false;

      if (this.buildQueued) {
        console.log('⏳ Running queued build...');
        setTimeout(() => this.runBuild(), 100);
      }
    }
  }

  private watchFiles(): void {
    if (this.isVerbose()) console.log(`👀 Watching for changes in ${this.srcDir}...`);

    const debounceDelay = 300;
    let debounceTimer: NodeJS.Timeout | null = null;

    const watcher = fs.watch(this.srcDir, { recursive: true }, (eventType, filename) => {
      if (!filename) return;

      const ext = path.extname(filename);
      if (!['.ts', '.scss', '.sass', '.css', '.html'].includes(ext)) {
        return;
      }

      if (this.isVerbose()) console.log(`📝 File changed: ${filename}`);

      if (debounceTimer) {
        clearTimeout(debounceTimer);
      }

      debounceTimer = setTimeout(() => {
        this.runBuild();
      }, debounceDelay);
    });

    const cleanup = () => {
      console.log('\n👋 Stopping watch mode...');
      watcher.close();
      for (const client of this.wsClients) {
        client.close();
      }
      this.wsClients.clear();
      for (const ws of this.mergedWsConnections) {
        ws.close();
      }
      this.mergedWsConnections = [];
      if (this.wsServer) {
        this.wsServer.close();
      }
      if (this.httpServer) {
        this.httpServer.close();
      }
      this.terminateActionProcesses();
      this.runPostServeActions();
      process.exit(0);
    };

    process.on('SIGINT', cleanup);
    process.on('SIGTERM', cleanup);
  }

  private injectLiveReloadScript(): void {
    const indexPath = path.join(this.distDir, 'index.html');
    const wsPort = this.getDevServerPort();

    if (!fs.existsSync(indexPath)) {
      console.warn('index.html not found in dist directory');
      return;
    }

    let html = fs.readFileSync(indexPath, 'utf-8');

    const liveReloadScript = `
  <script>
    (function() {
      let ws;
      let reconnectAttempts = 0;
      const maxReconnectDelay = 5000;

      function connect() {
        ws = new WebSocket('ws://localhost:${wsPort}/qu-ws/');

        ws.onopen = () => {
          console.log('[Live Reload] Connected');
          reconnectAttempts = 0;
        };

        ws.onmessage = (event) => {
          try {
            const message = JSON.parse(event.data);
            if (message.type === 'reload') {
              console.log('[Live Reload] Reloading page...');
              window.location.reload();
            }
          } catch {}
        };

        ws.onclose = () => {
          console.warn('[Live Reload] Connection lost, attempting to reconnect...');
          reconnectAttempts++;
          const delay = Math.min(1000 * reconnectAttempts, maxReconnectDelay);
          setTimeout(connect, delay);
        };

        ws.onerror = () => {
          ws.close();
        };
      }

      connect();
    })();
  </script>
`;

    if (!html.includes('Live Reload')) {
      html = html.replace('</body>', `${liveReloadScript}</body>`);
      fs.writeFileSync(indexPath, html, 'utf-8');
      if (this.isVerbose()) console.log('✅ Injected live reload script into index.html');
    }
  }

  private runPreServeActions(): void {
    const actions = this.config.serve?.actions?.preserve || [];

    if (actions.length === 0) return;

    if (this.isVerbose()) console.log('🔧 Running preserve actions...');

    for (const action of actions) {
      if (this.isVerbose()) console.log(`   ▶ ${action}`);
      const child = spawn(action, [], {
        shell: true,
        cwd: this.projectRoot,
        stdio: 'inherit',
        detached: true,
      });

      this.actionProcesses.push(child);

      child.on('error', (err) => {
        console.error(`   ❌ Action failed: ${action}`, err.message);
      });
    }
  }

  private runPostServeActions(): void {
    const actions = this.config.serve?.actions?.postserve || [];

    if (actions.length === 0) return;

    if (this.isVerbose()) console.log('🔧 Running postserve actions...');

    for (const action of actions) {
      if (this.isVerbose()) console.log(`   ▶ ${action}`);
      try {
        execSync(action, {
          cwd: this.projectRoot,
          stdio: 'inherit',
        });
      } catch (err) {
        console.error(`   ❌ Action failed: ${action}`);
      }
    }
  }

  private terminateActionProcesses(): void {
    if (this.actionProcesses.length === 0) return;

    if (this.isVerbose()) console.log('🛑 Terminating action processes...');

    for (const child of this.actionProcesses) {
      if (child.pid && !child.killed) {
        try {
          process.kill(-child.pid, 'SIGTERM');
          if (this.isVerbose()) console.log(`   ✓ Terminated process group ${child.pid}`);
        } catch (err) {
          try {
            child.kill('SIGTERM');
            if (this.isVerbose()) console.log(`   ✓ Terminated process ${child.pid}`);
          } catch {
            console.warn(`   ⚠ Could not terminate process ${child.pid}`);
          }
        }
      }
    }

    this.actionProcesses = [];
  }

  async run(): Promise<void> {
    const port = this.getDevServerPort();

    if (this.isVerbose()) {
      console.log('🚀 Starting development server...\n');
      console.log(`Environment: ${this.config.environment}`);
    }

    this.runPreServeActions();

    if (this.isVerbose()) console.log('📦 Running initial build...');
    await this.runBuild();

    this.injectLiveReloadScript();

    this.startHttpServer(port);

    if (this.isVerbose()) {
      console.log('✨ Development server is ready!');
      console.log('📂 Serving files from:', this.distDir);
      console.log('🔄 Live reload WebSocket enabled on port', port);
      console.log('\nPress Ctrl+C to stop\n');
    }

    this.watchFiles();
  }
}

const server = new Server();
server.run().catch(error => {
  console.error('Serve process failed:', error);
  process.exit(1);
});
