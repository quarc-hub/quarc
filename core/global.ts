import { Type } from "./module/type";
import { Routes, ActivatedRoute } from "../router";
import { Core } from "./core";
import { Router } from "../router/angular/router";
import type { WebComponent } from "./module/web-component";
import type { ComponentType } from "./module/type";
import type { IComponent } from "./module/component";

export type PluginRoutingMode = 'root' | 'internal';

export interface PluginConfig {
    component?: Type<unknown>;
    routes?: Routes;
    routingMode?: PluginRoutingMode;
    selector?: string;
    styleUrl?: string;
}

export interface PendingPluginRoute {
    pluginId: string;
    scriptUrl: string;
    selector?: string;
}

export interface InternalEffectRef {
    destroy(): void;
    _run: () => void;
}

declare global{
    interface Window {
        __quarc: {
            Core?: typeof Core;
            router?: Router;
            plugins?: Record<string, PluginConfig>;
            registeredComponents?: Map<string, typeof WebComponent>;
            componentTypes?: Map<string, ComponentType<IComponent>>;
            webComponentInstances?: Map<string, WebComponent>;
            webComponentIdCounter?: number;
            currentEffect?: InternalEffectRef | null;
            activatedRouteStack?: ActivatedRoute[];
            sharedInstances?: Record<string, any>;
        };
    }
}

window.__quarc ??= {};

export {};