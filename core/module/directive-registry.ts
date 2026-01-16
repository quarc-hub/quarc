import { DirectiveType, DirectiveOptions } from '../index';

interface DirectiveMetadata {
    type: DirectiveType<any>;
    options: DirectiveOptions;
    selectorMatcher: (element: HTMLElement) => boolean;
}

export class DirectiveRegistry {
    private static instance: DirectiveRegistry;
    private directives = new Map<DirectiveType<any>, DirectiveMetadata>();

    private constructor() {}

    static get(): DirectiveRegistry {
        if (!DirectiveRegistry.instance) {
            DirectiveRegistry.instance = new DirectiveRegistry();
        }
        return DirectiveRegistry.instance;
    }

    register(directiveType: DirectiveType<any>): void {
        if (this.directives.has(directiveType)) {
            return;
        }

        const options = directiveType._quarcDirective?.[0];
        if (!options) {
            return;
        }

        const selectorMatcher = this.createSelectorMatcher(options.selector);

        this.directives.set(directiveType, {
            type: directiveType,
            options,
            selectorMatcher,
        });
    }

    private createSelectorMatcher(selector: string): (element: HTMLElement) => boolean {
        if (selector.startsWith('[') && selector.endsWith(']')) {
            const attrName = selector.slice(1, -1);
            return (el: HTMLElement) => el.hasAttribute(attrName);
        }

        if (selector.startsWith('.')) {
            const className = selector.slice(1);
            return (el: HTMLElement) => el.classList.contains(className);
        }

        if (selector.includes('[')) {
            return (el: HTMLElement) => el.matches(selector);
        }

        return (el: HTMLElement) => el.matches(selector);
    }

    getMatchingDirectives(element: HTMLElement): DirectiveMetadata[] {
        const matching: DirectiveMetadata[] = [];

        for (const metadata of this.directives.values()) {
            if (metadata.selectorMatcher(element)) {
                matching.push(metadata);
            }
        }

        return matching;
    }

    getDirectiveMetadata(directiveType: DirectiveType<any>): DirectiveMetadata | undefined {
        return this.directives.get(directiveType);
    }

    isRegistered(directiveType: DirectiveType<any>): boolean {
        return this.directives.has(directiveType);
    }

    getSelector(directiveType: DirectiveType<any>): string | undefined {
        return this.directives.get(directiveType)?.options.selector;
    }
}
