import type { ComponentType } from "./module/type";
import { Injector } from "./module/injector";
import type { IComponent } from "./module/component";
import { WebComponent } from "./module/web-component";
import { ComponentRegistry } from "./module/component-registry";
import { WebComponentFactory } from "./module/web-component-factory";
import { Providers } from "./angular/app-config";
import "./global";

export class Core {

    static MainComponent: ComponentType<IComponent> | null = null;
    private static mainWebComponent: WebComponent | null = null;

    private injector = Injector.get();
    private registry = ComponentRegistry.get();
    private instance: IComponent;
    private webComponent?: WebComponent;

    private constructor(
        private component: ComponentType<IComponent>
    ) {
        this.registry.register(component);
        this.instance = {} as IComponent; // Instance will be created when element is connected
    }

    public static bootstrap(component: ComponentType<any>, providers?: Providers[], element?: HTMLElement): Core {
        Core.MainComponent = component;

        const instance = new Core(component);

        const registry = ComponentRegistry.get();
        const dependencies = registry.getAllDependencies(component);

        dependencies.forEach(dep => {
            if (!registry.isLoaded(dep)) {
                instance.preloadComponent(dep);
            }
        });

        element ??= document.querySelector(component._quarcComponent[0].selector) as HTMLElement ?? document.body;
        const webComponent = instance.createWebComponent(element);
        Core.mainWebComponent = webComponent;

        registry.markAsLoaded(component, webComponent);

        return instance;
    }

    private preloadComponent(componentType: ComponentType<IComponent>): void {
        this.registry.register(componentType);
    }

    private createWebComponent(element: HTMLElement): WebComponent {
        const webComponent = WebComponentFactory.createFromElement(this.component, element);
        this.webComponent = webComponent;
        return webComponent;
    }

    public static getMainWebComponent(): WebComponent | null {
        return Core.mainWebComponent;
    }

    public getWebComponent(): WebComponent | undefined {
        return this.webComponent;
    }

    public static loadComponent(componentType: ComponentType<IComponent>, element?: HTMLElement): WebComponent {
        const injector = Injector.get();
        const registry = ComponentRegistry.get();

        let metadata = registry.getMetadata(componentType);

        if (!metadata) {
            registry.register(componentType);
            metadata = registry.getMetadata(componentType);
        }

        if (metadata && !metadata.loaded) {
            const targetElement = element ?? document.querySelector(componentType._quarcComponent[0].selector) as HTMLElement;

            if (!targetElement) {
                throw new Error(`Cannot find element for component: ${componentType._quarcComponent[0].selector}`);
            }

            const webComponent = WebComponentFactory.createFromElement(componentType, targetElement);
            registry.markAsLoaded(componentType, webComponent);
            return webComponent;
        }

        return metadata!.webComponent!;
    }

    public static getRegistry(): ComponentRegistry {
        return ComponentRegistry.get();
    }
}
