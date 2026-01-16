import { computed, effect, EnvironmentProviders, signal } from "../../core";
import { Subject } from "../../rxjs";
import { ActivatedRoute, NavigationExtras, Route, Routes } from "./types";

export interface NavigationEvent {
    url: string;
    previousUrl: string;
}

export interface RouterOutletRef {
    onNavigationChange(event: NavigationEvent): void;
}

export class Router implements EnvironmentProviders {

    public readonly events$ = new Subject<NavigationEvent>();
    public readonly routes = signal<Route[]>([]);
    public readonly activeRoutes = signal<ActivatedRoute[]>([]);
    private rootOutlets: Set<RouterOutletRef> = new Set();
    private currentUrl = signal<string>("/");
    private readonly activatedRoutePaths = computed<string[]>(() => {
        return this.activeRoutes().map(route => this.generateAbsolutePath(route));
    });

    public constructor(
        public config: Routes,
    ) {
        this.currentUrl.set(location.pathname);
        this.setupPopStateListener();
        this.initializeRouteParents(this.config, null);
        this.routes.set(this.config);
    }

    private initializeRouteParents(routes: Route[], parent: Route | null): void {
        for (const route of routes) {
            route.parent = parent;
            if (route.children) {
                this.initializeRouteParents(route.children, route);
            }
        }
    }

    public generateAbsolutePath(route: ActivatedRoute): string {
        const routes: ActivatedRoute[] = [];
        routes.push(route);
        while (route.parent) {
            routes.push(route);
            route = route.parent;
        }

        routes.reverse();
        const paths = routes.map(route => route.path || '').filter(path => path.length > 0);
        return paths.join('/');
    }

    public resetConfig(routes: Route[]) {
        this.config = routes;
        this.initializeRouteParents(routes, null);
        this.routes.set([...routes]);
        this.refresh();
    }

    public refresh(): void {
        this.emitNavigationEvent(this.currentUrl());
    }

    private isRouteMatch(activatedRoute: ActivatedRoute, route: Route): boolean {
        return activatedRoute.routeConfig === route ||
            (activatedRoute.path === route.path &&
             activatedRoute.component === route.component &&
             activatedRoute.loadComponent === route.loadComponent);
    }

    public registerActiveRoute(route: ActivatedRoute): void {
        const current = this.activeRoutes();
        if (!current.includes(route)) {
            this.activeRoutes.set([...current, route]);
        }
    }

    public unregisterActiveRoute(route: ActivatedRoute): void {
        const current = this.activeRoutes();
        this.activeRoutes.set(current.filter(r => r !== route));
    }

    public clearActiveRoutes(): void {
        this.activeRoutes.set([]);
    }

    private withoutLeadingSlash(path: string): string {
        return path.startsWith('/') ? path.slice(1) : path;
    }

    private setupPopStateListener(): void {
        window.addEventListener('popstate', () => {
            this.emitNavigationEvent(location.pathname);
        });
    }

    private emitNavigationEvent(newUrl: string): void {
        const event: NavigationEvent = {
            url: newUrl,
            previousUrl: this.currentUrl(),
        };

        this.currentUrl.set(newUrl);
        this.events$.next(event);
        this.notifyRootOutlets(event);
    }

    private notifyRootOutlets(event: NavigationEvent): void {
        for (const outlet of this.rootOutlets) {
            outlet.onNavigationChange(event);
        }
    }

    public registerRootOutlet(outlet: RouterOutletRef): void {
        this.rootOutlets.add(outlet);
    }

    public unregisterRootOutlet(outlet: RouterOutletRef): void {
        this.rootOutlets.delete(outlet);
    }

    public navigateByUrl(url: string, extras?: NavigationExtras): Promise<boolean> {
        return new Promise<boolean>((resolve) => {
            let finalUrl = url;

            // Jeśli URL nie zaczyna się od /, to jest relatywny
            if (!url.startsWith('/')) {
                if (extras?.relativeTo) {
                    const basePath = extras.relativeTo.snapshot.url.join('/');
                    finalUrl = basePath ? '/' + basePath + '/' + url : '/' + url;
                } else {
                    finalUrl = '/' + url;
                }
            }

            // Normalizuj URL - usuń podwójne slashe i trailing slash (oprócz root)
            finalUrl = finalUrl.replace(/\/+/g, '/');
            if (finalUrl.length > 1 && finalUrl.endsWith('/')) {
                finalUrl = finalUrl.slice(0, -1);
            }

            if (!extras?.skipLocationChange) {
                if (extras?.replaceUrl) {
                    history.replaceState(finalUrl, '', finalUrl);
                } else {
                    history.pushState(finalUrl, '', finalUrl);
                }
            }

            this.emitNavigationEvent(finalUrl);
            resolve(true);
        });
    }

    public navigate(commands: readonly any[], extras?: NavigationExtras): Promise<boolean> {
        const url = this.createUrlFromCommands(commands, extras);
        return this.navigateByUrl(url, extras);
    }

    private createUrlFromCommands(commands: readonly any[], extras?: NavigationExtras): string {
        let path: string;
        if (extras?.relativeTo) {
            const basePath = extras.relativeTo.snapshot.url.join('/') || '';
            path = '/' + basePath + '/' + commands.join('/');
        } else {
            path = '/' + commands.join('/');
        }

        if (extras?.queryParams) {
            const queryString = this.serializeQueryParams(extras.queryParams);
            if (queryString) {
                path += '?' + queryString;
            }
        }

        return path;
    }

    private serializeQueryParams(params: Record<string, any>, prefix: string = ''): string {
        const parts: string[] = [];
        for (const [key, value] of Object.entries(params)) {
            if (value === null || value === undefined) {
                continue;
            }
            const paramKey = prefix ? `${prefix}[${key}]` : key;
            if (typeof value === 'object' && !Array.isArray(value)) {
                parts.push(this.serializeQueryParams(value, paramKey));
            } else {
                parts.push(`${encodeURIComponent(paramKey)}=${encodeURIComponent(String(value))}`);
            }
        }
        return parts.filter(p => p).join('&');
    }
}
