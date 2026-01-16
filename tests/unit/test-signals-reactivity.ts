#!/usr/bin/env node

// Polyfill window dla Node.js
(global as any).window = (global as any).window || { __quarc: {} };
(global as any).window.__quarc = (global as any).window.__quarc || {};

import { signal, computed, effect, WritableSignal, Signal, EffectRef } from '../../core/angular/signals';

interface TestResult {
    name: string;
    passed: boolean;
    error?: string;
}

const results: TestResult[] = [];

function test(name: string, fn: () => void | Promise<void>): void {
    try {
        const result = fn();
        if (result instanceof Promise) {
            result
                .then(() => results.push({ name, passed: true }))
                .catch((e) => results.push({ name, passed: false, error: String(e) }));
        } else {
            results.push({ name, passed: true });
        }
    } catch (e) {
        results.push({ name, passed: false, error: String(e) });
    }
}

function assertEqual<T>(actual: T, expected: T, message?: string): void {
    if (actual !== expected) {
        throw new Error(
            `${message || 'Assertion failed'}\nExpected: ${expected}\nActual: ${actual}`,
        );
    }
}

function assertTrue(condition: boolean, message?: string): void {
    if (!condition) {
        throw new Error(message || 'Expected condition to be true');
    }
}

// ============================================================================
// Signal Tests
// ============================================================================

console.log('\n=== TESTY SYGNAŁÓW I REAKTYWNOŚCI ===\n');

test('signal: tworzy sygnał z wartością początkową', () => {
    const count = signal(0);
    assertEqual(count(), 0);
});

test('signal: set zmienia wartość', () => {
    const count = signal(0);
    count.set(5);
    assertEqual(count(), 5);
});

test('signal: update modyfikuje wartość', () => {
    const count = signal(10);
    count.update(v => v + 5);
    assertEqual(count(), 15);
});

test('signal: asReadonly zwraca readonly signal', () => {
    const count = signal(0);
    const readonly = count.asReadonly();
    assertEqual(readonly(), 0);
    count.set(10);
    assertEqual(readonly(), 10);
    assertTrue(!('set' in readonly), 'readonly signal nie powinien mieć metody set');
});

test('signal: equal option zapobiega niepotrzebnym aktualizacjom', () => {
    let updateCount = 0;
    const obj = signal({ id: 1 }, { equal: (a, b) => a.id === b.id });

    effect(() => {
        obj();
        updateCount++;
    });

    // Poczekaj na pierwszy effect
    return new Promise<void>(resolve => {
        setTimeout(() => {
            const initialCount = updateCount;
            obj.set({ id: 1 }); // Ten sam id - nie powinno triggerować

            setTimeout(() => {
                assertEqual(updateCount, initialCount, 'Nie powinno być dodatkowych aktualizacji');
                resolve();
            }, 50);
        }, 50);
    });
});

// ============================================================================
// Computed Tests
// ============================================================================

test('computed: oblicza wartość z sygnałów', () => {
    const a = signal(2);
    const b = signal(3);
    const sum = computed(() => a() + b());
    assertEqual(sum(), 5);
});

test('computed: aktualizuje się gdy zależności się zmieniają', () => {
    const a = signal(2);
    const b = signal(3);
    const sum = computed(() => a() + b());

    assertEqual(sum(), 5);
    a.set(10);

    // Computed używa microtask do ustawienia isDirty, więc musimy poczekać
    return new Promise<void>(resolve => {
        setTimeout(() => {
            assertEqual(sum(), 13);
            resolve();
        }, 10);
    });
});

test('computed: cachuje wartość', () => {
    let computeCount = 0;
    const a = signal(1);
    const doubled = computed(() => {
        computeCount++;
        return a() * 2;
    });

    doubled();
    doubled();
    doubled();

    assertEqual(computeCount, 1, 'Computed powinien być wywołany tylko raz');
});

test('computed: zagnieżdżone computed', () => {
    const a = signal(2);
    const doubled = computed(() => a() * 2);
    const quadrupled = computed(() => doubled() * 2);

    assertEqual(quadrupled(), 8);
});

// ============================================================================
// Effect Tests
// ============================================================================

test('effect: uruchamia się przy pierwszym wywołaniu', () => {
    let ran = false;
    effect(() => {
        ran = true;
    });

    return new Promise<void>(resolve => {
        setTimeout(() => {
            assertTrue(ran, 'Effect powinien się uruchomić');
            resolve();
        }, 50);
    });
});

test('effect: reaguje na zmiany sygnału', () => {
    const count = signal(0);
    let effectValue = -1;

    effect(() => {
        effectValue = count();
    });

    return new Promise<void>(resolve => {
        setTimeout(() => {
            assertEqual(effectValue, 0);
            count.set(5);

            setTimeout(() => {
                assertEqual(effectValue, 5);
                resolve();
            }, 50);
        }, 50);
    });
});

test('effect: destroy zatrzymuje reakcje', () => {
    const count = signal(0);
    let effectValue = -1;

    const ref = effect(() => {
        effectValue = count();
    });

    return new Promise<void>(resolve => {
        setTimeout(() => {
            assertEqual(effectValue, 0);
            ref.destroy();
            count.set(100);

            setTimeout(() => {
                assertEqual(effectValue, 0, 'Effect nie powinien reagować po destroy');
                resolve();
            }, 50);
        }, 50);
    });
});

test('effect: śledzi wiele sygnałów', () => {
    const a = signal(1);
    const b = signal(2);
    let sum = 0;

    effect(() => {
        sum = a() + b();
    });

    return new Promise<void>(resolve => {
        setTimeout(() => {
            assertEqual(sum, 3);
            a.set(10);

            setTimeout(() => {
                assertEqual(sum, 12);
                b.set(20);

                setTimeout(() => {
                    assertEqual(sum, 30);
                    resolve();
                }, 50);
            }, 50);
        }, 50);
    });
});

test('effect: reaguje na computed', () => {
    const a = signal(2);
    const doubled = computed(() => a() * 2);
    let effectValue = 0;

    effect(() => {
        effectValue = doubled();
    });

    return new Promise<void>(resolve => {
        setTimeout(() => {
            assertEqual(effectValue, 4);
            a.set(5);

            setTimeout(() => {
                assertEqual(effectValue, 10);
                resolve();
            }, 50);
        }, 50);
    });
});

// ============================================================================
// Granular Reactivity Tests
// ============================================================================

test('granular: wiele effects na tym samym sygnale', () => {
    const count = signal(0);
    let effect1Value = -1;
    let effect2Value = -1;

    effect(() => { effect1Value = count(); });
    effect(() => { effect2Value = count() * 2; });

    return new Promise<void>(resolve => {
        setTimeout(() => {
            assertEqual(effect1Value, 0);
            assertEqual(effect2Value, 0);
            count.set(5);

            setTimeout(() => {
                assertEqual(effect1Value, 5);
                assertEqual(effect2Value, 10);
                resolve();
            }, 50);
        }, 50);
    });
});

test('granular: niezależne sygnały nie wpływają na siebie', () => {
    const a = signal(1);
    const b = signal(2);
    let aEffectCount = 0;
    let bEffectCount = 0;

    effect(() => { a(); aEffectCount++; });
    effect(() => { b(); bEffectCount++; });

    return new Promise<void>(resolve => {
        setTimeout(() => {
            const initialA = aEffectCount;
            const initialB = bEffectCount;

            a.set(10);

            setTimeout(() => {
                assertEqual(aEffectCount, initialA + 1, 'Effect A powinien się uruchomić');
                assertEqual(bEffectCount, initialB, 'Effect B nie powinien się uruchomić');
                resolve();
            }, 50);
        }, 50);
    });
});

// ============================================================================
// Template Rendering Scenario Tests
// ============================================================================

test('template: computed aktualizuje się synchronicznie po set na signal', () => {
    const containerDimensions = signal({ width: 0, height: 0 });
    const sizeAttribute = computed(() => {
        const size = containerDimensions();
        return `${size.width} x ${size.height}`;
    });

    assertEqual(sizeAttribute(), '0 x 0');

    containerDimensions.set({ width: 100, height: 200 });

    return new Promise<void>(resolve => {
        setTimeout(() => {
            assertEqual(sizeAttribute(), '100 x 200', 'Computed powinien mieć nową wartość');
            resolve();
        }, 50);
    });
});

test('template: effect reaguje na zmianę computed który zależy od signal', () => {
    const containerDimensions = signal({ width: 0, height: 0 });
    const sizeAttribute = computed(() => {
        const size = containerDimensions();
        return `${size.width} x ${size.height}`;
    });

    let effectValue = '';
    let effectRunCount = 0;

    effect(() => {
        effectValue = sizeAttribute();
        effectRunCount++;
    });

    return new Promise<void>(resolve => {
        setTimeout(() => {
            assertEqual(effectValue, '0 x 0');
            assertEqual(effectRunCount, 1);

            containerDimensions.set({ width: 100, height: 200 });

            setTimeout(() => {
                assertEqual(effectValue, '100 x 200', 'Effect powinien mieć nową wartość z computed');
                assertEqual(effectRunCount, 2, 'Effect powinien się uruchomić ponownie');
                resolve();
            }, 50);
        }, 50);
    });
});

test('template: łańcuch signal -> computed -> computed -> effect', () => {
    const base = signal(10);
    const doubled = computed(() => base() * 2);
    const quadrupled = computed(() => doubled() * 2);

    let effectValue = 0;

    effect(() => {
        effectValue = quadrupled();
    });

    return new Promise<void>(resolve => {
        setTimeout(() => {
            assertEqual(effectValue, 40);

            base.set(5);

            setTimeout(() => {
                assertEqual(effectValue, 20, 'Effect powinien reagować na zmianę w łańcuchu');
                resolve();
            }, 50);
        }, 50);
    });
});

test('template: wielokrotne zmiany signal w krótkim czasie', () => {
    const count = signal(0);
    const doubled = computed(() => count() * 2);

    let effectValues: number[] = [];

    effect(() => {
        effectValues.push(doubled());
    });

    return new Promise<void>(resolve => {
        setTimeout(() => {
            count.set(1);
            count.set(2);
            count.set(3);

            setTimeout(() => {
                const lastValue = effectValues[effectValues.length - 1];
                assertEqual(lastValue, 6, 'Ostatnia wartość powinna być 6');
                resolve();
            }, 100);
        }, 50);
    });
});

test('template: computed z obiektem - Object.is comparison', () => {
    const dimensions = signal({ width: 0, height: 0 });
    let computeCount = 0;

    const formatted = computed(() => {
        computeCount++;
        const d = dimensions();
        return `${d.width}x${d.height}`;
    });

    assertEqual(formatted(), '0x0');
    assertEqual(computeCount, 1);

    // Ustawienie tego samego obiektu - Object.is zwróci false bo to nowy obiekt
    dimensions.set({ width: 0, height: 0 });

    return new Promise<void>(resolve => {
        setTimeout(() => {
            formatted(); // Wymuszamy odczyt
            assertEqual(computeCount, 2, 'Computed powinien się przeliczyć dla nowego obiektu');
            resolve();
        }, 50);
    });
});

// ============================================================================
// Run all tests
// ============================================================================

async function runTests() {
    await new Promise(resolve => setTimeout(resolve, 500));

    console.log('\n=== PODSUMOWANIE ===');

    let passed = 0;
    let failed = 0;

    for (const result of results) {
        if (result.passed) {
            console.log(`✅ ${result.name}`);
            passed++;
        } else {
            console.log(`❌ ${result.name}`);
            console.log(`   Error: ${result.error}`);
            failed++;
        }
    }

    console.log(`\n✅ Testy zaliczone: ${passed}`);
    console.log(`❌ Testy niezaliczone: ${failed}`);
    console.log(`📊 Procent sukcesu: ${((passed / results.length) * 100).toFixed(1)}%`);

    if (failed === 0) {
        console.log('\n🎉 Wszystkie testy przeszły pomyślnie!\n');
    } else {
        console.log('\n❌ Niektóre testy nie przeszły.\n');
        process.exit(1);
    }
}

runTests();
