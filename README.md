# Quarc Framework

**Lightweight Angular-inspired framework for embedded devices with limited memory**

Quarc is a modern frontend framework designed specifically for devices with constrained resources such as ESP32, Arduino, routers, and other embedded systems. Built with Angular's familiar syntax and patterns, it enables developers to create efficient, feature-rich web applications without the overhead of traditional frameworks.

## 🎯 Key Features

- **Angular-Inspired Syntax** - Familiar decorators, components, routing, and dependency injection
- **Minimal Bundle Size** - Optimized for devices with limited memory (5-25KB typical)
- **Native Web Components** - Uses browser's native Custom Elements API
- **Reactive Signals** - Built-in signal-based reactivity system
- **Advanced Build System** - Compile-time transformations minimize runtime overhead
- **Lazy Loading** - Load components on-demand to reduce initial bundle size
- **Router with Code Splitting** - Full-featured routing with lazy-loaded routes
- **Plugin Architecture** - Build and deploy plugins as separate bundles
- **External Scripts Support** - Load optional enhancements from remote servers
- **Dependency Injection** - Familiar DI system for services and components

## 🚀 Why Quarc?

If you've worked with Angular, you already know Quarc. The framework uses the same patterns and syntax, so there's **zero learning curve** for Angular developers. However, unlike Angular, Quarc is built from the ground up for resource-constrained environments:

- **Compile-time Processing** - Templates, styles, and decorators are processed during build, not runtime
- **Tree-shaking Friendly** - Only bundle what you actually use
- **No Virtual DOM** - Direct DOM manipulation for better performance and smaller size
- **Minimal Runtime** - Core framework is just a few kilobytes

## 📦 Installation

```bash
npm install @quarc/core @quarc/cli @quarc/router @quarc/platform-browser
```

## 🏗️ Project Structure

```
my-app/
├── src/
│   ├── app/
│   │   ├── app.component.ts
│   │   ├── app.component.html
│   │   ├── app.component.scss
│   │   └── routes.ts
│   ├── main.ts
│   └── main.scss
├── quarc.json
├── package.json
└── tsconfig.json
```

## 🎨 Quick Start

### 1. Create a Component

```typescript
import { Component, signal } from '@quarc/core';

@Component({
    selector: 'app-counter',
    templateUrl: './counter.component.html',
    styleUrl: './counter.component.scss',
})
export class CounterComponent {
    public count = signal(0);

    public increment(): void {
        this.count.update(c => c + 1);
    }
}
```

**counter.component.html:**
```html
<div class="counter">
    <h2>Count: {{ count() }}</h2>
    <button (click)="increment()">Increment</button>
</div>
```

### 2. Bootstrap Your Application

```typescript
import { bootstrapApplication } from '@quarc/platform-browser';
import { AppComponent } from './app/app.component';
import { provideRouter } from '@quarc/router';
import { routes } from './app/routes';

bootstrapApplication(AppComponent, {
    providers: [
        provideRouter(routes)
    ]
});
```

### 3. Configure Build

**quarc.json:**
```json
{
    "environment": "development",
    "build": {
        "minifyNames": false,
        "styles": ["src/main.scss"],
        "limits": {
            "total": {
                "warning": "50 KB",
                "error": "200 KB"
            },
            "main": {
                "warning": "20 KB",
                "error": "60 KB"
            }
        }
    },
    "serve": {
        "proxy": {
            "/api/*": {
                "target": "http://localhost:3000",
                "changeOrigin": true
            }
        }
    },
    "environments": {
        "development": {
            "minifyNames": true,
            "generateSourceMaps": false,
            "compressed": true,
            "devServer": {
                "port": 4200
            }
        },
        "production": {
            "treatWarningsAsErrors": true,
            "minifyNames": true,
            "generateSourceMaps": false,
            "compressed": true
        }
    }
}
```

### 4. Build and Serve

```bash
# Development server with hot reload
qu serve

# Production build
qu build --env production
```

## 📚 Core Concepts

### Components

Components are the building blocks of Quarc applications. They use the same `@Component` decorator as Angular:

```typescript
import { Component, OnInit, OnDestroy } from '@quarc/core';

@Component({
    selector: 'my-component',
    templateUrl: './my-component.html',
    styleUrl: './my-component.scss',
    imports: [ChildComponent], // Automatic dependency registration
})
export class MyComponent implements OnInit, OnDestroy {
    ngOnInit() {
        console.log('Component initialized');
    }

    ngOnDestroy() {
        console.log('Component destroyed');
    }
}
```

### Signals (Reactive State)

Quarc includes a built-in signals system for reactive state management:

```typescript
import { signal, computed, effect } from '@quarc/core';

export class DataComponent {
    // Writable signal
    public count = signal(0);
    public name = signal('John');

    // Computed signal (derived state)
    public displayName = computed(() => `${this.name()} (${this.count()})`);

    constructor() {
        // Effect runs when dependencies change
        effect(() => {
            console.log('Count changed:', this.count());
        });
    }

    public updateCount(): void {
        this.count.update(c => c + 1);
    }
}
```

### Template Syntax

Quarc supports Angular's template syntax including:

```html
<!-- Property binding -->
<img [src]="imageUrl" [alt]="description">

<!-- Event binding -->
<button (click)="handleClick($event)">Click me</button>

<!-- Two-way binding -->
<input [(value)]="username">

<!-- Control flow (@if, @for) -->
@if (isLoggedIn) {
    <p>Welcome back!</p>
} @else {
    <p>Please log in</p>
}

@for (item of items(); track item.id) {
    <div>{{ item.name }}</div>
}
```

### Routing

Full-featured routing with lazy loading support:

```typescript
import { Route } from '@quarc/router';

export const routes: Route[] = [
    {
        path: '',
        component: HomeComponent,
    },
    {
        path: 'about',
        loadComponent: () => import('./about/about.component')
            .then(m => m.AboutComponent),
    },
    {
        path: 'user/:id',
        component: UserComponent,
    },
];
```

**Using Router in Components:**

```typescript
import { Router, ActivatedRoute } from '@quarc/router';

export class MyComponent {
    constructor(
        private router: Router,
        private route: ActivatedRoute
    ) {
        // Get route params
        this.route.params.subscribe(params => {
            console.log('User ID:', params['id']);
        });
    }

    public navigate(): void {
        this.router.navigate(['/about']);
    }
}
```

### Dependency Injection

Familiar DI system for services:

```typescript
import { Injectable } from '@quarc/core';

@Injectable()
export class DataService {
    public getData(): Promise<any> {
        return fetch('/api/data').then(r => r.json());
    }
}

@Component({
    selector: 'app-root',
    template: '<div>{{ data }}</div>',
    providers: [DataService], // Provide at component level
})
export class AppComponent {
    public data: any;

    constructor(private dataService: DataService) {
        this.dataService.getData().then(d => this.data = d);
    }
}
```

**Note:** Services are injected via constructor parameters. The framework uses compile-time metadata generation for dependency resolution.

### Directives

Directives are supported with `@Directive` decorator:

```typescript
import { Directive } from '@quarc/core';

@Directive({
    selector: '[appHighlight]',
    host: {
        '(mouseenter)': 'onMouseEnter()',
        '(mouseleave)': 'onMouseLeave()'
    }
})
export class HighlightDirective {
    constructor(private element: HTMLElement) {}

    public onMouseEnter(): void {
        this.element.style.backgroundColor = 'yellow';
    }

    public onMouseLeave(): void {
        this.element.style.backgroundColor = '';
    }
}
```

**Note:** `@HostBinding` and `@HostListener` decorators exist for TypeScript compatibility but are processed at compile-time. Use the `host` property in directive options for runtime behavior.

## 🔧 Advanced Features

### Development Server Proxy

The development server supports proxying HTTP requests to a backend server. This is useful when your frontend needs to communicate with an API during development.

**Configuration in quarc.json:**

```json
{
    "serve": {
        "proxy": {
            "/api/*": {
                "target": "http://192.168.1.100:8080",
                "changeOrigin": true
            },
            "/auth/*": {
                "target": "https://auth.example.com",
                "changeOrigin": true,
                "pathRewrite": {
                    "^/auth": "/api/v1/auth"
                }
            }
        }
    }
}
```

**Proxy Options:**

- **Pattern matching**: Use wildcards (`*`) to match request paths
  - `/api/*` matches `/api/users`, `/api/data`, etc.
  - `/v1/*/data` matches `/v1/users/data`, `/v1/products/data`, etc.

- **target**: Backend server URL (required)
  - Can be HTTP or HTTPS
  - Include protocol and host, optionally port

- **changeOrigin**: Set to `true` to change the `Host` header to match the target (recommended for most cases)

- **pathRewrite**: Object with regex patterns to rewrite request paths
  - Key: regex pattern to match
  - Value: replacement string

**Example Use Cases:**

```json
{
    "serve": {
        "proxy": {
            "/api/*": {
                "target": "http://localhost:3000",
                "changeOrigin": true
            }
        }
    }
}
```

When your app makes a request to `http://localhost:4200/api/users`, it will be proxied to `http://localhost:3000/api/users`.

**Perfect for ESP32 Development:**

When developing for ESP32, you can proxy API requests to the device:

```json
{
    "serve": {
        "proxy": {
            "/api/*": {
                "target": "http://192.168.1.50",
                "changeOrigin": true
            }
        }
    }
}
```

This allows you to develop your frontend locally while testing against the actual ESP32 backend.

### Lazy Loading

Components are automatically lazy-loaded when using route-based code splitting:

```typescript
// Only loaded when route is activated
{
    path: 'dashboard',
    loadComponent: () => import('./dashboard/dashboard.component')
        .then(m => m.DashboardComponent),
}
```

### Automatic Dependency Registration

When you import components, they're automatically registered as Web Components:

```typescript
@Component({
    selector: 'parent',
    template: '<child></child>',
    imports: [ChildComponent], // Automatically registered
})
export class ParentComponent {}
```

See [DEPENDENCY_REGISTRATION.md](./DEPENDENCY_REGISTRATION.md) for details.

### View Encapsulation

Quarc supports three encapsulation modes for component styles:

```typescript
import { ViewEncapsulation } from '@quarc/core';

// Shadow DOM - True encapsulation using native Shadow DOM
@Component({
    selector: 'shadow-component',
    template: '<div>Shadow DOM Content</div>',
    style: 'div { color: red; }',
    encapsulation: ViewEncapsulation.ShadowDom,
})
export class ShadowComponent {}

// Emulated - Angular-style scoped attributes (default)
@Component({
    selector: 'emulated-component',
    template: '<div>Emulated Content</div>',
    style: 'div { color: blue; }',
    encapsulation: ViewEncapsulation.Emulated, // Default
})
export class EmulatedComponent {}

// None - Global styles (no encapsulation)
@Component({
    selector: 'global-component',
    template: '<div>Global Content</div>',
    style: 'div { color: green; }',
    encapsulation: ViewEncapsulation.None,
})
export class GlobalComponent {}
```

### External Entry Points

Build additional bundles for optional features:

```json
// quarc.json
{
    "build": {
        "externalEntryPoints": [
            "src/providers/icon-provider.ts",
            "src/providers/theme-provider.ts"
        ]
    }
}
```

These are built to `dist/external/` and can be hosted separately from the main application.

### Plugin Architecture

Quarc supports a plugin system where each plugin is built as a separate bundle:

```typescript
// Plugin main.ts
import { bootstrapPlugin } from '@quarc/platform-browser';
import { AppComponent } from './app/app.component';
import { provideRouter } from '@quarc/router';
import { routes } from './app/routes';

export const appConfig = {
    providers: [provideRouter(routes, { pluginId: "cameras" })],
    styleUrl: new URL("./main.css", import.meta.url).href,
};

bootstrapPlugin("cameras", AppComponent, appConfig);
```

**Plugin Routing:**

Plugins can be lazy-loaded via routing:

```typescript
// Main app routes
export const routes: Route[] = [
    {
        path: 'cameras',
        component: () => import('/plugins/cameras/main.js').then(() => 'cameras-root')
    }
];
```

Plugins are built separately and can be hosted on different servers, perfect for ESP32 where the main app is on the device and plugins are on a remote server.

### External Scripts (Optional Enhancements)

Load optional scripts that enhance functionality without being required:

```typescript
import { bootstrapApplication } from '@quarc/platform-browser';
import { AppComponent } from './app/app.component';

bootstrapApplication(AppComponent, {
    providers: [],
    externalUrls: [
        'https://cdn.example.com/icon-providers.js',
        'https://backup-cdn.example.com/icon-providers.js'
    ]
});
```

**Benefits:**
- App works without external scripts (graceful degradation)
- External scripts can provide icon providers, themes, or other enhancements
- Multiple URLs for fallback support
- Perfect for ESP32: core app on device, enhancements on remote server

**Example Use Case - Icon Providers:**

Quarc includes a simple built-in icon provider that uses HTML entities:

```typescript
// global.ts - Define icon provider interface and signal
import { signal, WritableSignal } from "@quarc/core";

export interface IconProviderDefinition {
    name: string;
    prefix: string;
    priority: number;
    render(value: string, element: HTMLElement): void;
}

declare global {
    interface Window {
        __iconProviders?: IconProviderDefinition[];
        __externalResourceLoaded: WritableSignal<boolean>;
    }
}

window.__externalResourceLoaded ??= signal<boolean>(false);
```

```typescript
// Built-in HTML entity provider (always available, lowest priority)
export const HtmlIconProvider: IconProviderDefinition = {
    name: 'HTML Entity',
    prefix: "#",
    priority: 0,
    render(value: string, element: HTMLElement) {
        element.innerHTML = `&${value};`;
        (element as any).unrender = () => {
            element.innerHTML = '';
        };
    }
};
```

External scripts can register additional providers:

```typescript
// external.ts - Built as separate bundle via externalEntryPoints
import { IconProviderDefinition } from "./global";

export const RemixIconProvider: IconProviderDefinition = {
    name: "remixicon",
    prefix: "ri",
    priority: 1,
    render(value: string, element: HTMLElement) {
        element.classList.add(`ri-${value}`);
        (element as any).unrender = () => {
            element.classList.remove(`ri-${value}`);
        };
    }
};

export function initExternal(): void {
    console.log("[External] Module loaded successfully");

    window.__iconProviders ??= [];
    window.__iconProviders.push(RemixIconProvider);
    window.__externalResourceLoaded?.set(true);

    // Load Remixicon CSS from CDN
    const remixiconStyles = document.createElement('link');
    remixiconStyles.rel = 'stylesheet';
    remixiconStyles.href = 'https://cdn.jsdelivr.net/npm/remixicon@4.7.0/fonts/remixicon.min.css';
    document.body.appendChild(remixiconStyles);
}

initExternal();
```

Icon component implementation:

```typescript
import { Component, effect, input } from "@quarc/core";
import { HtmlIconProvider } from "./types";

window.__iconProviders ??= [HtmlIconProvider];

@Component({
    selector: "app-icon",
    template: "",
})
export class IconComponent {
    public icon = input<string | string[]>();

    public constructor(private elementHtml: HTMLElement) {
        effect(() => {
            window.__externalResourceLoaded();
            const icon = this.icon() ?? '';
            const icons = Array.isArray(icon) ? icon : icon.split(",");
            const providers = window.__iconProviders ?? [];

            const iconData = icons.map(icon => {
                const data = icon.split(":");
                const [providerPrefix, iconName] = data.length === 2 ? data : ['#', data[0]];
                return {
                    providerPrefix,
                    iconName,
                    provider: providers.find(p => p.prefix === providerPrefix) ?? HtmlIconProvider,
                };
            });

            if ((this.elementHtml as any).unrender) {
                (this.elementHtml as any).unrender();
            }

            if (iconData.length > 0) {
                iconData.sort((a, b) => b.provider.priority - a.provider.priority);
                iconData[0].provider.render(iconData[0].iconName, this.elementHtml);
            }
        });
    }
}

// Template examples:
// <app-icon [icon]="'ri:home-line'"></app-icon>           // Uses RemixIconProvider if loaded
// <app-icon [icon]="'ri:home-line,laquo'"></app-icon>    // Fallback: tries ri:home-line, then #:laquo
// <app-icon [icon]="'laquo'"></app-icon>                 // Uses HtmlIconProvider (#:laquo)
```

Configuration in `quarc.json`:

```json
{
    "build": {
        "externalEntryPoints": [
            "src/external.ts"
        ]
    }
}
```

Bootstrap with external URL:

```typescript
import { bootstrapApplication } from "@quarc/platform-browser";
import { AppComponent } from "./app/app.component";

export const appConfig = {
    providers: [],
    externalUrls: "/external/external.js",
};

bootstrapApplication(AppComponent, appConfig);
```

**How it works:**
- Built-in `HtmlIconProvider` (priority 0) is always available
- External script adds `RemixIconProvider` (priority 1) when loaded
- Icon component accepts comma-separated fallbacks: `"ri:home-line,laquo"`
- Higher priority provider wins when multiple match
- `window.__externalResourceLoaded` signal triggers re-render when external loads
- Application works with HTML entities even if external script fails to load

## 🏗️ Build System

Quarc's CLI includes powerful build optimizations:

### Template Processing
- Converts Angular control flow (`@if`, `@for`) to runtime directives
- Inlines templates and styles at compile time
- Processes attribute bindings (`[prop]`, `(event)`, `[(model)]`)

### Code Transformations
- Automatic dependency injection metadata generation
- Signal transformation for optimal performance
- Tree-shaking unused code
- Minification and compression

### Bundle Size Monitoring

The build system tracks bundle sizes and warns when limits are exceeded:

```bash
Build Summary:
┌─────────────┬──────────┬─────────┬────────┐
│ File        │ Size     │ Limit   │ Status │
├─────────────┼──────────┼─────────┼────────┤
│ main.js     │ 18.5 KB  │ 20 KB   │ ✓      │
│ main.css    │ 2.3 KB   │ -       │ ✓      │
│ Total       │ 45.2 KB  │ 50 KB   │ ✓      │
└─────────────┴──────────┴─────────┴────────┘
```

## 📖 Documentation

- [Dependency Registration](./DEPENDENCY_REGISTRATION.md) - Automatic component registration
- [Native Web Components](./NATIVE_WEB_COMPONENTS.md) - Custom Elements implementation
- [Lazy Loading](./core/LAZY_LOADING.md) - Component lazy loading architecture
- [CLI Architecture](./cli/ARCHITECTURE.md) - Build system internals

## 🎯 Target Devices

Quarc is optimized for embedded devices with limited resources:

- **ESP32** - 520 KB SRAM, 4 MB Flash
- **Arduino** - Various models with limited memory
- **Routers** - OpenWrt and similar embedded Linux systems
- **IoT Devices** - Smart home controllers, sensors, displays
- **Industrial Controllers** - HMI panels, PLCs with web interfaces

## 🛠️ CLI Commands

```bash
# Start development server
qu serve

# Build for production
qu build --env production

# Build with custom environment
qu build --env staging

# Watch mode
qu build --watch
```

## 📊 Performance

Quarc applications are significantly smaller than equivalent Angular applications:

| Framework | Bundle Size | Initial Load |
|-----------|-------------|--------------|
| Angular   | ~300-500 KB | ~1-2s        |
| Quarc     | ~5-25 KB    | ~100-300ms   |

*Sizes are for typical applications with routing and several components*

The minimal bundle size makes Quarc perfect for devices with limited flash memory like ESP32 (4MB), Arduino, and embedded routers.

## 🤝 Contributing

Quarc is designed to be extensible. You can add custom:
- Processors (build-time transformations)
- Attribute helpers (template syntax extensions)
- Directives and pipes
- Services and utilities

## 📝 License

See [LICENSE](./LICENSE) file for details.

## 🌟 Why "Quarc"?

The name **Quarc** is inspired by the **quark** - the elementary particle in physics, representing something fundamental and minimal. The spelling "Quarc" (instead of "Quark") creates a connection to **Angular** through the "arc" suffix, symbolizing the framework's Angular-inspired design.

Just like quarks are the smallest building blocks of matter, Quarc provides the minimal building blocks needed for web applications on resource-constrained devices.

**Elementary. Angular-inspired. Minimal by design.**

---

**Built for embedded devices. Inspired by Angular. Optimized for performance.**
