/**
 * Testy routera dla Quarc
 * Sprawdzają czy routing działa poprawnie dla zagnieżdżonych route'ów
 */

type LoadChildrenCallback = () => Promise<Route[]>;

interface Route {
    path?: string;
    data?: object;
    component?: any;
    loadComponent?: () => Promise<any>;
    children?: Route[];
    loadChildren?: LoadChildrenCallback;
    parent?: Route | null;
}

interface Params {
    [key: string]: any;
}

class ActivatedRouteSnapshot {
    constructor(
        public path: string = '',
        public params: Params = {},
        public queryParams: Params = {},
        public fragment: string | null = null,
        public url: string[] = [],
        public routeConfig: Route | null = null,
    ) {}
}

class ActivatedRoute implements Route {
    path?: string;
    data?: object;
    component?: any;
    loadComponent?: () => Promise<any>;
    children?: ActivatedRoute[];
    loadChildren?: LoadChildrenCallback;
    parent?: ActivatedRoute | null = null;
    outlet: string = 'primary';

    private _snapshot: ActivatedRouteSnapshot = new ActivatedRouteSnapshot();

    get snapshot(): ActivatedRouteSnapshot {
        return this._snapshot;
    }

    get routeConfig(): Route | null {
        return this._snapshot.routeConfig ?? null;
    }

    updateSnapshot(
        path: string,
        params: Params,
        queryParams: Params,
        fragment: string | null,
        url: string[],
        routeConfig?: Route,
    ): void {
        this._snapshot = new ActivatedRouteSnapshot(path, params, queryParams, fragment, url, routeConfig ?? null);
    }
}

interface MatchResult {
    route: ActivatedRoute;
    consumedSegments: number;
    hasComponent: boolean;
}

class RouteMatcher {

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

            // Pomiń puste ścieżki w pierwszym przebiegu - szukamy najpierw konkretnych dopasowań
            if (routeSegments.length === 0) {
                continue;
            }

            if (!this.doesRouteMatch(routeSegments, urlSegments, currentSegmentIndex)) {
                continue;
            }

            const result = await this.processRoute(route, routeSegments, urlSegments, currentSegmentIndex, parentRoute, accumulatedParams, accumulatedData);
            if (result) {
                return result;
            }
        }

        // Jeśli nie znaleziono dopasowania z niepustą ścieżką, szukamy route z pustą ścieżką
        for (const route of routes) {
            const routePath = route.path || '';
            const routeSegments = routePath.split('/').filter(segment => segment.length > 0);

            // Tylko puste ścieżki w drugim przebiegu
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
                const result = await this.processRoute(route, routeSegments, urlSegments, currentSegmentIndex, parentRoute, accumulatedParams, accumulatedData);
                if (result) {
                    return result;
                }
                continue;
            }

            // Pusta ścieżka pasuje gdy nie ma więcej segmentów
            if (remainingSegments === 0) {
                const result = await this.processRoute(route, routeSegments, urlSegments, currentSegmentIndex, parentRoute, accumulatedParams, accumulatedData);
                if (result) {
                    return result;
                }
            }
        }

        return null;
    }

    private static async processRoute(
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
        if (routeSegments.length === 0 && startIndex >= urlSegments.length) {
            return true;
        }

        if (startIndex + routeSegments.length > urlSegments.length) {
            return false;
        }

        for (let i = 0; i < routeSegments.length; i++) {
            const routeSegment = routeSegments[i];
            const urlSegment = urlSegments[startIndex + i];

            if (routeSegment.startsWith(':')) {
                continue;
            }

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
                const paramName = routeSegment.substring(1);
                params[paramName] = urlSegment;
            }
        }
    }
}

console.log('=== TESTY ROUTERA QUARC ===\n');

let passedTests = 0;
let failedTests = 0;

async function test(name: string, fn: () => Promise<boolean> | boolean): Promise<void> {
    try {
        const result = await fn();
        if (result) {
            console.log(`✅ ${name}`);
            passedTests++;
        } else {
            console.log(`❌ ${name}`);
            failedTests++;
        }
    } catch (e) {
        console.log(`❌ ${name} - Error: ${e}`);
        failedTests++;
    }
}

class MockComponent {}
class AdminDashboardComponent {}

(async () => {

// Test 1: Prosty route z komponentem
await test('Prosty route z komponentem dla /', async () => {
    const routes: Route[] = [
        { path: '', component: MockComponent },
    ];

    const result = await RouteMatcher.findMatchingRouteAsync(routes, [], 0, null, {}, {});
    return result !== null && result.route.component === MockComponent;
});

// Test 2: Route z path 'admin' i komponentem
await test('Route z path admin i komponentem dla /admin', async () => {
    const routes: Route[] = [
        { path: 'admin', component: MockComponent },
    ];

    const result = await RouteMatcher.findMatchingRouteAsync(routes, ['admin'], 0, null, {}, {});
    return result !== null && result.route.component === MockComponent;
});

// Test 3: Route admin bez komponentu z loadChildren -> children -> component
await test('Route admin > loadChildren > children > component dla /admin', async () => {
    const routes: Route[] = [
        {
            path: 'admin',
            loadChildren: async () => [
                {
                    path: '',
                    children: [
                        { path: '', component: AdminDashboardComponent },
                    ],
                },
            ],
        },
    ];

    const result = await RouteMatcher.findMatchingRouteAsync(routes, ['admin'], 0, null, {}, {});
    return result !== null && result.route.component === AdminDashboardComponent;
});

// Test 4: Route admin bez komponentu z children -> component
await test('Route admin > children > component dla /admin', async () => {
    const routes: Route[] = [
        {
            path: 'admin',
            children: [
                { path: '', component: AdminDashboardComponent },
            ],
        },
    ];

    const result = await RouteMatcher.findMatchingRouteAsync(routes, ['admin'], 0, null, {}, {});
    return result !== null && result.route.component === AdminDashboardComponent;
});

// Test 5: Głęboko zagnieżdżony route bez komponentów po drodze
await test('Głęboko zagnieżdżony route admin > empty > empty > component', async () => {
    const routes: Route[] = [
        {
            path: 'admin',
            children: [
                {
                    path: '',
                    children: [
                        {
                            path: '',
                            children: [
                                { path: '', component: AdminDashboardComponent },
                            ],
                        },
                    ],
                },
            ],
        },
    ];

    const result = await RouteMatcher.findMatchingRouteAsync(routes, ['admin'], 0, null, {}, {});
    return result !== null && result.route.component === AdminDashboardComponent;
});

// Test 6: Scalanie params z parentów
await test('Scalanie params z parentów', async () => {
    const routes: Route[] = [
        {
            path: 'users/:userId',
            children: [
                {
                    path: 'posts/:postId',
                    component: MockComponent,
                },
            ],
        },
    ];

    const result = await RouteMatcher.findMatchingRouteAsync(
        routes,
        ['users', '123', 'posts', '456'],
        0,
        null,
        {},
        {},
    );

    if (!result) return false;
    const params = result.route.snapshot.params;
    return params['userId'] === '123' && params['postId'] === '456';
});

// Test 7: Scalanie data z parentów
await test('Scalanie data z parentów', async () => {
    const routes: Route[] = [
        {
            path: 'admin',
            data: { role: 'admin' },
            children: [
                {
                    path: '',
                    data: { section: 'dashboard' },
                    component: MockComponent,
                },
            ],
        },
    ];

    const result = await RouteMatcher.findMatchingRouteAsync(routes, ['admin'], 0, null, {}, {});
    if (!result) return false;
    const data = result.route.data as { role?: string; section?: string };
    return data.role === 'admin' && data.section === 'dashboard';
});

// Test 8: Parent jest ustawiony poprawnie
await test('Parent jest ustawiony poprawnie', async () => {
    const routes: Route[] = [
        {
            path: 'admin',
            children: [
                { path: '', component: MockComponent },
            ],
        },
    ];

    const result = await RouteMatcher.findMatchingRouteAsync(routes, ['admin'], 0, null, {}, {});
    if (!result) return false;
    return result.route.parent !== null &&
           result.route.parent !== undefined &&
           result.route.parent.path === 'admin';
});

// Test 9: Route z loadChildren async
await test('Route z loadChildren async', async () => {
    const routes: Route[] = [
        {
            path: 'lazy',
            loadChildren: async () => {
                await new Promise(resolve => setTimeout(resolve, 10));
                return [
                    { path: '', component: MockComponent },
                ];
            },
        },
    ];

    const result = await RouteMatcher.findMatchingRouteAsync(routes, ['lazy'], 0, null, {}, {});
    return result !== null && result.route.component === MockComponent;
});

// Test 10: Nie pasuje gdy ścieżka nie istnieje
await test('Nie pasuje gdy ścieżka nie istnieje', async () => {
    const routes: Route[] = [
        { path: 'admin', component: MockComponent },
    ];

    const result = await RouteMatcher.findMatchingRouteAsync(routes, ['unknown'], 0, null, {}, {});
    return result === null;
});

// Test 11: Route z pustą ścieżką na root
await test('Route z pustą ścieżką na root /', async () => {
    const routes: Route[] = [
        { path: '', component: MockComponent },
        { path: 'admin', component: AdminDashboardComponent },
    ];

    const result = await RouteMatcher.findMatchingRouteAsync(routes, [], 0, null, {}, {});
    return result !== null && result.route.component === MockComponent;
});

// Test 12: Wybiera właściwy route gdy jest wiele opcji
await test('Wybiera właściwy route admin gdy jest wiele opcji', async () => {
    const routes: Route[] = [
        { path: '', component: MockComponent },
        { path: 'admin', component: AdminDashboardComponent },
    ];

    const result = await RouteMatcher.findMatchingRouteAsync(routes, ['admin'], 0, null, {}, {});
    return result !== null && result.route.component === AdminDashboardComponent;
});

// Test 13: Przełączanie z / na /admin - różne komponenty
await test('Przełączanie z / na /admin zwraca różne komponenty', async () => {
    const routes: Route[] = [
        { path: '', component: MockComponent },
        {
            path: 'admin',
            loadChildren: async () => [
                { path: '', component: AdminDashboardComponent },
            ],
        },
    ];

    const resultRoot = await RouteMatcher.findMatchingRouteAsync(routes, [], 0, null, {}, {});
    const resultAdmin = await RouteMatcher.findMatchingRouteAsync(routes, ['admin'], 0, null, {}, {});

    if (!resultRoot || !resultAdmin) return false;

    return resultRoot.route.component === MockComponent &&
           resultAdmin.route.component === AdminDashboardComponent &&
           resultRoot.route.component !== resultAdmin.route.component;
});

// Test 14: Przełączanie z /admin na / - różne komponenty
await test('Przełączanie z /admin na / zwraca różne komponenty', async () => {
    const routes: Route[] = [
        { path: '', component: MockComponent },
        {
            path: 'admin',
            loadChildren: async () => [
                { path: '', component: AdminDashboardComponent },
            ],
        },
    ];

    const resultAdmin = await RouteMatcher.findMatchingRouteAsync(routes, ['admin'], 0, null, {}, {});
    const resultRoot = await RouteMatcher.findMatchingRouteAsync(routes, [], 0, null, {}, {});

    if (!resultRoot || !resultAdmin) return false;

    return resultAdmin.route.component === AdminDashboardComponent &&
           resultRoot.route.component === MockComponent;
});

// Test 15: Oba route mają path '' ale różne komponenty - rozróżnienie po parent
await test('Route z path empty ale różnymi parentami mają różne komponenty', async () => {
    const routes: Route[] = [
        { path: '', component: MockComponent },
        {
            path: 'admin',
            children: [
                { path: '', component: AdminDashboardComponent },
            ],
        },
    ];

    const resultRoot = await RouteMatcher.findMatchingRouteAsync(routes, [], 0, null, {}, {});
    const resultAdmin = await RouteMatcher.findMatchingRouteAsync(routes, ['admin'], 0, null, {}, {});

    if (!resultRoot || !resultAdmin) return false;

    // Oba mają path '', ale różne komponenty
    const rootPath = resultRoot.route.path;
    const adminPath = resultAdmin.route.path;

    return resultRoot.route.component === MockComponent &&
           resultAdmin.route.component === AdminDashboardComponent &&
           rootPath === '' &&
           adminPath === '';
});

// Test 16: Symulacja zmiany route - sprawdzenie czy komponent się zmienia
await test('Symulacja nawigacji - komponent zmienia się przy zmianie URL', async () => {
    const routes: Route[] = [
        { path: '', component: MockComponent },
        {
            path: 'admin',
            loadChildren: async () => [
                { path: '', component: AdminDashboardComponent },
            ],
        },
        {
            path: 'users',
            children: [
                { path: '', component: MockComponent },
            ],
        },
    ];

    // Nawigacja: / -> /admin -> /users -> /
    const results = await Promise.all([
        RouteMatcher.findMatchingRouteAsync(routes, [], 0, null, {}, {}),
        RouteMatcher.findMatchingRouteAsync(routes, ['admin'], 0, null, {}, {}),
        RouteMatcher.findMatchingRouteAsync(routes, ['users'], 0, null, {}, {}),
        RouteMatcher.findMatchingRouteAsync(routes, [], 0, null, {}, {}),
    ]);

    if (results.some(r => r === null)) return false;

    const [r1, r2, r3, r4] = results;

    return r1!.route.component === MockComponent &&
           r2!.route.component === AdminDashboardComponent &&
           r3!.route.component === MockComponent &&
           r4!.route.component === MockComponent;
});

console.log('\n=== PODSUMOWANIE ===');
console.log(`✅ Testy zaliczone: ${passedTests}`);
console.log(`❌ Testy niezaliczone: ${failedTests}`);
console.log(`📊 Procent sukcesu: ${((passedTests / (passedTests + failedTests)) * 100).toFixed(1)}%`);

if (failedTests === 0) {
    console.log('\n🎉 Wszystkie testy przeszły pomyślnie!');
    process.exit(0);
} else {
    console.log('\n⚠️  Niektóre testy nie przeszły. Sprawdź implementację.');
    process.exit(1);
}

})();
