import { Type } from "../index";
import { Provider } from "../angular/app-config";


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
        return this.createInstanceWithProviders(classType, []);
    }

    private findProvider(token: any, providers: Provider[]): Provider | undefined {
        const tokenName = typeof token === 'string' ? token : (token as any).__quarc_original_name__ || token.name;

        return providers.find(p => {
            const providerName = typeof p.provide === 'string'
                ? p.provide
                : (p.provide as any).__quarc_original_name__ || p.provide.name;
            return providerName === tokenName;
        });
    }

    private resolveProviderValue(provider: Provider, providers: Provider[]): any {
        if ('useValue' in provider) {
            return provider.useValue;
        } else if ('useFactory' in provider && provider.useFactory) {
            return provider.useFactory();
        } else if ('useExisting' in provider && provider.useExisting) {
            const existingToken = provider.useExisting;
            const existingProvider = this.findProvider(existingToken, providers);
            if (existingProvider) {
                return this.resolveProviderValue(existingProvider, providers);
            }
            const existingKey = typeof existingToken === 'string'
                ? existingToken
                : (existingToken as any).__quarc_original_name__ || existingToken.name;
            return this.sharedInstances[existingKey] || this.instanceCache[existingKey];
        } else if ('useClass' in provider && provider.useClass) {
            return this.createInstanceWithProviders(provider.useClass, providers);
        }
        return undefined;
    }

    public createInstanceWithProviders<T>(classType: Type<T>, providers: Provider[]): T {
        if (!classType) {
            throw new Error(`[DI] createInstanceWithProviders called with undefined classType`);
        }

        try {
            console.log({
                className: (classType as any).__quarc_original_name__ || classType.name,
                classType,
            });
            const dependencies = this.resolveDependenciesWithProviders(classType, providers);
            /** /
            console.log({
                className: (classType as any).__quarc_original_name__ || classType.name,
                providers,
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

    private resolveDependenciesWithProviders(classType: Type<any>, providers: Provider[]): any[] {
        const tokens = this.getConstructorParameterTypes(classType);

        return tokens.map(token => {
            return this.resolveDependency(token, providers);
        });
    }

    private resolveDependency(token: any, providers: Provider[]): any {
        const tokenName = typeof token === 'string' ? token : (token as any).__quarc_original_name__ || token.name;

        const provider = this.findProvider(token, providers);
        if (provider) {
            return this.resolveProviderValue(provider, providers);
        }

        if (this.sharedInstances[tokenName]) {
            return this.sharedInstances[tokenName];
        }

        if (this.instanceCache[tokenName]) {
            return this.instanceCache[tokenName];
        }

        return this.createInstanceWithProviders(token, providers);
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
