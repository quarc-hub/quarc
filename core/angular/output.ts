import { IComponent } from '../module/component';

const OUTPUT_EMITTER = Symbol('outputEmitter');

export interface OutputEmitterRef<T> {
    emit(value: T): void;
    [OUTPUT_EMITTER]: true;
}

export interface OutputOptions {
    alias?: string;
}

interface OutputFunction {
    <T = void>(): OutputEmitterRef<T>;
    <T = void>(propertyName: string, component: IComponent, options?: OutputOptions): OutputEmitterRef<T>;
}

function createOutputEmitter<T>(
    propertyName: string,
    component: IComponent,
    options?: OutputOptions,
): OutputEmitterRef<T> {
    const alias = options?.alias ?? propertyName;

    const emitter: OutputEmitterRef<T> = {
        alias,
        component,
        options,
        emit: (value: T) => {
            const element = component._nativeElement;
            if (element) {
                const event = new CustomEvent(alias, {
                    detail: value,
                    bubbles: true,
                    cancelable: true,
                });
                element.dispatchEvent(event);
            }
        },
        [OUTPUT_EMITTER]: true as const,
    };

    return emitter;
}

function outputFn<T = void>(
    propertyNameOrOptions?: string | OutputOptions,
    componentOrOptions?: IComponent | OutputOptions,
    options?: OutputOptions,
): OutputEmitterRef<T> {
    if (typeof propertyNameOrOptions === 'string' && componentOrOptions && '_nativeElement' in (componentOrOptions as any)) {
        return createOutputEmitter<T>(
            propertyNameOrOptions,
            componentOrOptions as IComponent,
            options,
        );
    }

    return createOutputEmitter<T>('', {} as IComponent, propertyNameOrOptions as OutputOptions);
}

export const output: OutputFunction = outputFn;

export function createOutput<T = void>(
    propertyName: string,
    component: IComponent,
    options?: OutputOptions,
): OutputEmitterRef<T> {
    return createOutputEmitter<T>(propertyName, component, options);
}

/**
 * Dekorator Output.
 *
 * Ten dekorator służy wyłącznie do zapewnienia poprawności typów w TypeScript
 * i jest podmieniany podczas kompilacji przez transformery.
 */
export function Output(bindingPropertyName?: string): PropertyDecorator {
    return (target: Object, propertyKey: string | symbol) => {
    };
}
