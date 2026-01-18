import {
    IComponent,
    ViewEncapsulation,
    TemplateFragment,
    ComponentType,
    ComponentOptions,
    DirectiveRunner,
    DirectiveInstance,
    effect,
    EffectRef,
    PipeRegistry,
} from '../index';

interface QuarcScopeRegistry {
    counter: number;
    scopeMap: Map<string, string>;
    injectedStyles: Set<string>;
}

declare global {
    interface Window {
        __quarcScopeRegistry?: QuarcScopeRegistry;
    }
}

function getScopeRegistry(): QuarcScopeRegistry {
    if (!window.__quarcScopeRegistry) {
        window.__quarcScopeRegistry = {
            counter: 0,
            scopeMap: new Map(),
            injectedStyles: new Set(),
        };
    }
    return window.__quarcScopeRegistry;
}

function getUniqueScopeId(compiledScopeId: string): string {
    const registry = getScopeRegistry();
    if (!registry.scopeMap.has(compiledScopeId)) {
        registry.scopeMap.set(compiledScopeId, `q${registry.counter++}`);
    }
    return registry.scopeMap.get(compiledScopeId)!;
}

export interface AttributeInfo {
    name: string;
    value: string | null;
}

export interface ChildElementInfo {
    tagName: string;
    element: Element;
    attributes: AttributeInfo[];
    textContent: string | null;
}

export class WebComponent extends HTMLElement {
    public componentInstance?: IComponent;
    private componentType?: ComponentType<IComponent>;
    private compiledScopeId?: string;
    private runtimeScopeId?: string;
    private _shadowRoot?: ShadowRoot;
    private _initialized = false;
    private directiveInstances: DirectiveInstance[] = [];
    private renderEffect?: EffectRef;
    private isRendering = false;

    constructor() {
        super();
    }

    setComponentInstance(component: IComponent, componentType: ComponentType<IComponent>): void {
        this.componentInstance = component;
        this.componentType = componentType;
        if (componentType._scopeId) {
            this.compiledScopeId = componentType._scopeId;
            this.runtimeScopeId = getUniqueScopeId(componentType._scopeId);
        }
        this.initialize();
    }

    getComponentOptions(): ComponentOptions {
        return this.componentType!._quarcComponent[0];
    }

    isInitialized(): boolean {
        return this._initialized;
    }

    connectedCallback(): void {
        if (this.componentInstance) {
            this.initialize();
        }
    }

    disconnectedCallback(): void {
        this.destroy();
    }

    private initialize(): void {
        if (!this.componentInstance || !this.componentType || this._initialized) return;

        const encapsulation = this.componentType._quarcComponent[0].encapsulation ?? ViewEncapsulation.Emulated;

        if (encapsulation === ViewEncapsulation.ShadowDom && !this._shadowRoot) {
            this._shadowRoot = this.attachShadow({ mode: 'open' });
        } else if (encapsulation === ViewEncapsulation.Emulated && this.runtimeScopeId) {
            this.setAttribute(`_nghost-${this.runtimeScopeId}`, '');
        }

        this.initializePipes();

        this._initialized = true;
        this.renderComponent();
    }

    private initializePipes(): void {
        if (!this.componentInstance || !this.componentType) return;

        const pipes = this.componentType._quarcPipes || [];
        const pipeRegistry = PipeRegistry.get();
        const pipeInstances: Record<string, any> = {};

        for (const pipeType of pipes) {
            pipeRegistry.register(pipeType);
            const metadata = pipeRegistry.getPipeMetadata(pipeType);
            if (metadata) {
                const pipeInstance = new pipeType();
                pipeInstances[metadata.name] = pipeInstance;
            }
        }

        (this.componentInstance as any)._pipes = pipeInstances;
    }

    renderComponent(): void {
        if (!this.componentInstance || !this.componentType) return;

        const style = this.componentType._quarcComponent[0].style ?? '';
        const encapsulation = this.componentType._quarcComponent[0].encapsulation ?? ViewEncapsulation.Emulated;
        const renderTarget = this._shadowRoot ?? this;

        if (style) {
            if (encapsulation === ViewEncapsulation.ShadowDom) {
                const styleElement = document.createElement('style');
                styleElement.textContent = style;
                renderTarget.appendChild(styleElement);
            } else if (encapsulation === ViewEncapsulation.Emulated && this.runtimeScopeId) {
                const registry = getScopeRegistry();
                if (!registry.injectedStyles.has(this.runtimeScopeId)) {
                    const styleElement = document.createElement('style');
                    styleElement.textContent = this.transformScopeAttributes(style);
                    styleElement.setAttribute('data-scope-id', this.runtimeScopeId);
                    document.head.appendChild(styleElement);
                    registry.injectedStyles.add(this.runtimeScopeId);
                }
            } else if (encapsulation === ViewEncapsulation.None) {
                const styleElement = document.createElement('style');
                styleElement.textContent = style;
                renderTarget.appendChild(styleElement);
            }
        }

        this.renderEffect = effect(() => this.renderTemplate());

        queueMicrotask(() => {
            this.callNgOnInit();
        });
    }

    private renderTemplate(): void {
        if (!this.componentInstance || !this.componentType) return;
        if (this.isRendering) return;
        this.isRendering = true;

        const template = this.componentType._quarcComponent[0].template ?? '';
        const encapsulation = this.componentType._quarcComponent[0].encapsulation ?? ViewEncapsulation.Emulated;
        const renderTarget = this._shadowRoot ?? this;

        DirectiveRunner.destroyInstances(this.directiveInstances);
        this.directiveInstances = [];
        TemplateFragment.destroyEffects(renderTarget as HTMLElement);

        while (renderTarget.firstChild) {
            renderTarget.removeChild(renderTarget.firstChild);
        }

        const templateFragment = new TemplateFragment(
            renderTarget as HTMLElement,
            this.componentInstance,
            template,
        );

        templateFragment.render();

        if (encapsulation === ViewEncapsulation.Emulated && this.runtimeScopeId) {
            this.applyScopeAttributes(renderTarget as HTMLElement);
        }

        this.isRendering = false;

        queueMicrotask(() => {
            this.applyDirectives();
        });
    }

    rerender(): void {
        if (!this.componentInstance || !this.componentType || !this._initialized) return;
        this.renderTemplate();
    }

    public applyDirectives(): void {
        const directives = this.componentType?._quarcDirectives;
        if (!directives || directives.length === 0 || !this.runtimeScopeId) {
            return;
        }

        const renderTarget = this._shadowRoot ?? this;
        this.directiveInstances = DirectiveRunner.apply(
            renderTarget as HTMLElement,
            this.runtimeScopeId,
            directives,
        );
    }

    getAttributes(): AttributeInfo[] {
        return Array.from(this.attributes).map(a => ({ name: a.name, value: a.value }));
    }

    private toChildInfo(el: Element): ChildElementInfo {
        return {
            tagName: el.tagName.toLowerCase(),
            element: el,
            attributes: Array.from(el.attributes).map(a => ({ name: a.name, value: a.value })),
            textContent: el.textContent,
        };
    }

    getChildElements(): ChildElementInfo[] {
        return Array.from((this._shadowRoot ?? this).querySelectorAll('*')).map(e => this.toChildInfo(e));
    }

    getChildElementsByTagName(tag: string): ChildElementInfo[] {
        return this.getChildElements().filter(c => c.tagName === tag.toLowerCase());
    }

    getChildElementsBySelector(sel: string): ChildElementInfo[] {
        return Array.from((this._shadowRoot ?? this).querySelectorAll(sel)).map(e => this.toChildInfo(e));
    }

    getHostElement(): HTMLElement {
        return this;
    }

    getShadowRoot(): ShadowRoot | undefined {
        return this._shadowRoot;
    }

    private applyScopeAttributes(c: HTMLElement): void {
        if (!this.runtimeScopeId) return;
        const a = `_ngcontent-${this.runtimeScopeId}`;
        c.querySelectorAll('*').forEach(e => e.setAttribute(a, ''));
        Array.from(c.children).forEach(e => e.setAttribute(a, ''));
    }

    private transformScopeAttributes(css: string): string {
        if (!this.compiledScopeId || !this.runtimeScopeId) return css;

        return css
            .replace(new RegExp(`_nghost-${this.compiledScopeId}`, 'g'), `_nghost-${this.runtimeScopeId}`)
            .replace(new RegExp(`_ngcontent-${this.compiledScopeId}`, 'g'), `_ngcontent-${this.runtimeScopeId}`);
    }

    destroy(): void {
        this.callNgOnDestroy();
        this.renderEffect?.destroy();
        DirectiveRunner.destroyInstances(this.directiveInstances);
        this.directiveInstances = [];

        const renderTarget = this._shadowRoot ?? this;
        TemplateFragment.destroyEffects(renderTarget as HTMLElement);
        while (renderTarget.firstChild) {
            renderTarget.removeChild(renderTarget.firstChild);
        }
        this._initialized = false;
    }

    private callNgOnInit(): void {
        if (this.componentInstance && 'ngOnInit' in this.componentInstance) {
            (this.componentInstance as any).ngOnInit();
        }
    }

    private callNgOnDestroy(): void {
        if (this.componentInstance && 'ngOnDestroy' in this.componentInstance) {
            (this.componentInstance as any).ngOnDestroy();
        }
    }
}
