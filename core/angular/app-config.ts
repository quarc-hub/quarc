export interface Provider {
    provide: any;
    useValue?: any;
    useFactory?: any;
    useExisting?: any;
    useClass?: any;
    multi?: boolean;
}

export interface EnvironmentProviders {
}

export type Providers = Provider | EnvironmentProviders;

export interface ApplicationConfig {
    providers: Providers[];
    externalUrls?: string | string[];
    enablePlugins?: boolean;
}

export type PluginRoutingMode = 'root' | 'internal';

export interface PluginConfig {
    providers?: Providers[];
    routingMode?: PluginRoutingMode;
    styleUrl?: string;
}
