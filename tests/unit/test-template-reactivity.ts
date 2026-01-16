#!/usr/bin/env node

// Polyfill window dla Node.js
(global as any).window = (global as any).window || { __quarc: {} };
(global as any).window.__quarc = (global as any).window.__quarc || {};

import { signal, computed, effect } from '../../core/angular/signals';

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

// Symulacja DOM dla testów
class MockElement {
    attributes: Record<string, string> = {};
    textContent = '';

    setAttribute(name: string, value: string): void {
        this.attributes[name] = value;
    }

    getAttribute(name: string): string | null {
        return this.attributes[name] ?? null;
    }
}

console.log('\n=== TESTY REAKTYWNOŚCI TEMPLATE ===\n');

test('template-reactivity: atrybut aktualizuje się po zmianie sygnału', () => {
    const mockElement = new MockElement();
    const size = signal({ width: 0, height: 0 });
    const sizeAttr = computed(() => `${size().width}x${size().height}`);

    effect(() => {
        mockElement.setAttribute('size', sizeAttr());
    });

    assertEqual(mockElement.getAttribute('size'), '0x0', 'Początkowa wartość atrybutu');

    size.set({ width: 100, height: 200 });

    assertEqual(mockElement.getAttribute('size'), '100x200', 'Atrybut powinien się zaktualizować po set()');
});

test('template-reactivity: textContent aktualizuje się po zmianie sygnału', () => {
    const mockElement = new MockElement();
    const count = signal(0);

    effect(() => {
        mockElement.textContent = `Count: ${count()}`;
    });

    assertEqual(mockElement.textContent, 'Count: 0', 'Początkowa wartość textContent');

    count.set(5);

    assertEqual(mockElement.textContent, 'Count: 5', 'textContent powinien się zaktualizować po set()');
});

test('template-reactivity: łańcuch signal -> computed -> effect aktualizuje DOM', () => {
    const mockElement = new MockElement();
    const items = signal<{ id: number }[]>([]);
    const itemCount = computed(() => items().length);

    effect(() => {
        mockElement.setAttribute('count', String(itemCount()));
    });

    assertEqual(mockElement.getAttribute('count'), '0', 'Początkowa liczba elementów');

    items.set([{ id: 1 }, { id: 2 }, { id: 3 }]);

    assertEqual(mockElement.getAttribute('count'), '3', 'Liczba elementów powinna się zaktualizować');
});

test('template-reactivity: wielokrotne zmiany sygnału aktualizują DOM', () => {
    const mockElement = new MockElement();
    const value = signal('initial');

    effect(() => {
        mockElement.setAttribute('value', value());
    });

    assertEqual(mockElement.getAttribute('value'), 'initial');

    value.set('first');
    assertEqual(mockElement.getAttribute('value'), 'first');

    value.set('second');
    assertEqual(mockElement.getAttribute('value'), 'second');

    value.set('third');
    assertEqual(mockElement.getAttribute('value'), 'third');
});

test('template-reactivity: computed z obiektem aktualizuje DOM po zmianie', () => {
    const mockElement = new MockElement();
    const layout = signal({ lines: [] as { id: number }[], width: 0, height: 0 });
    const lineCount = computed(() => layout().lines.length);

    effect(() => {
        mockElement.setAttribute('lines', String(lineCount()));
    });

    assertEqual(mockElement.getAttribute('lines'), '0');

    layout.set({
        lines: [{ id: 1 }, { id: 2 }],
        width: 100,
        height: 200,
    });

    assertEqual(mockElement.getAttribute('lines'), '2', 'Liczba linii powinna się zaktualizować');
});

test('template-reactivity: wiele effectów na tym samym sygnale aktualizują różne elementy', () => {
    const el1 = new MockElement();
    const el2 = new MockElement();
    const value = signal(10);

    effect(() => {
        el1.setAttribute('value', String(value()));
    });

    effect(() => {
        el2.setAttribute('doubled', String(value() * 2));
    });

    assertEqual(el1.getAttribute('value'), '10');
    assertEqual(el2.getAttribute('doubled'), '20');

    value.set(25);

    assertEqual(el1.getAttribute('value'), '25');
    assertEqual(el2.getAttribute('doubled'), '50');
});

test('template-reactivity: destroy effectu zatrzymuje aktualizacje DOM', () => {
    const mockElement = new MockElement();
    const value = signal('start');

    const effectRef = effect(() => {
        mockElement.setAttribute('value', value());
    });

    assertEqual(mockElement.getAttribute('value'), 'start');

    value.set('changed');
    assertEqual(mockElement.getAttribute('value'), 'changed');

    effectRef.destroy();

    value.set('after-destroy');
    assertEqual(mockElement.getAttribute('value'), 'changed', 'Wartość nie powinna się zmienić po destroy');
});

test('template-reactivity: zagnieżdżone computed aktualizują DOM', () => {
    const mockElement = new MockElement();
    const base = signal(5);
    const doubled = computed(() => base() * 2);
    const quadrupled = computed(() => doubled() * 2);
    const formatted = computed(() => `Value: ${quadrupled()}`);

    effect(() => {
        mockElement.textContent = formatted();
    });

    assertEqual(mockElement.textContent, 'Value: 20');

    base.set(10);

    assertEqual(mockElement.textContent, 'Value: 40');
});

test('template-reactivity: symulacja scenariusza z camera-list', () => {
    const mockContainer = new MockElement();
    const mockPre = new MockElement();

    const containerDimensions = signal({ width: 0, height: 0 });
    const layout = signal({ lines: [] as { id: number }[], width: 0, height: 0, mismatch: 0 });

    const sizeAttribute = computed(() => {
        const size = containerDimensions();
        return `${size.width} x ${size.height}`;
    });

    effect(() => {
        mockContainer.setAttribute('size', sizeAttribute());
    });

    effect(() => {
        mockPre.textContent = `{ lines: ${layout().lines.length}, attribute: ${sizeAttribute()} }`;
    });

    assertEqual(mockContainer.getAttribute('size'), '0 x 0');
    assertEqual(mockPre.textContent, '{ lines: 0, attribute: 0 x 0 }');

    containerDimensions.set({ width: 800, height: 600 });

    assertEqual(mockContainer.getAttribute('size'), '800 x 600', 'Atrybut size powinien się zaktualizować');
    assertEqual(mockPre.textContent, '{ lines: 0, attribute: 800 x 600 }', 'Pre powinien się zaktualizować');

    layout.set({
        lines: [{ id: 1 }, { id: 2 }, { id: 3 }],
        width: 800,
        height: 600,
        mismatch: 0,
    });

    assertEqual(mockPre.textContent, '{ lines: 3, attribute: 800 x 600 }', 'Pre powinien pokazać 3 linie');
});

async function runTests() {
    await new Promise(resolve => setTimeout(resolve, 100));

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
