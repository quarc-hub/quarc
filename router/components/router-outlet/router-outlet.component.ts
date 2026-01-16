import { Component, IComponent, ComponentType, WebComponent, WebComponentFactory } from "../../../core";
import { Subject } from "../../../rxjs";
import { Router, RouterOutletRef, NavigationEvent } from "../../angular/router";
import { Route, ActivatedRoute } from "../../angular/types";
import { RouteMatcher } from "../../utils/route-matcher";
import "../../../core/global";

@Component({
    selector: 'router-outlet',
    style: "router-outlet{ display: contents; }",
    template: '',
})
export class RouterOutlet implements RouterOutletRef {

    public urlSegments: string[] = [];
    public parentUrlSegments: string[] = [];
    public parentRoutes: Route[] = [];
    public activatedRoute?: ActivatedRoute;
    public parentRouterOutlet?: RouterOutlet;
    public parentRoute?: ActivatedRoute;

    public readonly navigationChange$ = new Subject<NavigationEvent>();
    private childOutlets: Set<RouterOutlet> = new Set();
    private isRootOutlet = false;

    constructor(
        private router: Router,
        public element: HTMLElement,
    ) {
        this.initialize();
    }

    private async initialize() {
        this.element.innerHTML = '';

        const parentRouterOutlet = this.getParentRouterOutlet();
        if (parentRouterOutlet) {
            this.parentRouterOutlet = parentRouterOutlet;
            this.parentUrlSegments = parentRouterOutlet.urlSegments;
            parentRouterOutlet.registerChildOutlet(this);
            if (!parentRouterOutlet.activatedRoute) {
                throw Error('Parent ActivatedRoute not set!');
            }
            // Set parentRoute to be the same as parent's activatedRoute
            this.parentRoute = parentRouterOutlet.activatedRoute;
            this.parentRoutes = await this.loadRoutes(parentRouterOutlet.activatedRoute);
        } else {
            this.isRootOutlet = true;
            this.router.registerRootOutlet(this);
            this.parentUrlSegments = location.pathname.split('/').filter((segment) => segment.length > 0);
            this.parentRoutes = this.router.config;
            // Root outlet has no parent route
            this.parentRoute = undefined;
        }

        const matchedRoutes = await this.getMatchedRoutes();
        await this.updateContent(matchedRoutes);
    }

    public onNavigationChange(event: NavigationEvent): void {
        this.handleNavigationChange(event);
    }

    private async handleNavigationChange(event: NavigationEvent): Promise<void> {
        const urlWithoutQueryAndFragment = event.url.split('?')[0].split('#')[0];
        const newUrlSegments = urlWithoutQueryAndFragment.split('/').filter((segment) => segment.length > 0);
        const queryParams = this.parseQueryParams(event.url);
        const fragment = this.parseFragment(event.url);

        if (this.parentRouterOutlet) {
            this.parentUrlSegments = this.parentRouterOutlet.urlSegments;
            if (this.parentRouterOutlet.activatedRoute) {
                // Update parentRoute to match parent's activatedRoute
                this.parentRoute = this.parentRouterOutlet.activatedRoute;
                this.parentRoutes = await this.loadRoutes(this.parentRouterOutlet.activatedRoute);
            }
        } else {
            this.parentUrlSegments = newUrlSegments;
            this.parentRoutes = this.router.config;
            // Root outlet has no parent route
            this.parentRoute = undefined;
        }

        const matchedRoutes = await this.getMatchedRoutes();
        const newRoute = matchedRoutes[0];
        const newParams = newRoute?.snapshot.params ?? {};

        const componentChanged = this.hasComponentChanged(this.activatedRoute, newRoute);

        if (componentChanged || !this.activatedRoute) {
            await this.updateContent(matchedRoutes);
        } else if (this.activatedRoute && newRoute) {
            // IMPORTANT: Use newRoute's URL segments, not newUrlSegments
            // newUrlSegments contains the full URL, but newRoute.url contains only the consumed segments
            const routeUrlSegments = newRoute.url.getValue();

            this.activatedRoute.updateSnapshot(
                newRoute.path ?? '',
                newParams,
                queryParams,
                fragment || null,
                routeUrlSegments,
                newRoute.routeConfig ?? undefined,
            );

            // IMPORTANT: Always update urlSegments for proper child outlet routing
            this.urlSegments = this.calculateUrlSegments();
        }

        this.navigationChange$.next(event);
        this.notifyChildOutlets(event);
    }

    private hasComponentChanged(current?: ActivatedRoute, next?: ActivatedRoute): boolean {
        if (!current && !next) return false;
        if (!current || !next) return true;

        const currentComponent = current.component ?? current.loadComponent;
        const nextComponent = next.component ?? next.loadComponent;

        if (currentComponent !== nextComponent) return true;

        const currentParentPath = this.getFullParentPath(current);
        const nextParentPath = this.getFullParentPath(next);

        return currentParentPath !== nextParentPath;
    }

    private getFullParentPath(route: ActivatedRoute): string {
        const paths: string[] = [];
        let current: ActivatedRoute | null | undefined = route.parent;
        while (current) {
            if (current.path) {
                paths.unshift(current.path);
            }
            current = current.parent;
        }
        return paths.join('/');
    }

    private parseQueryParams(url: string): Record<string, string> {
        const queryString = url.split('?')[1]?.split('#')[0] ?? '';
        const params: Record<string, string> = {};
        if (!queryString) return params;

        for (const pair of queryString.split('&')) {
            const [key, value] = pair.split('=');
            if (key) {
                params[decodeURIComponent(key)] = decodeURIComponent(value ?? '');
            }
        }
        return params;
    }

    private parseFragment(url: string): string {
        return url.split('#')[1] ?? '';
    }

    private areParamsEqual(
        params1?: Record<string, string>,
        params2?: Record<string, string>,
    ): boolean {
        if (!params1 && !params2) return true;
        if (!params1 || !params2) return false;
        const keys1 = Object.keys(params1);
        const keys2 = Object.keys(params2);
        if (keys1.length !== keys2.length) return false;
        return keys1.every(key => params1[key] === params2[key]);
    }

    private notifyChildOutlets(event: NavigationEvent): void {
        for (const child of this.childOutlets) {
            child.onNavigationChange(event);
        }
    }

    public registerChildOutlet(outlet: RouterOutlet): void {
        this.childOutlets.add(outlet);
    }

    public unregisterChildOutlet(outlet: RouterOutlet): void {
        this.childOutlets.delete(outlet);
    }

    private async updateContent(matchedRoutes: ActivatedRoute[]): Promise<void> {
        this.childOutlets.clear();

        if (this.activatedRoute) {
            this.router.unregisterActiveRoute(this.activatedRoute);
            this.popActivatedRouteFromStack(this.activatedRoute);
            this.activatedRoute = undefined;
        }

        if (matchedRoutes.length > 0) {
            this.activatedRoute = matchedRoutes[0];
            this.urlSegments = this.calculateUrlSegments();
            this.router.registerActiveRoute(this.activatedRoute);
            this.pushActivatedRouteToStack(this.activatedRoute);
        } else {
            this.urlSegments = this.parentUrlSegments;
        }

        await this.renderComponents(matchedRoutes);
    }

    private pushActivatedRouteToStack(route: ActivatedRoute): void {
        window.__quarc.activatedRouteStack ??= [];
        window.__quarc.activatedRouteStack.push(route);
    }

    private popActivatedRouteFromStack(route: ActivatedRoute): void {
        if (!window.__quarc.activatedRouteStack) return;
        const index = window.__quarc.activatedRouteStack.indexOf(route);
        if (index !== -1) {
            window.__quarc.activatedRouteStack.splice(index, 1);
        }
    }

    private calculateUrlSegments(): string[] {
        if (!this.activatedRoute?.path) {
            return this.parentUrlSegments;
        }

        // Use actual URL segments from activated route, not path segments
        const routeUrlSegments = this.activatedRoute.url.getValue();
        const consumedSegments = routeUrlSegments.length;
        const remainingSegments = this.parentUrlSegments.slice(consumedSegments);

        return remainingSegments;
    }

    private async loadRoutes(route: ActivatedRoute): Promise<Route[]> {
        let routes: Route[] = [];

        if (route.children) {
            routes = route.children as Route[];
        } else if (route.loadChildren) {
            routes = await route.loadChildren();
        }

        for (const r of routes) {
            r.parent = route;
        }

        return routes;
    }

    private getParentRouterOutlet(): RouterOutlet | null {
        let parent = this.element.parentElement;
        while (parent) {
            if (parent.tagName.toLowerCase() === 'router-outlet') {
                return (parent as WebComponent).componentInstance as IComponent as RouterOutlet;
            }
            parent = parent.parentElement;
        }
        return null;
    }

    public async getMatchedRoutes(): Promise<ActivatedRoute[]> {
        const result = await RouteMatcher.findMatchingRouteAsync(
            this.parentRoutes,
            this.parentUrlSegments,
            0,
            this.parentRouterOutlet?.activatedRoute ?? null,
            {},
            {},
        );

        if (result) {
            return [result.route];
        }

        return [];
    }

    private async renderComponents(matchedRoutes: ActivatedRoute[]): Promise<void> {
        const tags: string[] = [];

        for (const route of matchedRoutes) {
            const selector = await this.resolveComponentSelector(route);
            if (selector) {
                tags.push(`<${selector}></${selector}>`);
            }
        }

        this.element.innerHTML = tags.join('');
    }

    private async resolveComponentSelector(route: ActivatedRoute): Promise<string | null> {
        if (typeof route.component === 'string') {
            return route.component;
        }

        if (typeof route.component === 'function' && !this.isComponentType(route.component)) {
            const selector = await (route.component as () => Promise<string>)();
            return selector;
        }

        let componentType: ComponentType<IComponent> | undefined;

        if (route.component && this.isComponentType(route.component)) {
            componentType = route.component as ComponentType<IComponent>;
        } else if (route.loadComponent) {
            componentType = await route.loadComponent() as ComponentType<IComponent>;
        }

        if (componentType) {
            WebComponentFactory.registerWithDependencies(componentType);
            return componentType._quarcComponent[0].selector;
        }

        return null;
    }

    private isComponentType(component: unknown): component is ComponentType<IComponent> {
        return typeof component === 'function' && '_quarcComponent' in component;
    }

    public destroy(): void {
        if (this.activatedRoute) {
            this.router.unregisterActiveRoute(this.activatedRoute);
            this.popActivatedRouteFromStack(this.activatedRoute);
        }
        if (this.isRootOutlet) {
            this.router.unregisterRootOutlet(this);
        } else if (this.parentRouterOutlet) {
            this.parentRouterOutlet.unregisterChildOutlet(this);
        }
        this.navigationChange$.complete();
        this.childOutlets.clear();
    }
}