export interface SizeThreshold {
  warning: string;
  error: string;
}

export interface EnvironmentConfig {
  treatWarningsAsErrors: boolean;
  minifyNames: boolean;
  generateSourceMaps: boolean;
  compressed?: boolean;
  devServer?: DevServerConfig;
}

export interface DevServerConfig {
  port: number;
  websocket?: WebSocketConfig;
}

export interface WebSocketConfig {
  mergeFrom?: string[];
}

export interface StaticLocalPath {
  location: string;
  path: string;
}

export interface StaticRemotePath {
  location: string;
  url: string;
}

export type StaticPath = StaticLocalPath | StaticRemotePath;

export interface ActionsConfig {
  prebuild?: string[];
  postbuild?: string[];
  preserve?: string[];
  postserve?: string[];
}

export interface BuildConfig {
  actions?: ActionsConfig;
  minifyNames: boolean;
  scripts?: string[];
  externalEntryPoints?: string[];
  styles?: string[];
  externalStyles?: string[];
  limits: {
    total: SizeThreshold;
    main: SizeThreshold;
    sourceMaps: SizeThreshold;
    components?: SizeThreshold;
  };
}

export interface ServeConfig {
  actions?: ActionsConfig;
  staticPaths?: StaticPath[];
}

export interface QuarcConfig {
  environment: string;
  build?: BuildConfig;
  serve?: ServeConfig;
  environments: {
    [key: string]: EnvironmentConfig;
  };
}

export interface ValidationResult {
  status: 'success' | 'warning' | 'error';
  message: string;
  actual: number;
  limit: number;
}
