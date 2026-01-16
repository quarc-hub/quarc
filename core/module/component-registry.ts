import { ComponentType, IComponent, WebComponent } from '../index';

export interface ComponentMetadata {
    type: ComponentType<IComponent>;
    instance?: IComponent;
    webComponent?: WebComponent;
    loaded: boolean;
    dependencies: ComponentType<IComponent>[] | any[];
}

export class ComponentRegistry {
    private static instance: ComponentRegistry;
    private components = new Map<ComponentType<IComponent>, ComponentMetadata>();
    private componentsBySelector = new Map<string, ComponentType<IComponent>>();

    private constructor() {}

    static get(): ComponentRegistry {
        if (!ComponentRegistry.instance) {
            ComponentRegistry.instance = new ComponentRegistry();
        }
        return ComponentRegistry.instance;
    }

    register(type: ComponentType<IComponent>, instance?: IComponent): void {
        const dependencies = type._quarcComponent[0].imports || [];

        this.components.set(type, {
            type,
            instance,
            loaded: false,
            dependencies,
        });

        this.componentsBySelector.set(type._quarcComponent[0].selector, type);
    }

    markAsLoaded(type: ComponentType<IComponent>, webComponent: WebComponent): void {
        const metadata = this.components.get(type);
        if (metadata) {
            metadata.loaded = true;
            metadata.webComponent = webComponent;
        }
    }

    isLoaded(type: ComponentType<IComponent>): boolean {
        return this.components.get(type)?.loaded ?? false;
    }

    getMetadata(type: ComponentType<IComponent>): ComponentMetadata | undefined {
        return this.components.get(type);
    }

    getBySelector(selector: string): ComponentMetadata | undefined {
        const type = this.componentsBySelector.get(selector);
        return type ? this.components.get(type) : undefined;
    }

    getWebComponent(type: ComponentType<IComponent>): WebComponent | undefined {
        return this.components.get(type)?.webComponent;
    }

    getDependencies(type: ComponentType<IComponent>): ComponentType<IComponent>[] {
        return this.components.get(type)?.dependencies ?? [];
    }

    getAllDependencies(type: ComponentType<IComponent>): ComponentType<IComponent>[] {
        const visited = new Set<ComponentType<IComponent>>();
        const dependencies: ComponentType<IComponent>[] = [];

        const collectDependencies = (componentType: ComponentType<IComponent>) => {
            if (visited.has(componentType)) return;
            visited.add(componentType);

            const deps = this.getDependencies(componentType);
            deps.forEach(dep => {
                dependencies.push(dep);
                collectDependencies(dep);
            });
        };

        collectDependencies(type);
        return dependencies;
    }

    clear(): void {
        this.components.clear();
        this.componentsBySelector.clear();
    }

    getAll(): ComponentMetadata[] {
        return Array.from(this.components.values());
    }
}
