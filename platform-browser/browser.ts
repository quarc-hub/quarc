import { Core, Type, ComponentType, ApplicationConfig, PluginConfig, WebComponentFactory } from "../core";
import { PluginConfig as GlobalPluginConfig } from "../core/global";
import "../core/global";

function loadStylesheet(url: string, pluginId: string): void {
    const existingLink = document.querySelector(`link[data-plugin-id="${pluginId}"]`);
    if (existingLink) {
        return;
    }

    const link = document.createElement("link");
    link.rel = "stylesheet";
    link.href = url;
    link.dataset.pluginId = pluginId;
    document.head.appendChild(link);
}

function loadExternalScript(url: string): Promise<void> {
    return new Promise((resolve, reject) => {
        const script = document.createElement("script");
        script.src = url;
        script.type = "module";
        script.async = true;
        script.onload = () => resolve();
        script.onerror = () => reject(new Error(`Failed to load: ${url}`));
        document.head.appendChild(script);
    });
}

async function tryLoadExternalScripts(urls: string | string[]): Promise<void> {
    const urlList = Array.isArray(urls) ? urls : [urls];

    for (const url of urlList) {
        try {
            await loadExternalScript(url);
            return;
        } catch {
        }
    }
}

export async function bootstrapApplication(
    component: Type<unknown>,
    options?: ApplicationConfig | undefined,
): Promise<unknown> {
    const instance = Core.bootstrap(component as ComponentType<any>, options?.providers);

    if (options?.externalUrls) {
        tryLoadExternalScripts(options.externalUrls);
    }

    if (options?.enablePlugins) {
        window.__quarc ??= {};
        window.__quarc.Core = Core;
        window.__quarc.plugins ??= {};
    }

    return instance;
}

export async function bootstrapPlugin(
    pluginId: string,
    component: Type<unknown>,
    options?: PluginConfig | undefined,
): Promise<string> {
    const componentType = component as ComponentType<any>;
    const selector = componentType._quarcComponent?.[0]?.selector;

    if (!selector) {
        throw new Error(`Plugin component must have a selector defined`);
    }

    window.__quarc.plugins ??= {};
    window.__quarc.plugins[pluginId] ??= {};
    window.__quarc.plugins[pluginId].component = component;
    window.__quarc.plugins[pluginId].selector = selector;
    window.__quarc.plugins[pluginId].routingMode = options?.routingMode ?? 'internal';

    if (options?.styleUrl) {
        window.__quarc.plugins[pluginId].styleUrl = options.styleUrl;
        loadStylesheet(options.styleUrl, pluginId);
    }

    WebComponentFactory.registerWithDependencies(componentType);

    return selector;
}