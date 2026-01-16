import { IComponent, WebComponent, Injector, ComponentType, ComponentUtils, ChangeDetectorRef } from '../index';
import { Provider } from '../angular/app-config';
import { ActivatedRoute } from '../../router';
import '../global';

export class WebComponentFactory {
    private static get registeredComponents(): Map<string, typeof WebComponent> {
        window.__quarc.registeredComponents ??= new Map();
        return window.__quarc.registeredComponents;
    }

    private static get componentTypes(): Map<string, ComponentType<IComponent>> {
        window.__quarc.componentTypes ??= new Map();
        return window.__quarc.componentTypes;
    }

    static registerWithDependencies(componentType: ComponentType<IComponent>): boolean {
        const selector = ComponentUtils.getSelector(componentType);
        const tagName = ComponentUtils.selectorToTagName(selector);

        if (this.registeredComponents.has(tagName)) {
            return false;
        }

        const componentMeta = componentType._quarcComponent?.[0];
        if (!componentMeta) {
            console.warn(`Component ${componentType.name} has no _quarcComponent metadata`);
            return false;
        }

        const imports = componentMeta.imports || [];

        for (const importItem of imports) {
            if (ComponentUtils.isComponentType(importItem)) {
                const depType = importItem as ComponentType<IComponent>;
                this.registerWithDependencies(depType);
            }
        }

        return this.tryRegister(componentType);
    }

    static tryRegister(componentType: ComponentType<IComponent>): boolean {
        const selector = ComponentUtils.getSelector(componentType);
        const tagName = ComponentUtils.selectorToTagName(selector);

        if (this.registeredComponents.has(tagName)) {
            return false;
        }

        try {
            const WebComponentClass = class extends WebComponent {
                constructor() {
                    super();
                }

                connectedCallback(): void {
                    const compType = WebComponentFactory.componentTypes.get(tagName);
                    if (compType && !this.isInitialized()) {
                        const instance = WebComponentFactory.createComponentInstance(compType, this);
                        this.setComponentInstance(instance, compType);
                    }
                    super.connectedCallback();
                }
            };

            customElements.define(tagName, WebComponentClass);
            this.registeredComponents.set(tagName, WebComponentClass);
            this.componentTypes.set(tagName, componentType);
            return true;
        } catch (error) {
            console.warn(`Failed to register component ${tagName}:`, error);
            return false;
        }
    }

    private static getWebComponentInstances(): Map<string, WebComponent> {
        window.__quarc.webComponentInstances ??= new Map();
        return window.__quarc.webComponentInstances;
    }

    private static generateWebComponentId(): string {
        window.__quarc.webComponentIdCounter ??= 0;
        return `wc-${window.__quarc.webComponentIdCounter++}`;
    }

    static createComponentInstance(componentType: ComponentType<IComponent>, element: HTMLElement): IComponent {
        const injector = Injector.get();
        const webComponent = element as WebComponent;
        const webComponentId = this.generateWebComponentId();
        this.getWebComponentInstances().set(webComponentId, webComponent);
        //const changeDetectorRef = new ChangeDetectorRef(webComponentId);

        const localProviders: Provider[] = [
            { provide: HTMLElement, useValue: element },
            { provide: ActivatedRoute, useValue: this.findActivatedRouteFromElement(element) },
        ];

        const componentMeta = componentType._quarcComponent?.[0];
        if (componentMeta?.providers) {
            for (const providerType of componentMeta.providers) {
                if (typeof providerType === 'function') {
                    const alreadyProvided = localProviders.some(p => p.provide === providerType);
                    if (!alreadyProvided) {
                        localProviders.push({ provide: providerType, useClass: providerType });
                    }
                }
            }
        }

        console.log({localProviders});
        return injector.createInstanceWithProviders<IComponent>(componentType, localProviders);
    }

    private static findActivatedRouteFromElement(element: HTMLElement): ActivatedRoute | null {
        // Start from the component's element and go up to find router-outlet
        let currentElement: Element | null = element;
        let depth = 0;
        const elementPath: string[] = [];

        // Log the starting element
        while (currentElement) {
            elementPath.push(`${currentElement.tagName.toLowerCase()}${currentElement.id ? '#' + currentElement.id : ''}${currentElement.className ? '.' + currentElement.className.replace(/\s+/g, '.') : ''}`);

            // Check if current element is a router-outlet
            if (currentElement.tagName.toLowerCase() === 'router-outlet') {
                const routerOutlet = (currentElement as WebComponent).componentInstance;
                if (routerOutlet && 'activatedRoute' in routerOutlet) {
                    const route = (routerOutlet as any).activatedRoute;
                    return route ?? null;
                }
            }

            // Move to parent
            currentElement = currentElement.parentElement;
            depth++;
        }

        // Fallback to global stack
        const stack = window.__quarc?.activatedRouteStack;
        if (stack && stack.length > 0) {
            const route = stack[stack.length - 1];
            return route;
        }

        return null;
    }


    static create(componentType: ComponentType<IComponent>, selector?: string): WebComponent {
        const targetSelector = selector ?? ComponentUtils.getSelector(componentType);
        const tagName = ComponentUtils.selectorToTagName(targetSelector);

        this.registerWithDependencies(componentType);

        let element = document.querySelector(tagName) as WebComponent;

        if (!element) {
            element = document.createElement(tagName) as WebComponent;
            document.body.appendChild(element);
        }

        return element;
    }

    static createInElement(componentType: ComponentType<IComponent>, parent: HTMLElement): WebComponent {
        const tagName = ComponentUtils.selectorToTagName(ComponentUtils.getSelector(componentType));

        this.registerWithDependencies(componentType);

        const element = document.createElement(tagName) as WebComponent;
        parent.appendChild(element);

        return element;
    }

    static createFromElement(componentType: ComponentType<IComponent>, element: HTMLElement): WebComponent {
        const tagName = ComponentUtils.selectorToTagName(ComponentUtils.getSelector(componentType));

        this.registerWithDependencies(componentType);

        if (element.tagName.toLowerCase() === tagName) {
            const webComponent = element as WebComponent;
            // Jeśli element już jest w DOM, ręcznie zainicjalizuj komponent
            if (!webComponent.isInitialized()) {
                const instance = this.createComponentInstance(componentType, webComponent);
                webComponent.setComponentInstance(instance, componentType);
            }
            return webComponent;
        }

        const newElement = document.createElement(tagName) as WebComponent;
        element.replaceWith(newElement);

        return newElement;
    }

    static isRegistered(selector: string): boolean {
        const tagName = ComponentUtils.selectorToTagName(selector);
        return this.registeredComponents.has(tagName);
    }

    static getRegisteredTagName(selector: string): string | undefined {
        const tagName = ComponentUtils.selectorToTagName(selector);
        return this.registeredComponents.has(tagName) ? tagName : undefined;
    }

    }

export function createWebComponent(
    componentType: ComponentType<IComponent>,
    selectorOrElement?: string | HTMLElement,
): WebComponent {
    if (!selectorOrElement) {
        return WebComponentFactory.create(componentType);
    }

    if (typeof selectorOrElement === 'string') {
        return WebComponentFactory.create(componentType, selectorOrElement);
    }

    return WebComponentFactory.createFromElement(componentType, selectorOrElement);
}
