import { IComponent, effect, EffectRef, signal, WritableSignal } from "../index";
import { WebComponent } from "./web-component";

interface NgContainerMarker {
    startMarker: Comment;
    endMarker: Comment;
    condition?: string;
    originalTemplate: string;
    ngForExpression?: string;
}

declare global {
    interface HTMLElement {
        templateFragment?: TemplateFragment;
        component?: IComponent;
        template?: string;
        originalContent?: DocumentFragment;
        __inputs?: Record<string, WritableSignal<any>>;
        __quarcContext?: Record<string, any>;
        __effects?: EffectRef[];
    }
}

export class TemplateFragment {
    public container: HTMLElement;
    public component: IComponent;
    public template: string;
    public originalContent: DocumentFragment;
    private ngContainerMarkers: NgContainerMarker[] = [];
    private currentContext: any = null;

    constructor(
        container: HTMLElement,
        component: IComponent,
        template?: string,
    ) {
        this.container = container;
        this.component = component;
        this.template = template ?? '';
        this.originalContent = document.createDocumentFragment();

        while (container.firstChild) {
            this.originalContent.appendChild(container.firstChild);
        }

        container.templateFragment = this;
        container.component = component;
        container.template = this.template;
        container.originalContent = this.originalContent;
    }

    render(): void {
        if (!this.template) return;

        const templateElement = document.createElement('template');
        templateElement.innerHTML = this.template;

        const renderedContent = templateElement.content.cloneNode(true) as DocumentFragment;

        // Process structural directives before appending
        this.processStructuralDirectives(renderedContent);

        // Process property bindings BEFORE adding elements to DOM
        // This ensures __inputs is set before child component's connectedCallback runs
        const tempContainer = document.createElement('div');
        while (renderedContent.firstChild) {
            tempContainer.appendChild(renderedContent.firstChild);
        }
        this.processPropertyBindings(tempContainer);

        while (tempContainer.firstChild) {
            this.container.appendChild(tempContainer.firstChild);
        }
    }

    private processStructuralDirectives(fragment: DocumentFragment): void {
        this.processSelectFor(fragment);

        const ngContainers = Array.from(fragment.querySelectorAll('ng-container'));
        for (const c of ngContainers) {
            this.processNgContainer(c as HTMLElement);
        }
    }

    private processSelectFor(fragment: DocumentFragment): void {
        for (const s of Array.from(fragment.querySelectorAll('select,optgroup'))) {
            const w = document.createTreeWalker(s, NodeFilter.SHOW_COMMENT);
            const m: Comment[] = [];
            let n;
            while ((n = w.nextNode())) {
                if ((n.textContent || '').startsWith('F:')) m.push(n as Comment);
            }
            for (const c of m) this.expandFor(s as HTMLElement, c);
        }
    }

    private expandFor(p: HTMLElement, m: Comment): void {
        const [, v, e] = (m.textContent || '').split(':');
        const t: HTMLElement[] = [];
        let c: Node | null = m.nextSibling;
        while (c && !(c.nodeType === 8 && c.textContent === '/F')) {
            if (c.nodeType === 1) t.push(c as HTMLElement);
            c = c.nextSibling;
        }
        if (!t.length) return;
        try {
            const items = this.evaluateExpression(e);
            if (!items) return;
            for (const i of Array.isArray(items) ? items : Object.values(items)) {
                for (const el of t) {
                    const cl = el.cloneNode(true) as HTMLElement;
                    cl.__quarcContext = { [v]: i };
                    p.insertBefore(cl, m);
                }
            }
            t.forEach(x => x.remove());
            m.remove();
            c?.parentNode?.removeChild(c);
        } catch {}
    }

    private processNgContainer(ngContainer: HTMLElement): void {
        const ngIfAttr = ngContainer.getAttribute('*ngIf');
        const ngForAttr = ngContainer.getAttribute('*ngFor');
        const parent = ngContainer.parentNode;

        if (!parent) return;

        // Create marker comments to track ng-container position
        let markerComment = 'ng-container-start';
        if (ngIfAttr) markerComment += ` *ngIf="${ngIfAttr}"`;
        if (ngForAttr) markerComment += ` *ngFor="${ngForAttr}"`;

        const startMarker = document.createComment(markerComment);
        const endMarker = document.createComment('ng-container-end');

        // Store marker information for later re-rendering
        const originalTemplate = ngContainer.innerHTML;
        this.ngContainerMarkers.push({
            startMarker,
            endMarker,
            condition: ngIfAttr || undefined,
            originalTemplate,
            ngForExpression: ngForAttr || undefined
        });

        parent.insertBefore(startMarker, ngContainer);

        if (ngForAttr) {
            // Handle *ngFor directive
            this.processNgForDirective(ngContainer, ngForAttr, parent, endMarker);
        } else if (ngIfAttr) {
            // Handle *ngIf directive with optional 'let variable' syntax
            this.processNgIfDirective(ngContainer, ngIfAttr, parent, endMarker);
        } else {
            // No condition - render content between markers
            while (ngContainer.firstChild) {
                parent.insertBefore(ngContainer.firstChild, ngContainer);
            }
            parent.insertBefore(endMarker, ngContainer);
            ngContainer.remove();
        }
    }


    private processNgIfDirective(ngContainer: HTMLElement, ngIfExpression: string, parent: Node, endMarker: Comment): void {
        const parentContext = ngContainer.__quarcContext;
        const { condition, aliasVariable } = this.parseNgIfExpression(ngIfExpression);

        try {
            const value = this.evaluateExpressionWithContext(condition, parentContext);

            if (!value) {
                parent.insertBefore(endMarker, ngContainer);
                ngContainer.remove();
                return;
            }

            if (aliasVariable) {
                const ctx = { ...parentContext, [aliasVariable]: value };
                const content = ngContainer.childNodes;
                const nodes: Node[] = [];

                while (content.length > 0) {
                    nodes.push(content[0]);
                    parent.insertBefore(content[0], ngContainer);
                }

                for (const node of nodes) {
                    if (node.nodeType === 1) {
                        (node as HTMLElement).__quarcContext = ctx;
                        this.propagateContextToChildren(node as HTMLElement, ctx);
                    }
                }
            } else {
                while (ngContainer.firstChild) {
                    parent.insertBefore(ngContainer.firstChild, ngContainer);
                }
            }

            parent.insertBefore(endMarker, ngContainer);
            ngContainer.remove();
        } catch {
            parent.insertBefore(endMarker, ngContainer);
            ngContainer.remove();
        }
    }

    private parseNgIfExpression(expression: string): { condition: string; aliasVariable?: string } {
        const letMatch = expression.match(/^(.+);\s*let\s+([a-zA-Z_$][a-zA-Z0-9_$]*)\s*$/);
        if (letMatch) {
            return {
                condition: letMatch[1].trim(),
                aliasVariable: letMatch[2].trim()
            };
        }
        return { condition: expression.trim() };
    }

    private propagateContextToChildren(element: HTMLElement, ctx: any): void {
        const children = element.querySelectorAll('*');
        for (const child of Array.from(children)) {
            (child as HTMLElement).__quarcContext = ctx;
        }
    }

    private processNgForDirective(ngContainer: HTMLElement, ngForExpression: string, parent: Node, endMarker: Comment): void {
        const parts = ngForExpression.split(';').map(part => part.trim());
        const forPart = parts[0];

        const forOfMatch = forPart.match(/^let\s+(\w+)\s+of\s+(.+)$/);
        const forInMatch = forPart.match(/^let\s+(\w+)\s+in\s+(.+)$/);

        const match = forOfMatch || forInMatch;
        const isForIn = !!forInMatch;

        if (!match) {
            parent.insertBefore(endMarker, ngContainer);
            ngContainer.remove();
            return;
        }

        const variableName = match[1];
        const iterableExpression = match[2];
        const loopTemplate = ngContainer.innerHTML;
        const startMarker = document.createComment(`ngFor-start: ${ngForExpression}`);
        const parentContext = ngContainer.__quarcContext;

        parent.insertBefore(startMarker, ngContainer);
        parent.insertBefore(endMarker, ngContainer);
        ngContainer.remove();

        const renderLoop = () => {
            let current = startMarker.nextSibling;
            while (current && current !== endMarker) {
                const next = current.nextSibling;
                if (current.nodeType === 1) {
                    TemplateFragment.destroyEffects(current as HTMLElement);
                }
                current.parentNode?.removeChild(current);
                current = next;
            }

            try {
                const iterable = this.evaluateExpressionWithContext(iterableExpression, parentContext);
                if (iterable == null) return;

                const fragment = document.createDocumentFragment();

                if (isForIn) {
                    for (const key in iterable) {
                        if (Object.prototype.hasOwnProperty.call(iterable, key)) {
                            this.renderForItem(fragment, loopTemplate, variableName, key, parentContext);
                        }
                    }
                } else {
                    const items = Array.isArray(iterable) ? iterable : Object.values(iterable);
                    for (const item of items) {
                        this.renderForItem(fragment, loopTemplate, variableName, item, parentContext);
                    }
                }

                parent.insertBefore(fragment, endMarker);
                this.reapplyDirectives();
            } catch {}
        };

        this.registerEffect(this.container, effect(renderLoop));
    }

    private getWebComponent(): WebComponent | null {
        let el: HTMLElement | null = this.container;
        while (el) {
            if (el instanceof WebComponent) {
                return el;
            }
            el = el.parentElement;
        }
        return null;
    }

    private reapplyDirectives(): void {
        const webComponent = this.getWebComponent();
        if (webComponent) {
            queueMicrotask(() => webComponent.applyDirectives());
        }
    }

    private renderForItem(fragment: DocumentFragment, template: string, variableName: string, value: any, parentContext?: any): void {
        const ctx = { ...parentContext, [variableName]: value };
        const t = document.createElement('template');
        t.innerHTML = template;
        const content = t.content;
        for (const el of Array.from(content.querySelectorAll('*'))) {
            (el as HTMLElement).__quarcContext = ctx;
        }
        this.processStructuralDirectivesWithContext(content, ctx);
        const tempDiv = document.createElement('div');
        while (content.firstChild) {
            tempDiv.appendChild(content.firstChild);
        }
        this.processPropertyBindings(tempDiv);
        this.applyScopeAttributes(tempDiv);
        while (tempDiv.firstChild) fragment.appendChild(tempDiv.firstChild);
    }

    private getScopeId(): string | null {
        let el: HTMLElement | null = this.container;
        while (el) {
            for (const attr of Array.from(el.attributes)) {
                if (attr.name.startsWith('_nghost-')) {
                    return attr.name.substring(8);
                }
            }
            el = el.parentElement;
        }
        return null;
    }

    private applyScopeAttributes(container: HTMLElement): void {
        const scopeId = this.getScopeId();
        if (!scopeId) return;
        const attr = `_ngcontent-${scopeId}`;
        container.querySelectorAll('*').forEach(e => e.setAttribute(attr, ''));
        Array.from(container.children).forEach(e => e.setAttribute(attr, ''));
    }

    private processStructuralDirectivesWithContext(fragment: DocumentFragment, ctx: any): void {
        const ngContainers = Array.from(fragment.querySelectorAll('ng-container'));
        for (const c of ngContainers) {
            (c as HTMLElement).__quarcContext = ctx;
            this.processNgContainer(c as HTMLElement);
        }
    }

    private evaluateCondition(condition: string): boolean {
        try {
            return new Function('component', `with(component) { return ${condition}; }`)(this.component);
        } catch {
            return false;
        }
    }

    private evaluateConditionWithContext(condition: string, ctx?: any): boolean {
        try {
            const mergedContext = { ...this.component, ...(ctx || {}) };
            return new Function('c', `with(c) { return ${condition}; }`)(mergedContext);
        } catch {
            return false;
        }
    }

    /**
     * Re-renders a specific ng-container fragment based on marker position
     */
    rerenderFragment(markerIndex: number): void {
        if (markerIndex < 0 || markerIndex >= this.ngContainerMarkers.length) {
            return;
        }

        const marker = this.ngContainerMarkers[markerIndex];
        const { startMarker, endMarker, condition, originalTemplate } = marker;

        // Remove all nodes between markers
        let currentNode = startMarker.nextSibling;
        while (currentNode && currentNode !== endMarker) {
            const nextNode = currentNode.nextSibling;
            currentNode.remove();
            currentNode = nextNode;
        }

        // Re-evaluate condition and render if true
        if (!condition || this.evaluateCondition(condition)) {
            const tempContainer = document.createElement('div');
            tempContainer.innerHTML = originalTemplate;

            const fragment = document.createDocumentFragment();
            while (tempContainer.firstChild) {
                fragment.appendChild(tempContainer.firstChild);
            }

            // Process property bindings on the fragment
            const tempWrapper = document.createElement('div');
            tempWrapper.appendChild(fragment);
            this.processPropertyBindings(tempWrapper);

            // Insert processed nodes between markers
            const parent = startMarker.parentNode;
            if (parent) {
                while (tempWrapper.firstChild) {
                    parent.insertBefore(tempWrapper.firstChild, endMarker);
                }
            }
        }
    }

    /**
     * Re-renders all ng-container fragments
     */
    rerenderAllFragments(): void {
        for (let i = 0; i < this.ngContainerMarkers.length; i++) {
            this.rerenderFragment(i);
        }
    }

    /**
     * Gets all ng-container markers for inspection
     */
    getFragmentMarkers(): NgContainerMarker[] {
        return this.ngContainerMarkers;
    }

    private processPropertyBindings(container: HTMLElement | DocumentFragment): void {
        const allElements = Array.from(container.querySelectorAll('*'));

        for (const element of allElements) {
            this.currentContext = this.buildContextForElement(element as HTMLElement);
            this.processElementBindings(element as HTMLElement);
            this.currentContext = null;
        }
    }

    private buildContextForElement(el: HTMLElement): any {
        const chain: Record<string, any>[] = [];
        let c: HTMLElement | null = el;
        while (c) {
            if (c.__quarcContext) chain.unshift(c.__quarcContext);
            if (c.component) break;
            c = c.parentElement;
        }
        const ctx = Object.create(this.component);
        for (const x of chain) Object.assign(ctx, x);
        return ctx;
    }

    private processElementBindings(element: HTMLElement): void {
        const attributesToRemove: string[] = [];
        const attributes = Array.from(element.attributes);

        for (const attr of attributes) {
            if (attr.name.startsWith('(') && attr.name.endsWith(')')) {
                this.processOutputBinding(element, attr.name, attr.value);
                attributesToRemove.push(attr.name);
            } else if (attr.name.startsWith('[') && attr.name.endsWith(']')) {
                const propertyName = attr.name.slice(1, -1);
                const expression = attr.value;

                if (propertyName.startsWith('attr.')) {
                    this.processAttrBinding(element, propertyName.slice(5), expression);
                } else if (propertyName.startsWith('style.')) {
                    this.processStyleBinding(element, propertyName.slice(6), expression);
                } else if (propertyName.startsWith('class.')) {
                    this.processClassBinding(element, propertyName.slice(6), expression);
                } else if (this.isCustomElement(element)) {
                    this.processInputBinding(element, propertyName, expression);
                } else {
                    const camelCaseName = this.kebabToCamel(propertyName);
                    this.processDomPropertyBinding(element, camelCaseName, expression);
                    this.processInputBinding(element, camelCaseName, expression);
                    this.setInputAttribute(element, propertyName, expression);
                }

                attributesToRemove.push(attr.name);
            } else if (attr.name === 'data-bind') {
                this.processDataBind(element, attr.value);
                attributesToRemove.push(attr.name);
            } else if (attr.name.startsWith('data-input-')) {
                const propertyName = attr.name.slice(11);
                this.processInputBinding(element, propertyName, attr.value);
                attributesToRemove.push(attr.name);
            } else if (attr.name.startsWith('data-on-')) {
                const eventName = attr.name.slice(8);
                this.processDataOutputBinding(element, eventName, attr.value);
                attributesToRemove.push(attr.name);
            } else if (attr.name === 'data-quarc-attr-bindings') {
                this.processQuarcAttrBindings(element, attr.value);
                attributesToRemove.push(attr.name);
            }
        }

        for (const attrName of attributesToRemove) {
            element.removeAttribute(attrName);
        }
    }

    private processQuarcAttrBindings(el: HTMLElement, json: string): void {
        try {
            const b: { attr: string; expr: string }[] = JSON.parse(json.replace(/&apos;/g, "'").replace(/'/g, '"'));
            for (const { attr, expr } of b) this.setAttr(el, attr, this.eval(expr));
        } catch {}
    }

    private isCustomElement(element: HTMLElement): boolean {
        return element.tagName.includes('-');
    }

    private processOutputBinding(element: HTMLElement, attrName: string, expression: string): void {
        const eventName = this.camelToKebab(attrName.slice(1, -1));
        this.processDataOutputBinding(element, eventName, expression);
    }

    private processDataOutputBinding(el: HTMLElement, ev: string, expr: string): void {
        const ctx = this.currentContext ?? this.component;
        el.addEventListener(ev, (e: Event) => {
            try { new Function('c', '$event', `with(c){return ${expr}}`)(ctx, (e as CustomEvent).detail ?? e); } catch {}
        });
    }

    private processDataBind(el: HTMLElement, expr: string): void {
        const ctx = this.currentContext ?? this.component;
        this.registerEffect(el, effect(() => {
            try { el.innerHTML = String(this.evalWithContext(expr, ctx) ?? ''); } catch {}
        }));
    }

    private processInputBinding(el: HTMLElement, prop: string, expr: string): void {
        if (!el.__inputs) el.__inputs = {};
        const ctx = this.currentContext ?? this.component;
        const initialValue = this.evalWithContext(expr, ctx);
        const s = signal<any>(initialValue);
        el.__inputs[prop] = s;
        this.registerEffect(el, effect(() => {
            try { s.set(this.evalWithContext(expr, ctx)); } catch {}
        }));
    }

    private processAttrBinding(el: HTMLElement, attr: string, expr: string): void {
        const ctx = this.currentContext ?? this.component;
        this.registerEffect(el, effect(() => {
            try { this.setAttr(el, attr, this.evalWithContext(expr, ctx)); } catch {}
        }));
    }

    private setAttr(el: HTMLElement, attr: string, v: any): void {
        if (v == null || v === false) el.removeAttribute(attr);
        else el.setAttribute(attr, v === true ? '' : String(v));
    }

    private eval(expr: string): any {
        return new Function('c', `with(c){return ${expr}}`)(this.currentContext ?? this.component);
    }

    private evalWithContext(expr: string, ctx: any): any {
        return new Function('c', `with(c){return ${expr}}`)(ctx);
    }

    private registerEffect(el: HTMLElement, effectRef: EffectRef): void {
        if (!el.__effects) el.__effects = [];
        el.__effects.push(effectRef);
    }

    private processStyleBinding(el: HTMLElement, prop: string, expr: string): void {
        const ctx = this.currentContext ?? this.component;
        const p = prop.replace(/([A-Z])/g, '-$1').toLowerCase();
        this.registerEffect(el, effect(() => {
            try {
                const v = this.evalWithContext(expr, ctx);
                v == null || v === false ? el.style.removeProperty(p) : el.style.setProperty(p, String(v));
            } catch {}
        }));
    }

    private processClassBinding(el: HTMLElement, cls: string, expr: string): void {
        const ctx = this.currentContext ?? this.component;
        this.registerEffect(el, effect(() => {
            try { this.evalWithContext(expr, ctx) ? el.classList.add(cls) : el.classList.remove(cls); } catch {}
        }));
    }

    private processDomPropertyBinding(el: HTMLElement, prop: string, expr: string): void {
        const m: Record<string, string> = { innerhtml: 'innerHTML', textcontent: 'textContent', innertext: 'innerText', classname: 'className' };
        const ctx = this.currentContext ?? this.component;
        const resolvedProp = m[prop.toLowerCase()] ?? prop;
        this.registerEffect(el, effect(() => {
            try { (el as any)[resolvedProp] = this.evalWithContext(expr, ctx); } catch {}
        }));
    }

    private evaluateExpression(expr: string): any {
        try { return this.eval(expr); } catch { return undefined; }
    }

    private evaluateExpressionWithContext(expr: string, ctx?: any): any {
        try {
            const mergedContext = { ...this.component, ...(ctx || {}) };
            return new Function('c', `with(c){return ${expr}}`)(mergedContext);
        } catch { return undefined; }
    }

    static getOrCreate(container: HTMLElement, component: IComponent, template?: string): TemplateFragment {
        if (container.templateFragment) {
            return container.templateFragment;
        }
        return new TemplateFragment(container, component, template);
    }

    static destroyEffects(container: HTMLElement): void {
        const allElements = container.querySelectorAll('*');
        for (const el of Array.from(allElements)) {
            const htmlEl = el as HTMLElement;
            if (htmlEl.__effects) {
                for (const e of htmlEl.__effects) e.destroy();
                htmlEl.__effects = [];
            }
        }
        if (container.__effects) {
            for (const e of container.__effects) e.destroy();
            container.__effects = [];
        }
    }

    private camelToKebab(str: string): string {
        return str.replace(/([a-z])([A-Z])/g, '$1-$2').toLowerCase();
    }

    private kebabToCamel(str: string): string {
        return str.replace(/-([a-z])/g, (_, letter) => letter.toUpperCase());
    }

    private setInputAttribute(el: HTMLElement, attrName: string, expr: string): void {
        const ctx = this.currentContext ?? this.component;
        this.registerEffect(el, effect(() => {
            try {
                const value = this.evalWithContext(expr, ctx);
                if (value == null || value === false) {
                    el.removeAttribute(attrName);
                } else if (value === true) {
                    el.setAttribute(attrName, '');
                } else if (typeof value === 'object') {
                    el.setAttribute(attrName, JSON.stringify(value));
                } else {
                    el.setAttribute(attrName, String(value));
                }
            } catch {}
        }));
    }
}