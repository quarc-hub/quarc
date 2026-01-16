"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.WebComponent = void 0;
const component_1 = require("./component");
const template_renderer_1 = require("./template-renderer");
const injectedStyles = new Set();
class WebComponent extends HTMLElement {
    constructor() {
        super();
        this._initialized = false;
    }
    setComponentInstance(component) {
        this.componentInstance = component;
        this.scopeId = component._scopeId;
        this.initialize();
    }
    connectedCallback() {
        if (this.componentInstance) {
            this.initialize();
        }
    }
    disconnectedCallback() {
        this.destroy();
    }
    initialize() {
        if (!this.componentInstance || this._initialized)
            return;
        const encapsulation = this.componentInstance._quarcComponent[0].encapsulation ?? component_1.ViewEncapsulation.Emulated;
        if (encapsulation === component_1.ViewEncapsulation.ShadowDom && !this._shadowRoot) {
            this._shadowRoot = this.attachShadow({ mode: 'open' });
        }
        else if (encapsulation === component_1.ViewEncapsulation.Emulated && this.scopeId) {
            this.setAttribute(`_nghost-${this.scopeId}`, '');
        }
        this._initialized = true;
        this.renderComponent();
    }
    renderComponent() {
        if (!this.componentInstance)
            return;
        const template = this.componentInstance._quarcComponent[0].template ?? '';
        const style = this.componentInstance._quarcComponent[0].style ?? '';
        const encapsulation = this.componentInstance._quarcComponent[0].encapsulation ?? component_1.ViewEncapsulation.Emulated;
        const renderTarget = this._shadowRoot ?? this;
        if (style) {
            if (encapsulation === component_1.ViewEncapsulation.ShadowDom) {
                const styleElement = document.createElement('style');
                styleElement.textContent = style;
                renderTarget.appendChild(styleElement);
            }
            else if (encapsulation === component_1.ViewEncapsulation.Emulated && this.scopeId) {
                if (!injectedStyles.has(this.scopeId)) {
                    const styleElement = document.createElement('style');
                    styleElement.textContent = this.transformHostSelector(style);
                    styleElement.setAttribute('data-scope-id', this.scopeId);
                    document.head.appendChild(styleElement);
                    injectedStyles.add(this.scopeId);
                }
            }
            else if (encapsulation === component_1.ViewEncapsulation.None) {
                const styleElement = document.createElement('style');
                styleElement.textContent = style;
                renderTarget.appendChild(styleElement);
            }
        }
        const templateFragment = template_renderer_1.TemplateFragment.getOrCreate(renderTarget, this.componentInstance, template);
        templateFragment.render();
        if (encapsulation === component_1.ViewEncapsulation.Emulated && this.scopeId) {
            this.applyScopeAttributes(renderTarget);
        }
    }
    getAttributes() {
        const attributes = [];
        const attrs = this.attributes;
        for (let i = 0; i < attrs.length; i++) {
            const attr = attrs[i];
            attributes.push({
                name: attr.name,
                value: attr.value,
            });
        }
        return attributes;
    }
    getChildElements() {
        const renderTarget = this._shadowRoot ?? this;
        const children = [];
        const elements = renderTarget.querySelectorAll('*');
        elements.forEach(element => {
            const attributes = [];
            const attrs = element.attributes;
            for (let i = 0; i < attrs.length; i++) {
                const attr = attrs[i];
                attributes.push({
                    name: attr.name,
                    value: attr.value,
                });
            }
            children.push({
                tagName: element.tagName.toLowerCase(),
                element: element,
                attributes: attributes,
                textContent: element.textContent,
            });
        });
        return children;
    }
    getChildElementsByTagName(tagName) {
        return this.getChildElements().filter(child => child.tagName === tagName.toLowerCase());
    }
    getChildElementsBySelector(selector) {
        const renderTarget = this._shadowRoot ?? this;
        const elements = renderTarget.querySelectorAll(selector);
        const children = [];
        elements.forEach(element => {
            const attributes = [];
            const attrs = element.attributes;
            for (let i = 0; i < attrs.length; i++) {
                const attr = attrs[i];
                attributes.push({
                    name: attr.name,
                    value: attr.value,
                });
            }
            children.push({
                tagName: element.tagName.toLowerCase(),
                element: element,
                attributes: attributes,
                textContent: element.textContent,
            });
        });
        return children;
    }
    getHostElement() {
        return this;
    }
    getShadowRoot() {
        return this._shadowRoot;
    }
    applyScopeAttributes(container) {
        if (!this.scopeId)
            return;
        const attr = `_ngcontent-${this.scopeId}`;
        const elements = container.querySelectorAll('*');
        elements.forEach(element => {
            element.setAttribute(attr, '');
        });
        if (container.children.length > 0) {
            Array.from(container.children).forEach(child => {
                child.setAttribute(attr, '');
            });
        }
    }
    transformHostSelector(css) {
        if (!this.scopeId)
            return css;
        const hostAttr = `[_nghost-${this.scopeId}]`;
        return css
            .replace(/:host\(([^)]+)\)/g, `${hostAttr}$1`)
            .replace(/:host/g, hostAttr);
    }
    destroy() {
        const renderTarget = this._shadowRoot ?? this;
        while (renderTarget.firstChild) {
            renderTarget.removeChild(renderTarget.firstChild);
        }
        this._initialized = false;
    }
}
exports.WebComponent = WebComponent;
