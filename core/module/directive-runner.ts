import {
    DirectiveType,
    DirectiveRegistry,
    Injector,
    LocalProvider,
    IDirective,
    effect,
    EffectRef,
    WritableSignal,
} from '../index';
import { ActivatedRoute } from '../../router/angular/types';
import { WebComponent } from './web-component';

export interface DirectiveInstance {
    directive: IDirective;
    element: HTMLElement;
    type: DirectiveType<any>;
    effects: EffectRef[];
}

export class DirectiveRunner {
    private static registry = DirectiveRegistry.get();

    static apply(
        hostElement: HTMLElement,
        scopeId: string,
        directiveTypes: DirectiveType<any>[],
    ): DirectiveInstance[] {
        const instances: DirectiveInstance[] = [];

        for (const directiveType of directiveTypes) {
            this.registry.register(directiveType);
        }

        for (const directiveType of directiveTypes) {
            const selector = directiveType._quarcDirective?.[0]?.selector;
            if (!selector) continue;

            const scopedSelector = `[_ngcontent-${scopeId}]${selector}`;
            const dataBindSelector = this.convertToDataBindSelector(selector, scopeId);
            const combinedSelector = `${scopedSelector}, ${dataBindSelector}`;
            const elements = hostElement.querySelectorAll(combinedSelector);

            for (const el of Array.from(elements)) {
                const instance = this.createDirectiveForElement(
                    directiveType,
                    el as HTMLElement,
                );
                if (instance) {
                    instances.push(instance);
                }
            }
        }

        return instances;
    }

    private static createDirectiveForElement(
        directiveType: DirectiveType<any>,
        element: HTMLElement,
    ): DirectiveInstance | null {
        const injector = Injector.get();
        const localProviders: LocalProvider[] = [
            { provide: HTMLElement, useValue: element },
        ];

        const activatedRoute = this.findActivatedRouteFromElement(element);
        localProviders.push({ provide: ActivatedRoute, useValue: activatedRoute });

        const directive = injector.createInstanceWithProviders<IDirective>(
            directiveType,
            localProviders,
        );

        (directive as any)._nativeElement = element;

        const instance: DirectiveInstance = {
            directive,
            element,
            type: directiveType,
            effects: [],
        };

        this.bindInputs(instance, element);
        this.bindHostListeners(instance, element);
        this.bindHostBindings(instance, element);

        if (directive.ngOnInit) {
            directive.ngOnInit();
        }

        return instance;
    }

    private static bindInputs(instance: DirectiveInstance, element: HTMLElement): void {
        const options = instance.type._quarcDirective?.[0];
        const inputs = options?.inputs ?? [];
        const directive = instance.directive as any;

        for (const inputName of inputs) {
            const attrValue = element.getAttribute(`[${inputName}]`) ?? element.getAttribute(inputName);
            if (attrValue !== null) {
                if (typeof directive[inputName] === 'function' && directive[inputName].set) {
                    directive[inputName].set(attrValue);
                } else {
                    directive[inputName] = attrValue;
                }
            }
        }

    }

    private static bindHostListeners(instance: DirectiveInstance, element: HTMLElement): void {
        const directive = instance.directive as any;
        const proto = Object.getPrototypeOf(directive);

        if (!proto.__hostListeners) return;

        for (const [eventName, methodName] of Object.entries(proto.__hostListeners as Record<string, string>)) {
            const handler = (event: Event) => {
                if (typeof directive[methodName] === 'function') {
                    directive[methodName](event);
                }
            };
            element.addEventListener(eventName, handler);
        }
    }

    private static bindHostBindings(instance: DirectiveInstance, element: HTMLElement): void {
        const directive = instance.directive as any;
        const proto = Object.getPrototypeOf(directive);

        if (!proto.__hostBindings) return;

        for (const [propertyName, hostProperty] of Object.entries(proto.__hostBindings as Record<string, string>)) {
            const eff = effect(() => {
                const value = typeof directive[propertyName] === 'function'
                    ? directive[propertyName]()
                    : directive[propertyName];

                if (hostProperty.startsWith('class.')) {
                    const className = hostProperty.slice(6);
                    value ? element.classList.add(className) : element.classList.remove(className);
                } else if (hostProperty.startsWith('style.')) {
                    const styleProp = hostProperty.slice(6);
                    element.style.setProperty(styleProp, value ?? '');
                } else if (hostProperty.startsWith('attr.')) {
                    const attrName = hostProperty.slice(5);
                    value != null ? element.setAttribute(attrName, String(value)) : element.removeAttribute(attrName);
                } else {
                    (element as any)[hostProperty] = value;
                }
            });
            instance.effects.push(eff);
        }
    }

    static destroyInstances(instances: DirectiveInstance[]): void {
        for (const instance of instances) {
            for (const eff of instance.effects) {
                eff.destroy();
            }

            if (instance.directive.ngOnDestroy) {
                instance.directive.ngOnDestroy();
            }
        }
    }

    private static convertToDataBindSelector(selector: string, scopeId: string): string {
        const attrMatch = selector.match(/^\[(\w+)\]$/);
        if (attrMatch) {
            const attrName = attrMatch[1];
            const kebabName = this.camelToKebab(attrName);
            return `[_ngcontent-${scopeId}][${kebabName}]`;
        }
        return `[_ngcontent-${scopeId}]${selector}`;
    }

    private static camelToKebab(str: string): string {
        return str.replace(/([a-z])([A-Z])/g, '$1-$2').toLowerCase();
    }

    private static findActivatedRouteFromElement(element: HTMLElement): ActivatedRoute | null {
        // Start from the directive's element and go up to find router-outlet
        let currentElement: Element | null = element;

        while (currentElement) {
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
        }

        // Fallback to global stack
        const stack = window.__quarc?.activatedRouteStack;
        if (stack && stack.length > 0) {
            const route = stack[stack.length - 1];
            return route;
        }

        return null;
    }
}
