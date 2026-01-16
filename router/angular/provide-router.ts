import { EnvironmentProviders, Injector, PluginRoutingMode } from "../../core";
import { Routes } from "./types";
import { Router } from "./router";
import "../../core/global";
import { RouterLink } from "../directives/router-link.directive";

export interface PluginRouterOptions {
    pluginId: string;
    routingMode?: PluginRoutingMode;
}

export function provideRouter(routes: Routes, options?: PluginRouterOptions): EnvironmentProviders {
    const injector = Injector.get();

    if (!window.__quarc.router) {
        window.__quarc.router ??= new Router(routes);;
    } else {
        if (options?.pluginId) {
            window.__quarc.plugins ??= {};
            window.__quarc.plugins[options.pluginId] ??= {};
            window.__quarc.plugins[options.pluginId].routes = routes;
            window.__quarc.plugins[options.pluginId].routingMode = options.routingMode ?? 'internal';

            if (options.routingMode === 'root') {
                window.__quarc.router.resetConfig([
                    ...window.__quarc.router.config,
                    ...routes,
                ]);
            }
        } else {
            window.__quarc.router.resetConfig([
                ...window.__quarc.router.config,
                ...routes,
            ]);
        }

        // Ensure the existing router is also shared for plugins
    }

    injector.registerShared(Router, window.__quarc.router);
    injector.registerShared(RouterLink, RouterLink);

    return window.__quarc.router;
}
