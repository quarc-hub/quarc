import { Route, ActivatedRoute, Params } from "../angular/types";

export interface MatchResult {
    route: ActivatedRoute;
    consumedSegments: number;
    hasComponent: boolean;
}

export class RouteMatcher {

    static matchRoutesRecursive(
        routes: Route[],
        urlSegments: string[],
        currentSegmentIndex: number,
        matchedRoutes: ActivatedRoute[],
    ): void {
        const result = this.findMatchingRoute(routes, urlSegments, currentSegmentIndex, null, {}, {});
        if (result) {
            matchedRoutes.push(result.route);
        }
    }

    static async findMatchingRouteAsync(
        routes: Route[],
        urlSegments: string[],
        currentSegmentIndex: number,
        parentRoute: ActivatedRoute | null,
        accumulatedParams: Params,
        accumulatedData: object,
    ): Promise<MatchResult | null> {
        const remainingSegments = urlSegments.length - currentSegmentIndex;

        // Najpierw szukamy route z niepustą ścieżką, która pasuje
        for (const route of routes) {
            const routePath = route.path || '';
            const routeSegments = routePath.split('/').filter(segment => segment.length > 0);

            if (routeSegments.length === 0) {
                continue;
            }

            if (!this.doesRouteMatch(routeSegments, urlSegments, currentSegmentIndex)) {
                continue;
            }

            const result = await this.processRouteAsync(route, routeSegments, urlSegments, currentSegmentIndex, parentRoute, accumulatedParams, accumulatedData);
            if (result) {
                return result;
            }
        }

        // Jeśli nie znaleziono dopasowania z niepustą ścieżką, szukamy route z pustą ścieżką
        for (const route of routes) {
            const routePath = route.path || '';
            const routeSegments = routePath.split('/').filter(segment => segment.length > 0);

            if (routeSegments.length !== 0) {
                continue;
            }

            const hasComponent = !!(route.component || route.loadComponent);
            const hasChildren = !!(route.children || route.loadChildren);

            // Pusta ścieżka z komponentem pasuje tylko gdy nie ma więcej segmentów
            if (hasComponent && remainingSegments > 0) {
                continue;
            }

            // Pusta ścieżka bez komponentu ale z children - pass-through
            if (!hasComponent && hasChildren && remainingSegments > 0) {
                const result = await this.processRouteAsync(route, routeSegments, urlSegments, currentSegmentIndex, parentRoute, accumulatedParams, accumulatedData);
                if (result) {
                    return result;
                }
                continue;
            }

            // Pusta ścieżka pasuje gdy nie ma więcej segmentów
            if (remainingSegments === 0) {
                const result = await this.processRouteAsync(route, routeSegments, urlSegments, currentSegmentIndex, parentRoute, accumulatedParams, accumulatedData);
                if (result) {
                    return result;
                }
            }
        }

        return null;
    }

    private static async processRouteAsync(
        route: Route,
        routeSegments: string[],
        urlSegments: string[],
        currentSegmentIndex: number,
        parentRoute: ActivatedRoute | null,
        accumulatedParams: Params,
        accumulatedData: object,
    ): Promise<MatchResult | null> {
        const params: Params = { ...accumulatedParams };
        this.extractParams(routeSegments, urlSegments, currentSegmentIndex, params);

        const data = { ...accumulatedData, ...route.data };
        const nextSegmentIndex = currentSegmentIndex + routeSegments.length;
        const hasComponent = !!(route.component || route.loadComponent);

        if (hasComponent) {
            const activatedRoute = this.createActivatedRoute(
                route,
                params,
                data,
                urlSegments,
                currentSegmentIndex,
                routeSegments.length,
                parentRoute,
            );
            return { route: activatedRoute, consumedSegments: nextSegmentIndex, hasComponent: true };
        }

        let children: Route[] = [];
        if (route.children) {
            children = route.children;
        } else if (route.loadChildren) {
            children = await route.loadChildren();
        }

        if (children.length > 0) {
            const intermediateRoute = this.createActivatedRoute(
                route,
                params,
                data,
                urlSegments,
                currentSegmentIndex,
                routeSegments.length,
                parentRoute,
            );

            const childResult = await this.findMatchingRouteAsync(
                children,
                urlSegments,
                nextSegmentIndex,
                intermediateRoute,
                params,
                data,
            );

            if (childResult) {
                return childResult;
            }
        }

        return null;
    }

    private static findMatchingRoute(
        routes: Route[],
        urlSegments: string[],
        currentSegmentIndex: number,
        parentRoute: ActivatedRoute | null,
        accumulatedParams: Params,
        accumulatedData: object,
    ): MatchResult | null {
        const remainingSegments = urlSegments.length - currentSegmentIndex;

        // Najpierw szukamy route z niepustą ścieżką
        for (const route of routes) {
            const routePath = route.path || '';
            const routeSegments = routePath.split('/').filter(segment => segment.length > 0);

            if (routeSegments.length === 0) {
                continue;
            }

            if (!this.doesRouteMatch(routeSegments, urlSegments, currentSegmentIndex)) {
                continue;
            }

            const result = this.processRoute(route, routeSegments, urlSegments, currentSegmentIndex, parentRoute, accumulatedParams, accumulatedData);
            if (result) {
                return result;
            }
        }

        // Szukamy route z pustą ścieżką
        for (const route of routes) {
            const routePath = route.path || '';
            const routeSegments = routePath.split('/').filter(segment => segment.length > 0);

            if (routeSegments.length !== 0) {
                continue;
            }

            const hasComponent = !!(route.component || route.loadComponent);
            const hasChildren = !!(route.children);

            if (hasComponent && remainingSegments > 0) {
                continue;
            }

            if (!hasComponent && hasChildren && remainingSegments > 0) {
                const result = this.processRoute(route, routeSegments, urlSegments, currentSegmentIndex, parentRoute, accumulatedParams, accumulatedData);
                if (result) {
                    return result;
                }
                continue;
            }

            if (remainingSegments === 0) {
                const result = this.processRoute(route, routeSegments, urlSegments, currentSegmentIndex, parentRoute, accumulatedParams, accumulatedData);
                if (result) {
                    return result;
                }
            }
        }

        return null;
    }

    private static processRoute(
        route: Route,
        routeSegments: string[],
        urlSegments: string[],
        currentSegmentIndex: number,
        parentRoute: ActivatedRoute | null,
        accumulatedParams: Params,
        accumulatedData: object,
    ): MatchResult | null {
        const params: Params = { ...accumulatedParams };
        this.extractParams(routeSegments, urlSegments, currentSegmentIndex, params);

        const data = { ...accumulatedData, ...route.data };
        const nextSegmentIndex = currentSegmentIndex + routeSegments.length;
        const hasComponent = !!(route.component || route.loadComponent);

        if (hasComponent) {
            const activatedRoute = this.createActivatedRoute(
                route,
                params,
                data,
                urlSegments,
                currentSegmentIndex,
                routeSegments.length,
                parentRoute,
            );
            return { route: activatedRoute, consumedSegments: nextSegmentIndex, hasComponent: true };
        }

        if (route.children && route.children.length > 0) {
            const intermediateRoute = this.createActivatedRoute(
                route,
                params,
                data,
                urlSegments,
                currentSegmentIndex,
                routeSegments.length,
                parentRoute,
            );

            const childResult = this.findMatchingRoute(
                route.children,
                urlSegments,
                nextSegmentIndex,
                intermediateRoute,
                params,
                data,
            );

            if (childResult) {
                return childResult;
            }
        }

        return null;
    }

    private static createActivatedRoute(
        route: Route,
        params: Params,
        data: object,
        urlSegments: string[],
        startIndex: number,
        segmentCount: number,
        parentRoute: ActivatedRoute | null,
    ): ActivatedRoute {
        const activatedRoute = new ActivatedRoute();
        activatedRoute.path = route.path;
        activatedRoute.component = route.component;
        activatedRoute.loadComponent = route.loadComponent;
        activatedRoute.loadChildren = route.loadChildren;
        activatedRoute.data = data;
        activatedRoute.parent = parentRoute;

        if (route.children) {
            activatedRoute.children = route.children as ActivatedRoute[];
        }

        activatedRoute.updateSnapshot(
            route.path ?? '',
            params,
            {},
            null,
            urlSegments.slice(startIndex, startIndex + segmentCount),
            route,
        );

        route.parent = parentRoute ?? undefined;

        return activatedRoute;
    }

    private static doesRouteMatch(routeSegments: string[], urlSegments: string[], startIndex: number): boolean {
        // Jeśli nie ma już segmentów w URL, a route ma pustą ścieżkę, pasuje
        if (routeSegments.length === 0 && startIndex >= urlSegments.length) {
            return true;
        }

        // Jeśli nie ma wystarczającej liczby segmentów w URL, nie pasuje
        if (startIndex + routeSegments.length > urlSegments.length) {
            return false;
        }

        // Porównaj każdy segment
        for (let i = 0; i < routeSegments.length; i++) {
            const routeSegment = routeSegments[i];
            const urlSegment = urlSegments[startIndex + i];

            // Jeśli segment route zaczyna się od ':', to jest parametr i pasuje do wszystkiego
            if (routeSegment.startsWith(':')) {
                continue;
            }

            // Segmenty muszą być identyczne
            if (routeSegment !== urlSegment) {
                return false;
            }
        }

        return true;
    }

    private static extractParams(routeSegments: string[], urlSegments: string[], startIndex: number, params: Record<string, string>): void {
        for (let i = 0; i < routeSegments.length; i++) {
            const routeSegment = routeSegments[i];
            const urlSegment = urlSegments[startIndex + i];

            if (routeSegment.startsWith(':')) {
                // Wyodrębnij nazwę parametru
                const paramName = routeSegment.substring(1);
                params[paramName] = urlSegment;
            }
        }
    }
}
