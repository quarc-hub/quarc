import { Type } from "../index";

export interface LocalProvider {
    provide: Type<any> | any;
    useValue: any;
}

export class Injector {
    private static instance: Injector;
    private instanceCache: Record<string, any> = {};
    private dependencyCache: Record<string, any[]> = {};
    private sharedInstances: Record<string, any>;

    private constructor() {
        this.sharedInstances = this.getSharedInstances();
    }

    private getSharedInstances(): Record<string, any> {
        window.__quarc.sharedInstances ??= {};
        return window.__quarc.sharedInstances;
    }

    public static get(): Injector {
        if (!Injector.instance) {
            Injector.instance = new Injector();
        }
        return Injector.instance;
    }

    public createInstance<T>(classType: Type<T>): T {
        return this.createInstanceWithProviders(classType, {});
    }

    public createInstanceWithProvidersOld<T>(classType: Type<T>, localProviders: Record<string, any>): T {
        if (!classType) {
            throw new Error(`[DI] createInstance called with undefined classType`);
        }

        const key = (classType as any).__quarc_original_name__ || classType.name;
        // Prevent instantiation of built-in classes
        if (key === "HTMLElement") {
            throw new Error(`[DI] Cannot create instance of HTMLElement`);
        }

        // First check local cache
        if (this.instanceCache[key]) {
            return this.instanceCache[key];
        }

        // Then check shared instances (cross-build sharing)
        if (this.sharedInstances[key]) {
            const sharedInstance = this.sharedInstances[key];
            return sharedInstance;
        }

        try {
            const dependencies = this.resolveDependencies(classType);
            const instance = new classType(...dependencies);
            this.instanceCache[key] = instance;
            this.sharedInstances[key] = instance;
            return instance;
        } catch (error) {
            const className = this.getReadableClassName(classType);
            const dependencyInfo = this.getDependencyInfo(classType);
            throw new Error(`[DI] Failed to create instance of "${className}": ${(error as Error).message}\nDependencies: ${dependencyInfo}`);
        }
    }

    private convertLocalProvidersToRecord(localProviders: LocalProvider[]): Record<string, any> {
        const record: Record<string, any> = {};

        for (const provider of localProviders) {
            const key = typeof provider.provide === 'string'
                ? provider.provide
                : (provider.provide as any).__quarc_original_name__ || provider.provide.name;

            record[key] = provider.useValue;
        }

        return record;
    }

    public createInstanceWithProviders<T>(classType: Type<T>, localProviders: Record<string, any>): T;
    public createInstanceWithProviders<T>(classType: Type<T>, localProviders: LocalProvider[]): T;
    public createInstanceWithProviders<T>(classType: Type<T>, localProviders: Record<string, any> | LocalProvider[]): T {
        if (!classType) {
            throw new Error(`[DI] createInstanceWithProviders called with undefined classType`);
        }

        // Convert LocalProvider[] to Record<string, any> if needed
        const providersRecord = Array.isArray(localProviders)
            ? this.convertLocalProvidersToRecord(localProviders)
            : localProviders;

        try {
            const dependencies = this.resolveDependenciesWithProviders(classType, providersRecord);
            /** /
            console.log({
                className: (classType as any).__quarc_original_name__ || classType.name,
                localProviders: providersRecord,
                dependencies,
                classType,
            });
            /**/
            const instance = new classType(...dependencies);
            const key = (classType as any).__quarc_original_name__ || classType.name;
            this.instanceCache[key] = instance;
            return instance;
        } catch (error) {
            const className = this.getReadableClassName(classType);
            const dependencyInfo = this.getDependencyInfo(classType);
            throw new Error(`[DI] Failed to create instance of "${className}" with providers: ${(error as Error).message}\nDependencies: ${dependencyInfo}`);
        }
    }

    private getReadableClassName(classType: Type<any>): string {
        // Try to get original name from static metadata (saved during compilation)
        const staticOriginalName = (classType as any).__quarc_original_name__;
        if (staticOriginalName) {
            return staticOriginalName;
        }

        // Try to get from instance metadata
        const originalName = (classType as any).__quarc_original_name__;
        if (originalName) {
            return originalName;
        }

        // Try to get from constructor name
        const constructorName = classType?.name;
        if (constructorName && constructorName !== 'Unknown' && constructorName.length > 1) {
            return constructorName;
        }

        // Try to get from selector for components/directives
        const metadata = (classType as any)._quarcComponent?.[0] || (classType as any)._quarcDirective?.[0];
        if (metadata?.selector) {
            return `${metadata.selector} (class)`;
        }

        console.log({
            classType,
            metadata,
        });

        return 'Unknown class';
    }

    private getDependencyInfo(classType: Type<any>): string {
        try {
            const paramTypes = this.getConstructorParameterTypes(classType);
            if (paramTypes.length === 0) {
                return 'none';
            }

            const dependencyNames = paramTypes.map((depType, index) => {
                const depName = depType;
                const isUndefined = depType === undefined;
                return isUndefined ? `index ${index}: undefined` : `index ${index}: ${depName}`;
            });

            return dependencyNames.join(', ');
        } catch (depError) {
            return `failed to resolve: ${(depError as Error).message}`;
        }
    }

    private resolveDependencies(classType: Type<any>): any[] {
        const key = (classType as any).__quarc_original_name__ || classType.name;
        if (this.dependencyCache[key]) {
            const cachedDependencies = this.dependencyCache[key]!;
            return cachedDependencies.map(token => {
                if (typeof token === 'string') {
                    // This should not happen in global context
                    throw new Error(`[DI] Cannot resolve string token in global context: ${token}`);
                }
                return this.createInstance(token);
            });
        }

        const tokens = this.getConstructorParameterTypes(classType);
        this.dependencyCache[key] = tokens;

        return tokens.map(token => {
            if (typeof token === 'string') {
                throw new Error(`[DI] Cannot resolve string token in global context: ${token}`);
            }
            return this.createInstance(token);
        });
    }

    private resolveDependenciesWithProviders(classType: Type<any>, localProviders: Record<string, any>): any[] {
        const tokens = this.getConstructorParameterTypes(classType);

        const contextProviders: Record<string, any> = {
            ...this.sharedInstances,
            ...this.instanceCache,
            ...localProviders,
        };

        return tokens.map(token => {
            const dep = this.resolveDependency(token, contextProviders, localProviders);
            const depName = dep.__quarc_original_name__ || dep.name;
            return dep;
        });
    }

    private resolveDependency(token: any, contextProviders: Record<string, any>, localProviders: Record<string, any>): any {
            const tokenName = typeof token === 'string' ? token : (token as any).__quarc_original_name__ || token.name;

            // First check local providers (they have highest priority)
            if (localProviders[tokenName]) {
                const providerValue = localProviders[tokenName];

                // If the provider value is a constructor (type), create a new instance
                if (typeof providerValue === 'function' && providerValue.prototype && providerValue.prototype.constructor === providerValue) {
                    return this.createInstanceWithProviders(providerValue, localProviders);
                }

                return providerValue;
            }

            // Then check other context providers
            if (contextProviders[tokenName]) {
                const providerValue = contextProviders[tokenName];

                // If the provider value is a constructor (type), create a new instance
                if (typeof providerValue === 'function' && providerValue.prototype && providerValue.prototype.constructor === providerValue) {
                    return this.createInstanceWithProviders(providerValue, localProviders);
                }

                return providerValue;
            }

            return this.createInstanceWithProviders(token, localProviders);
    }

    private getConstructorParameterTypes(classType: Type<any>): any[] {
        const className = classType?.name || 'Unknown';

        console.log({
            className,
            classType,
            diParams: (classType as any).__di_params__,
        });

        if (!classType) {
            throw new Error(`[DI] Cannot resolve dependencies: classType is undefined`);
        }

        if ((classType as any).__di_params__) {
            const params = (classType as any).__di_params__;
            for (let i = 0; i < params.length; i++) {
                if (params[i] === undefined) {
                    throw new Error(
                        `[DI] Cannot resolve dependency at index ${i} for class "${className}". ` +
                        `The dependency type is undefined. This usually means:\n` +
                        `  1. Circular dependency between modules\n` +
                        `  2. The dependency class is not exported or imported correctly\n` +
                        `  3. The import is type-only but used for DI`
                    );
                }
            }
            return params;
        }

        const reflectMetadata = (Reflect as any).getMetadata;
        if (reflectMetadata) {
            return reflectMetadata('design:paramtypes', classType) || [];
        }

        return [];
    }

    public register<T>(classType: Type<T>, instance: T | Type<T>): void {
        const key = (classType as any).__quarc_original_name__ || classType.name;
        this.instanceCache[key] = instance;
        console.log('injector register', classType, key, instance);
    }

    public registerShared<T>(classType: Type<T>, instance: T | Type<T>): void {
        const key = (classType as any).__quarc_original_name__ || classType.name;
        console.log('injector registerShared', classType, key, instance);
        this.sharedInstances[key] = instance;
    }

    public clear(): void {
        this.instanceCache = {};
        this.dependencyCache = {};
    }
}
