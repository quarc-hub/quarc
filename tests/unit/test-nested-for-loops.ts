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

function assertDeepEqual<T>(actual: T, expected: T, message?: string): void {
    if (JSON.stringify(actual) !== JSON.stringify(expected)) {
        throw new Error(
            `${message || 'Assertion failed'}\nExpected: ${JSON.stringify(expected)}\nActual: ${JSON.stringify(actual)}`,
        );
    }
}

console.log('\n=== TESTY ZAGNIEŻDŻONYCH PĘTLI FOR ===\n');

interface LayoutLine {
    id: number;
    items: { id: number; name: string }[];
}

interface Layout {
    lines: LayoutLine[];
    width: number;
    height: number;
}

test('nested-for: iteracja po tablicy linii i elementów wewnątrz', () => {
    const layout = signal<Layout>({
        lines: [
            { id: 1, items: [{ id: 101, name: 'item1' }, { id: 102, name: 'item2' }] },
            { id: 2, items: [{ id: 201, name: 'item3' }] },
        ],
        width: 100,
        height: 100,
    });

    const renderedItems: string[] = [];

    effect(() => {
        renderedItems.length = 0;
        for (const line of layout().lines) {
            for (const item of line.items) {
                renderedItems.push(`line${line.id}-${item.name}`);
            }
        }
    });

    assertDeepEqual(renderedItems, ['line1-item1', 'line1-item2', 'line2-item3']);
});

test('nested-for: aktualizacja po zmianie zewnętrznej tablicy', () => {
    const layout = signal<Layout>({
        lines: [
            { id: 1, items: [{ id: 101, name: 'a' }] },
        ],
        width: 100,
        height: 100,
    });

    const renderedItems: string[] = [];

    effect(() => {
        renderedItems.length = 0;
        for (const line of layout().lines) {
            for (const item of line.items) {
                renderedItems.push(item.name);
            }
        }
    });

    assertEqual(renderedItems.length, 1);

    layout.set({
        lines: [
            { id: 1, items: [{ id: 101, name: 'a' }] },
            { id: 2, items: [{ id: 201, name: 'b' }, { id: 202, name: 'c' }] },
        ],
        width: 100,
        height: 100,
    });

    assertEqual(renderedItems.length, 3);
    assertDeepEqual(renderedItems, ['a', 'b', 'c']);
});

test('nested-for: aktualizacja po zmianie wewnętrznej tablicy', () => {
    const layout = signal<Layout>({
        lines: [
            { id: 1, items: [{ id: 101, name: 'x' }] },
        ],
        width: 100,
        height: 100,
    });

    const renderedItems: string[] = [];

    effect(() => {
        renderedItems.length = 0;
        for (const line of layout().lines) {
            for (const item of line.items) {
                renderedItems.push(item.name);
            }
        }
    });

    assertEqual(renderedItems.length, 1);

    layout.set({
        lines: [
            { id: 1, items: [{ id: 101, name: 'x' }, { id: 102, name: 'y' }, { id: 103, name: 'z' }] },
        ],
        width: 100,
        height: 100,
    });

    assertEqual(renderedItems.length, 3);
    assertDeepEqual(renderedItems, ['x', 'y', 'z']);
});

test('nested-for: computed zliczający elementy w zagnieżdżonych tablicach', () => {
    const layout = signal<Layout>({
        lines: [
            { id: 1, items: [{ id: 101, name: 'a' }, { id: 102, name: 'b' }] },
            { id: 2, items: [{ id: 201, name: 'c' }] },
        ],
        width: 100,
        height: 100,
    });

    const totalItems = computed(() => {
        let count = 0;
        for (const line of layout().lines) {
            count += line.items.length;
        }
        return count;
    });

    assertEqual(totalItems(), 3);

    layout.set({
        lines: [
            { id: 1, items: [{ id: 101, name: 'a' }] },
        ],
        width: 100,
        height: 100,
    });

    assertEqual(totalItems(), 1);
});

test('nested-for: symulacja renderowania DOM z zagnieżdżonymi pętlami', () => {
    const layout = signal<Layout>({
        lines: [],
        width: 0,
        height: 0,
    });

    const domStructure: { lineId: number; itemIds: number[] }[] = [];

    effect(() => {
        domStructure.length = 0;
        for (const line of layout().lines) {
            const lineEntry = { lineId: line.id, itemIds: [] as number[] };
            for (const item of line.items) {
                lineEntry.itemIds.push(item.id);
            }
            domStructure.push(lineEntry);
        }
    });

    assertEqual(domStructure.length, 0);

    layout.set({
        lines: [
            { id: 1, items: [{ id: 10, name: 'a' }, { id: 11, name: 'b' }] },
            { id: 2, items: [{ id: 20, name: 'c' }] },
            { id: 3, items: [] },
        ],
        width: 800,
        height: 600,
    });

    assertEqual(domStructure.length, 3);
    assertDeepEqual(domStructure[0], { lineId: 1, itemIds: [10, 11] });
    assertDeepEqual(domStructure[1], { lineId: 2, itemIds: [20] });
    assertDeepEqual(domStructure[2], { lineId: 3, itemIds: [] });
});

test('nested-for: wielokrotne aktualizacje zagnieżdżonych danych', () => {
    const layout = signal<Layout>({
        lines: [{ id: 1, items: [{ id: 1, name: 'initial' }] }],
        width: 100,
        height: 100,
    });

    let renderCount = 0;
    const lastRendered: string[] = [];

    effect(() => {
        renderCount++;
        lastRendered.length = 0;
        for (const line of layout().lines) {
            for (const item of line.items) {
                lastRendered.push(item.name);
            }
        }
    });

    assertEqual(renderCount, 1);
    assertDeepEqual(lastRendered, ['initial']);

    layout.set({
        lines: [{ id: 1, items: [{ id: 1, name: 'update1' }] }],
        width: 100,
        height: 100,
    });

    assertEqual(renderCount, 2);
    assertDeepEqual(lastRendered, ['update1']);

    layout.set({
        lines: [
            { id: 1, items: [{ id: 1, name: 'a' }, { id: 2, name: 'b' }] },
            { id: 2, items: [{ id: 3, name: 'c' }] },
        ],
        width: 200,
        height: 200,
    });

    assertEqual(renderCount, 3);
    assertDeepEqual(lastRendered, ['a', 'b', 'c']);
});

test('nested-for: trzy poziomy zagnieżdżenia', () => {
    interface DeepLayout {
        sections: {
            id: number;
            rows: {
                id: number;
                cells: { id: number; value: string }[];
            }[];
        }[];
    }

    const deepLayout = signal<DeepLayout>({
        sections: [
            {
                id: 1,
                rows: [
                    { id: 11, cells: [{ id: 111, value: 'A' }, { id: 112, value: 'B' }] },
                    { id: 12, cells: [{ id: 121, value: 'C' }] },
                ],
            },
            {
                id: 2,
                rows: [
                    { id: 21, cells: [{ id: 211, value: 'D' }] },
                ],
            },
        ],
    });

    const allValues: string[] = [];

    effect(() => {
        allValues.length = 0;
        for (const section of deepLayout().sections) {
            for (const row of section.rows) {
                for (const cell of row.cells) {
                    allValues.push(cell.value);
                }
            }
        }
    });

    assertDeepEqual(allValues, ['A', 'B', 'C', 'D']);

    deepLayout.set({
        sections: [
            {
                id: 1,
                rows: [
                    { id: 11, cells: [{ id: 111, value: 'X' }, { id: 112, value: 'Y' }, { id: 113, value: 'Z' }] },
                ],
            },
        ],
    });

    assertDeepEqual(allValues, ['X', 'Y', 'Z']);
});

test('nested-for: pusta tablica zewnętrzna', () => {
    const layout = signal<Layout>({
        lines: [],
        width: 0,
        height: 0,
    });

    const renderedItems: string[] = [];

    effect(() => {
        renderedItems.length = 0;
        for (const line of layout().lines) {
            for (const item of line.items) {
                renderedItems.push(item.name);
            }
        }
    });

    assertEqual(renderedItems.length, 0);

    layout.set({
        lines: [{ id: 1, items: [{ id: 1, name: 'first' }] }],
        width: 100,
        height: 100,
    });

    assertEqual(renderedItems.length, 1);
    assertEqual(renderedItems[0], 'first');
});

test('nested-for: puste tablice wewnętrzne', () => {
    const layout = signal<Layout>({
        lines: [
            { id: 1, items: [] },
            { id: 2, items: [] },
        ],
        width: 100,
        height: 100,
    });

    let lineCount = 0;
    let itemCount = 0;

    effect(() => {
        lineCount = 0;
        itemCount = 0;
        for (const line of layout().lines) {
            lineCount++;
            for (const item of line.items) {
                itemCount++;
            }
        }
    });

    assertEqual(lineCount, 2);
    assertEqual(itemCount, 0);

    layout.set({
        lines: [
            { id: 1, items: [{ id: 1, name: 'a' }] },
            { id: 2, items: [] },
            { id: 3, items: [{ id: 2, name: 'b' }, { id: 3, name: 'c' }] },
        ],
        width: 100,
        height: 100,
    });

    assertEqual(lineCount, 3);
    assertEqual(itemCount, 3);
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
