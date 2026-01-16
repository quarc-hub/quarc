#!/usr/bin/env node

import * as fs from 'fs';
import * as path from 'path';
import { spawn, execSync, ChildProcess } from 'child_process';
import * as http from 'http';
import * as https from 'https';
import { WebSocketServer, WebSocket } from 'ws';

const projectRoot = process.cwd();
const srcDir = path.join(projectRoot, 'src');
const distDir = path.join(projectRoot, 'dist');
const configPath = path.join(projectRoot, 'quarc.json');

let isBuilding = false;
let buildQueued = false;
let wsClients: Set<WebSocket> = new Set();
let httpServer: http.Server | null = null;
let wsServer: WebSocketServer | null = null;
let actionProcesses: ChildProcess[] = [];
let mergedWsConnections: WebSocket[] = [];

interface DevServerConfig {
  port: number;
  websocket?: WebSocketConfig;
}

interface WebSocketConfig {
  mergeFrom?: string[];
}


interface StaticLocalPath {
  location: string;
  path: string;
}

interface StaticRemotePath {
  location: string;
  url: string;
}

type StaticPath = StaticLocalPath | StaticRemotePath;

interface ActionsConfig {
  preserve?: string[];
  postserve?: string[];
}

interface ServeConfig {
  actions?: ActionsConfig;
  staticPaths?: StaticPath[];
}

interface EnvironmentConfig {
  treatWarningsAsErrors: boolean;
  minifyNames: boolean;
  generateSourceMaps: boolean;
  devServer?: DevServerConfig;
}

interface QuarcConfig {
  environment: string;
  serve?: ServeConfig;
  environments: {
    [key: string]: EnvironmentConfig;
  };
}

function loadConfig(): QuarcConfig {
  if (!fs.existsSync(configPath)) {
    return {
      environment: 'development',
      environments: {
        development: {
          treatWarningsAsErrors: false,
          minifyNames: false,
          generateSourceMaps: true,
          devServer: {
            port: 4300,
          },
        },
      },
    };
  }

  const content = fs.readFileSync(configPath, 'utf-8');
  return JSON.parse(content) as QuarcConfig;
}

function getDevServerPort(): number {
  const args = process.argv.slice(2);
  const portIndex = args.findIndex(arg => arg === '--port' || arg === '-p');

  if (portIndex !== -1 && args[portIndex + 1]) {
    const port = parseInt(args[portIndex + 1], 10);
    if (!isNaN(port) && port > 0 && port < 65536) {
      return port;
    }
  }

  const config = loadConfig();
  const envConfig = config.environments[config.environment];

  return envConfig?.devServer?.port || 4300;
}

function getMimeType(filePath: string): string {
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

function getWebSocketConfig(): WebSocketConfig | undefined {
  const config = loadConfig();
  const envConfig = config.environments[config.environment];
  return envConfig?.devServer?.websocket;
}

function attachWebSocketServer(server: http.Server): void {
  wsServer = new WebSocketServer({ server, path: '/qu-ws/' });

  wsServer.on('connection', (ws: WebSocket) => {
    wsClients.add(ws);
    console.log('Client connected to live reload WebSocket');

    ws.on('message', (data: Buffer) => {
      try {
        const message = JSON.parse(data.toString());
        handleIncomingMessage(message, ws);
      } catch {
        // ignore invalid messages
      }
    });

    ws.on('close', () => {
      wsClients.delete(ws);
      console.log('Client disconnected from live reload WebSocket');
    });

    ws.send(JSON.stringify({ type: 'connected' }));
  });

  console.log('WebSocket server attached to HTTP server');

  connectToMergedSources();
}

function connectToMergedSources(): void {
  const wsConfig = getWebSocketConfig();
  const mergeFrom = wsConfig?.mergeFrom || [];

  for (const url of mergeFrom) {
    connectToMergedSource(url);
  }
}

function connectToMergedSource(url: string): void {
  console.log(`Connecting to merged WebSocket source: ${url}`);

  const ws = new WebSocket(url);

  ws.on('open', () => {
    console.log(`Connected to merged source: ${url}`);
    mergedWsConnections.push(ws);
  });

  ws.on('message', (data: Buffer) => {
    try {
      const message = JSON.parse(data.toString());
      if (message.type === 'reload') {
        broadcastToClients(message);
      }
    } catch {
      // ignore invalid messages
    }
  });

  ws.on('close', () => {
    console.log(`Disconnected from merged source: ${url}, reconnecting...`);
    mergedWsConnections = mergedWsConnections.filter(c => c !== ws);
    setTimeout(() => connectToMergedSource(url), 2000);
  });

  ws.on('error', (err: Error) => {
    console.warn(`WebSocket error for ${url}:`, err.message);
  });
}

function handleIncomingMessage(message: { type: string; [key: string]: unknown }, sender: WebSocket): void {
  if (message.type === 'reload') {
    broadcastToClients(message, sender);
    broadcastToMergedSources(message);
  }
}

function broadcastToClients(message: { type: string; [key: string]: unknown }, excludeSender?: WebSocket): void {
  const data = JSON.stringify(message);
  for (const client of wsClients) {
    if (client !== excludeSender && client.readyState === WebSocket.OPEN) {
      client.send(data);
    }
  }
}

function broadcastToMergedSources(message: { type: string; [key: string]: unknown }): void {
  const data = JSON.stringify(message);
  for (const ws of mergedWsConnections) {
    if (ws.readyState === WebSocket.OPEN) {
      ws.send(data);
    }
  }
}

function getStaticPaths(): StaticPath[] {
  const config = loadConfig();
  return config.serve?.staticPaths || [];
}

function proxyRequest(targetUrl: string, req: http.IncomingMessage, res: http.ServerResponse): void {
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

function isRemotePath(staticPath: StaticPath): staticPath is StaticRemotePath {
  return 'url' in staticPath;
}

function tryServeStaticPath(reqUrl: string, req: http.IncomingMessage, res: http.ServerResponse): boolean {
  const staticPaths = getStaticPaths();

  for (const staticPath of staticPaths) {
    if (reqUrl.startsWith(staticPath.location)) {
      const relativePath = reqUrl.slice(staticPath.location.length);

      if (isRemotePath(staticPath)) {
        const targetUrl = staticPath.url + relativePath;
        proxyRequest(targetUrl, req, res);
        return true;
      }

      const basePath = path.resolve(projectRoot, staticPath.path);
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

      const mimeType = getMimeType(filePath);
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

function startHttpServer(port: number): void {
  httpServer = http.createServer((req, res) => {
    const reqUrl = req.url || '/';

    if (tryServeStaticPath(reqUrl, req, res)) {
      return;
    }

    let filePath = path.join(distDir, reqUrl === '/' ? 'index.html' : reqUrl);

    if (filePath.includes('..')) {
      res.writeHead(403);
      res.end('Forbidden');
      return;
    }

    if (fs.existsSync(filePath) && fs.statSync(filePath).isDirectory()) {
      filePath = path.join(filePath, 'index.html');
    }

    if (!fs.existsSync(filePath)) {
      const indexPath = path.join(distDir, 'index.html');
      if (fs.existsSync(indexPath)) {
        filePath = indexPath;
      } else {
        res.writeHead(404);
        res.end('Not Found');
        return;
      }
    }

    const mimeType = getMimeType(filePath);
    const content = fs.readFileSync(filePath);

    res.writeHead(200, {
      'Content-Type': mimeType,
      'Cache-Control': 'no-cache',
    });
    res.end(content);
  });

  httpServer.listen(port, () => {
    console.log(`\n** Quarc Live Development Server is listening on localhost:${port} **`);
    console.log(`** Open your browser on http://localhost:${port}/ **\n`);
  });

  attachWebSocketServer(httpServer);
}

function notifyClients(): void {
  const message = { type: 'reload' };

  broadcastToClients(message);
  broadcastToMergedSources(message);

  if (wsClients.size > 0) {
    console.log('📢 Notified clients to reload');
  }
}

async function runBuild(): Promise<void> {
  if (isBuilding) {
    buildQueued = true;
    return;
  }

  isBuilding = true;
  buildQueued = false;

  console.log('\n🔨 Building application...');
  const startTime = Date.now();

  try {
    const buildScript = path.join(__dirname, 'build.ts');
    const tsNodePath = path.join(projectRoot, 'node_modules', '.bin', 'ts-node');

    execSync(`${tsNodePath} ${buildScript}`, {
      stdio: 'inherit',
      cwd: projectRoot,
    });

    const duration = ((Date.now() - startTime) / 1000).toFixed(2);
    console.log(`✅ Build completed in ${duration}s`);

    notifyClients();
  } catch (error) {
    console.error('❌ Build failed');
  } finally {
    isBuilding = false;

    if (buildQueued) {
      console.log('⏳ Running queued build...');
      setTimeout(() => runBuild(), 100);
    }
  }
}

function watchFiles(): void {
  console.log(`👀 Watching for changes in ${srcDir}...`);

  const debounceDelay = 300;
  let debounceTimer: NodeJS.Timeout | null = null;

  const watcher = fs.watch(srcDir, { recursive: true }, (eventType, filename) => {
    if (!filename) return;

    const ext = path.extname(filename);
    if (!['.ts', '.scss', '.sass', '.css', '.html'].includes(ext)) {
      return;
    }

    console.log(`📝 File changed: ${filename}`);

    if (debounceTimer) {
      clearTimeout(debounceTimer);
    }

    debounceTimer = setTimeout(() => {
      runBuild();
    }, debounceDelay);
  });

  const cleanup = () => {
    console.log('\n👋 Stopping watch mode...');
    watcher.close();
    for (const client of wsClients) {
      client.close();
    }
    wsClients.clear();
    for (const ws of mergedWsConnections) {
      ws.close();
    }
    mergedWsConnections = [];
    if (wsServer) {
      wsServer.close();
    }
    if (httpServer) {
      httpServer.close();
    }
    terminateActionProcesses();
    runPostServeActions();
    process.exit(0);
  };

  process.on('SIGINT', cleanup);
  process.on('SIGTERM', cleanup);
}

function injectLiveReloadScript(): void {
  const indexPath = path.join(distDir, 'index.html');
  const wsPort = getDevServerPort();

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
    console.log('✅ Injected live reload script into index.html');
  }
}

function runPreServeActions(): void {
  const config = loadConfig();
  const actions = config.serve?.actions?.preserve || [];

  if (actions.length === 0) return;

  console.log('🔧 Running preserve actions...');

  for (const action of actions) {
    console.log(`   ▶ ${action}`);
    const child = spawn(action, [], {
      shell: true,
      cwd: projectRoot,
      stdio: 'inherit',
      detached: true,
    });

    actionProcesses.push(child);

    child.on('error', (err) => {
      console.error(`   ❌ Action failed: ${action}`, err.message);
    });
  }
}

function runPostServeActions(): void {
  const config = loadConfig();
  const actions = config.serve?.actions?.postserve || [];

  if (actions.length === 0) return;

  console.log('🔧 Running postserve actions...');

  for (const action of actions) {
    console.log(`   ▶ ${action}`);
    try {
      execSync(action, {
        cwd: projectRoot,
        stdio: 'inherit',
      });
    } catch (err) {
      console.error(`   ❌ Action failed: ${action}`);
    }
  }
}

function terminateActionProcesses(): void {
  if (actionProcesses.length === 0) return;

  console.log('🛑 Terminating action processes...');

  for (const child of actionProcesses) {
    if (child.pid && !child.killed) {
      try {
        process.kill(-child.pid, 'SIGTERM');
        console.log(`   ✓ Terminated process group ${child.pid}`);
      } catch (err) {
        try {
          child.kill('SIGTERM');
          console.log(`   ✓ Terminated process ${child.pid}`);
        } catch {
          console.warn(`   ⚠ Could not terminate process ${child.pid}`);
        }
      }
    }
  }

  actionProcesses = [];
}

async function serve(): Promise<void> {
  const port = getDevServerPort();

  console.log('🚀 Starting development server...\n');

  runPreServeActions();

  console.log('📦 Running initial build...');
  await runBuild();

  injectLiveReloadScript();

  startHttpServer(port);

  console.log('✨ Development server is ready!');
  console.log('📂 Serving files from:', distDir);
  console.log('🔄 Live reload WebSocket enabled on port', port);
  console.log('\nPress Ctrl+C to stop\n');

  watchFiles();
}

serve().catch(error => {
  console.error('Serve process failed:', error);
  process.exit(1);
});
