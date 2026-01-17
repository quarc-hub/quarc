import { Injector } from "../module/injector";
import { Type } from "../index";

let currentInjector: Injector | null = null;

export function setCurrentInjector(injector: Injector | null): void {
    currentInjector = injector;
}

export function inject<T>(token: Type<T> | string): T {
    if (!currentInjector) {
        currentInjector = Injector.get();
    }

    const tokenName = typeof token === 'string' ? token : (token as any).__quarc_original_name__ || token.name;

    const sharedInstances = (currentInjector as any).sharedInstances || {};
    if (sharedInstances[tokenName]) {
        return sharedInstances[tokenName];
    }

    const instanceCache = (currentInjector as any).instanceCache || {};
    if (instanceCache[tokenName]) {
        return instanceCache[tokenName];
    }

    if (typeof token === 'string') {
        throw new Error(`[inject] Cannot resolve string token "${token}" - no instance found in cache`);
    }

    return currentInjector.createInstance(token);
}
