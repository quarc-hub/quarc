import '../global';
import type { InternalEffectRef } from '../global';

const SIGNAL = Symbol('signal');

function getCurrentEffect(): InternalEffectRef | null {
    return window.__quarc.currentEffect ?? null;
}

function setCurrentEffect(effect: InternalEffectRef | null): void {
    window.__quarc.currentEffect = effect;
}

export type Signal<T> = (() => T) & {
    [SIGNAL]: true;
};

export interface WritableSignal<T> extends Signal<T> {
    set(value: T): void;
    update(updateFn: (value: T) => T): void;
    asReadonly(): Signal<T>;
}

export interface EffectRef {
    destroy(): void;
}

export interface CreateSignalOptions<T> {
    equal?: (a: T, b: T) => boolean;
}

export interface CreateEffectOptions {
    manualCleanup?: boolean;
}

export function signal<T>(initialValue: T, options?: CreateSignalOptions<T>): WritableSignal<T> {
    let value = initialValue;
    const subscribers = new Set<InternalEffectRef>();
    const equal = options?.equal ?? Object.is;

    const getter = (() => {
        const current = getCurrentEffect();
        if (current) {
            subscribers.add(current);
        }
        return value;
    }) as WritableSignal<T>;

    (getter as any)[SIGNAL] = true;

    getter.set = (newValue: T) => {
        if (!equal(value, newValue)) {
            value = newValue;
            notifySubscribers(subscribers);
        }
    };

    getter.update = (updateFn: (value: T) => T) => {
        getter.set(updateFn(value));
    };

    getter.asReadonly = (): Signal<T> => {
        const readonlyGetter = (() => getter()) as Signal<T>;
        (readonlyGetter as any)[SIGNAL] = true;
        return readonlyGetter;
    };

    return getter;
}

export function computed<T>(computation: () => T, options?: CreateSignalOptions<T>): Signal<T> {
    let cachedValue: T;
    let isDirty = true;
    const subscribers = new Set<InternalEffectRef>();
    const equal = options?.equal ?? Object.is;

    const internalEffect: InternalEffectRef = {
        destroy: () => {},
        _run: () => {
            isDirty = true;
            notifySubscribers(subscribers);
        },
    };

    const recompute = () => {
        const previousEffect = getCurrentEffect();
        setCurrentEffect(internalEffect);

        try {
            const newValue = computation();
            if (!equal(cachedValue, newValue)) {
                cachedValue = newValue;
            }
        } finally {
            setCurrentEffect(previousEffect);
        }

        isDirty = false;
    };

    recompute();

    const getter = (() => {
        const current = getCurrentEffect();
        if (current) {
            subscribers.add(current);
        }

        if (isDirty) {
            recompute();
        }

        return cachedValue;
    }) as Signal<T>;

    (getter as any)[SIGNAL] = true;

    return getter;
}

export function effect(effectFn: () => void, options?: CreateEffectOptions): EffectRef {
    let isDestroyed = false;

    const runEffect = () => {
        if (isDestroyed) return;

        const previousEffect = getCurrentEffect();
        setCurrentEffect(effectRef);

        try {
            effectFn();
        } finally {
            setCurrentEffect(previousEffect);
        }
    };

    const effectRef: InternalEffectRef = {
        destroy: () => {
            isDestroyed = true;
        },
        _run: runEffect,
    };

    runEffect();

    return effectRef;
}

function notifySubscribers(subscribers: Set<InternalEffectRef>) {
    const toRun = Array.from(subscribers);
    for (const subscriber of toRun) {
        subscriber._run?.();
    }
}