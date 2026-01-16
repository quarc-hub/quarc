import type { IComponent, Type } from "../../core";
import { BehaviorSubject } from "../../rxjs";

export type LoadChildrenCallback = () => Promise<Route[]>;

export type ComponentLoader = () => Promise<string>;

export interface Route {
    path?: string;
    data?: object;
    component?: Type<any> | string | ComponentLoader;
    loadComponent?: () => Promise<Type<IComponent>>;
    children?: Routes;
    loadChildren?: LoadChildrenCallback;
    parent?: Route | null;
}

export type Routes = Route[];

export interface Params {
    [key: string]: any;
}

export class ActivatedRouteSnapshot {
    constructor(
        public path: string = '',
        public params: Params = {},
        public queryParams: Params = {},
        public fragment: string | null = null,
        public url: string[] = [],
        public routeConfig: Route | null = null,
    ) {}
}

export class ActivatedRoute implements Route {
    public __quarc_original_name__? = 'ActivatedRoute';
    path?: string;
    data?: object;
    component?: Type<any> | string | ComponentLoader;
    loadComponent?: () => Promise<Type<IComponent>>;
    children?: ActivatedRoute[];
    loadChildren?: LoadChildrenCallback;
    parent?: ActivatedRoute | null = null;
    outlet: string = 'primary';

    private readonly _params = new BehaviorSubject<Params>({});
    private readonly _queryParams = new BehaviorSubject<Params>({});
    private readonly _fragment = new BehaviorSubject<string | null>(null);
    private readonly _url = new BehaviorSubject<string[]>([]);

    private _snapshot: ActivatedRouteSnapshot = new ActivatedRouteSnapshot();

    get params(): BehaviorSubject<Params> {
        return this._params;
    }

    get queryParams(): BehaviorSubject<Params> {
        return this._queryParams;
    }

    get fragment(): BehaviorSubject<string | null> {
        return this._fragment;
    }

    get url(): BehaviorSubject<string[]> {
        return this._url;
    }

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
        const paramsChanged = !this.areParamsEqual(this._snapshot.params, params);
        const queryParamsChanged = !this.areParamsEqual(this._snapshot.queryParams, queryParams);
        const fragmentChanged = this._snapshot.fragment !== fragment;
        const urlChanged = this._snapshot.url.join('/') !== url.join('/');

        // IMPORTANT: Always update URL for proper child outlet routing
        // Even if URL appears unchanged, the segments might be different for parent routes
        this._snapshot = new ActivatedRouteSnapshot(path, params, queryParams, fragment, url, routeConfig ?? null);

        if (paramsChanged) {
            this._params.next(params);
        }
        if (queryParamsChanged) {
            this._queryParams.next(queryParams);
        }
        if (fragmentChanged) {
            this._fragment.next(fragment);
        }
        if (urlChanged) {
            this._url.next(url);
        } else {
            // Force URL update for child outlet routing even if unchanged
            this._url.next(url);
        }
    }

    private areParamsEqual(params1: Params, params2: Params): boolean {
        const keys1 = Object.keys(params1);
        const keys2 = Object.keys(params2);
        if (keys1.length !== keys2.length) return false;
        return keys1.every(key => params1[key] === params2[key]);
    }
}

export interface UrlCreationOptions {
    relativeTo?: ActivatedRoute | null | undefined;
    //queryParams?: Params | null | undefined;
    //fragment?: string | undefined;
    //queryParamsHandling?: QueryParamsHandling | null | undefined;
    //preserveFragment?: boolean | undefined;
}

export interface NavigationBehaviorOptions {
    //onSameUrlNavigation?: OnSameUrlNavigation | undefined;
    skipLocationChange?: boolean | undefined;
    replaceUrl?: boolean | undefined;
    //state?: { [k: string]: any; } | undefined;
    //readonly info?: unknown;
    //readonly browserUrl?: string | UrlTree | undefined;
}

export interface NavigationExtras extends UrlCreationOptions, NavigationBehaviorOptions {
  relativeTo?: ActivatedRoute | null;
  queryParams?: Params | null | undefined;
  //fragment?: string | undefined;
  //queryParamsHandling?: QueryParamsHandling | null | undefined;
  //preserveFragment?: boolean | undefined;
  //onSameUrlNavigation?: OnSameUrlNavigation | undefined;
  skipLocationChange?: boolean | undefined;
  replaceUrl?: boolean | undefined;
  //state?: { [k: string]: any; } | undefined;
  //readonly info?: unknown;
  //readonly browserUrl?: string | UrlTree | undefined;
}
