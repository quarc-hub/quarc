import { ComponentOptions, DirectiveOptions } from '../index';

export interface Type<T> {
    new(...args: any[]): T;
}

export interface ComponentType<T> extends Type<T> {
    _quarcComponent: [ComponentOptions];
    _quarcDirectives?: DirectiveType<any>[];
    _quarcPipes?: Type<any>[];
    _scopeId: string;
}

export interface DirectiveType<T> extends Type<T> {
    _quarcDirective: [DirectiveOptions];
}
