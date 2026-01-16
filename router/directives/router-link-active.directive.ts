import { Directive, IDirective, input, effect, IComponent, InputSignal } from "../../core";
import { Router } from "../angular/router";
import { Subscription } from "../../rxjs";

@Directive({
    selector: '[routerLinkActive]',
})
export class RouterLinkActive implements IDirective {

    public routerLinkActive!: InputSignal<string>;
    public routerLinkActiveOptions!: InputSignal<{ exact?: boolean }>;

    private subscription?: Subscription;

    constructor(
        private router: Router,
        public _nativeElement: HTMLElement,
    ) {
        this.routerLinkActive = input<string>('routerLinkActive', this as unknown as IComponent, '');
        this.routerLinkActiveOptions = input<{ exact?: boolean }>('routerLinkActiveOptions', this as unknown as IComponent, {});
        this.updateActiveState();

        this.subscription = this.router.events$.subscribe(() => {
            this.updateActiveState();
        });

        effect(() => {
            this.routerLinkActive();
            this.routerLinkActiveOptions();
            this.updateActiveState();
        });
    }

    ngOnDestroy(): void {
        this.subscription?.unsubscribe();
    }

    private updateActiveState(): void {
        const isActive = this.checkIsActive();
        const activeClass = this.routerLinkActive();
        if (activeClass) {
            if (isActive) {
                this._nativeElement.classList.add(activeClass);
            } else {
                this._nativeElement.classList.remove(activeClass);
            }
        }
    }

    private checkIsActive(): boolean {
        let routerLinkValue: string | string[] | undefined;

        const inputs = (this._nativeElement as any).__inputs;
        if (inputs?.routerLink) {
            routerLinkValue = inputs.routerLink();
        }

        if (!routerLinkValue) {
            routerLinkValue = this._nativeElement.getAttribute('router-link') || this._nativeElement.getAttribute('routerLink') || undefined;
        }

        if (!routerLinkValue) {
            return false;
        }

        const linkPath = Array.isArray(routerLinkValue) ? routerLinkValue.join('/') : routerLinkValue;
        const currentUrl = this.normalizeUrl(location.pathname);
        const linkUrl = this.normalizeUrl(linkPath);
        const options = this.routerLinkActiveOptions();

        if (options.exact) {
            return currentUrl === linkUrl;
        }

        return currentUrl === linkUrl || currentUrl.startsWith(linkUrl + '/');
    }

    private normalizeUrl(url: string): string {
        let normalized = url.startsWith('/') ? url : '/' + url;
        if (normalized.length > 1 && normalized.endsWith('/')) {
            normalized = normalized.slice(0, -1);
        }
        return normalized;
    }
}
