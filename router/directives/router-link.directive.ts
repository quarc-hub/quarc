import { Directive, IDirective, input, IComponent, InputSignal } from "../../core";
import { Router } from "../angular/router";
import { ActivatedRoute } from "../angular/types";

@Directive({
    selector: '[routerLink]',
})
export class RouterLink implements IDirective {
    static __quarc_original_name__ = "RouterLink";

    public routerLink = input<string | string[]>();

    constructor(
        private router: Router,
        public _nativeElement: HTMLElement,
        private activatedRoute?: ActivatedRoute,
    ) {
        console.log({ routerLink: this.routerLink() });
        this._nativeElement.addEventListener('click', (event) => {
            this.onClick(event);
        });
    }

    ngOnInit(): void {
        // Required by IDirective interface
    }

    ngOnDestroy(): void {
        // Required by IDirective interface
    }

    public onClick(event: Event): void {
        event.preventDefault();
        const link = this.routerLink();
        const commands = Array.isArray(link) ? link : [link];

        // For sidebar navigation, use DOM traversal to get proper root route context
        // For other cases, use injected route, global stack, then DOM fallback
        const isSidebarNavigation = this._nativeElement.closest('app-sidebar') !== null;
        const routeForNavigation = isSidebarNavigation
            ? this.findActivatedRouteFromDOM()
            : (this.activatedRoute || this.getCurrentActivatedRoute() || this.findActivatedRouteFromDOM());
        const extras = routeForNavigation ? { relativeTo: routeForNavigation } : undefined;

        this.router.navigate(commands, extras).then(success => {
        }).catch(error => {
            console.error('RouterLink CLICK - Navigation failed:', error);
        });
    }

    private getCurrentActivatedRoute(): ActivatedRoute | null {
        // Try to get from global activated route stack
        const stack = window.__quarc?.activatedRouteStack;
        if (stack && stack.length > 0) {
            return stack[stack.length - 1];
        }
        return null;
    }

    private findActivatedRouteFromDOM(): ActivatedRoute | null {
        // Start from the directive's element and go up to find router-outlet
        let currentElement: Element | null = this._nativeElement;
        let depth = 0;

        while (currentElement) {
            // Check if current element is a router-outlet
            if (currentElement.tagName.toLowerCase() === 'router-outlet') {
                const routerOutlet = (currentElement as any).componentInstance;
                if (routerOutlet && 'activatedRoute' in routerOutlet) {
                    const route = routerOutlet.activatedRoute;
                    // For sidebar navigation between root routes, don't use parentRoute
                    // Only use parentRoute for navigation within plugin contexts
                    const isSidebarNavigation = this._nativeElement.closest('app-sidebar') !== null;
                    const navigationRoute = isSidebarNavigation ? (routerOutlet.parentRoute || route) : (routerOutlet.parentRoute || route);

                    return navigationRoute ?? null;
                }
            }

            // Move to parent
            currentElement = currentElement.parentElement;
            depth++;
        }

        return null;
    }
}
