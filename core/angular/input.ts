import { IComponent } from '../module/component';
import { Signal, WritableSignal } from './signals';

const INPUT_SIGNAL = Symbol('inputSignal');

export interface InputSignal<T> extends Signal<T> {
    [INPUT_SIGNAL]: true;
}

export interface InputOptions<T, TransformT> {
    alias?: string;
    transform?: (value: TransformT) => T;
}

interface InputFunction {
    <T>(): InputSignal<T | undefined>;
    <T>(propertyName: string, component: IComponent): InputSignal<T | undefined>;
    <T>(propertyName: string, component: IComponent, initialValue: T, options?: InputOptions<T, T>): InputSignal<T>;
    <T, TransformT>(propertyName: string, component: IComponent, initialValue: T, options: InputOptions<T, TransformT>): InputSignal<T>;
    required: InputRequiredFunction;
}

interface InputRequiredFunction {
    <T>(): InputSignal<T>;
    <T>(propertyName: string, component: IComponent, options?: InputOptions<T, T>): InputSignal<T>;
    <T, TransformT>(propertyName: string, component: IComponent, options: InputOptions<T, TransformT>): InputSignal<T>;
}

function createInputSignal<T>(
    propertyName: string,
    component: IComponent,
    initialValue: T,
    options?: InputOptions<T, any>,
): InputSignal<T> {
    let currentValue = initialValue;
    const alias = options?.alias ?? propertyName;
    const transform = options?.transform;

    const getter = (() => {
        const element = component._nativeElement;
        const inputSignal = element?.__inputs?.[alias];


        if (inputSignal) {
            const rawValue = inputSignal();
            currentValue = transform ? transform(rawValue) : rawValue;
        } else if (element) {
            const attrValue = element.getAttribute(alias);
            if (attrValue !== null) {
                currentValue = transform ? transform(attrValue as any) : attrValue as any;
            }
        }

        return currentValue;
    }) as InputSignal<T>;

    (getter as any)[INPUT_SIGNAL] = true;

    return getter;
}

function inputFn<T>(
    propertyNameOrInitialValue?: string | T,
    componentOrOptions?: IComponent | InputOptions<T, any>,
    initialValue?: T,
    options?: InputOptions<T, any>,
): InputSignal<T | undefined> {
    if (typeof propertyNameOrInitialValue === 'string' && componentOrOptions && '_nativeElement' in (componentOrOptions as any)) {
        return createInputSignal(
            propertyNameOrInitialValue,
            componentOrOptions as IComponent,
            initialValue as T,
            options,
        );
    }

    return createInputSignal('', {} as IComponent, propertyNameOrInitialValue as T, componentOrOptions as InputOptions<T, any>);
}

function inputRequired<T>(
    propertyNameOrOptions?: string | InputOptions<T, any>,
    componentOrOptions?: IComponent | InputOptions<T, any>,
    options?: InputOptions<T, any>,
): InputSignal<T> {
    if (typeof propertyNameOrOptions === 'string' && componentOrOptions && '_nativeElement' in (componentOrOptions as any)) {
        return createInputSignal(
            propertyNameOrOptions,
            componentOrOptions as IComponent,
            undefined as T,
            options,
        );
    }

    return createInputSignal('', {} as IComponent, undefined as T, propertyNameOrOptions as InputOptions<T, any>);
}

(inputFn as InputFunction).required = inputRequired as InputRequiredFunction;

export const input: InputFunction = inputFn as InputFunction;

export function createInput<T>(
    propertyName: string,
    component: IComponent,
    initialValue?: T,
    options?: InputOptions<T, any>,
): InputSignal<T> {
    return createInputSignal(propertyName, component, initialValue as T, options);
}

export function createRequiredInput<T>(
    propertyName: string,
    component: IComponent,
    options?: InputOptions<T, any>,
): InputSignal<T> {
    return createInputSignal(propertyName, component, undefined as T, options);
}

/**
 * Dekorator Input.
 *
 * Ten dekorator służy wyłącznie do zapewnienia poprawności typów w TypeScript
 * i jest podmieniany podczas kompilacji przez transformery.
 */
export function Input(bindingPropertyName?: string): PropertyDecorator {
    return (target: Object, propertyKey: string | symbol) => {
    };
}
