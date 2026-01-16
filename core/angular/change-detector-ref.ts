import '../global';

export class ChangeDetectorRef {
    private webComponentId: string;

    constructor(webComponentId: string) {
        this.webComponentId = webComponentId;
    }

    detectChanges(): void {
        const webComponent = window.__quarc.webComponentInstances?.get(this.webComponentId);
        webComponent?.rerender();
    }

    markForCheck(): void {
        queueMicrotask(() => this.detectChanges());
    }
}
