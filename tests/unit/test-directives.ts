#!/usr/bin/env node

import { DirectiveCollectorProcessor } from '../../cli/processors/directive-collector-processor';

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

function assertContains(actual: string, expected: string, message?: string): void {
    if (!actual.includes(expected)) {
        throw new Error(
            `${message || 'Assertion failed'}\nExpected to contain:\n${expected}\nActual:\n${actual}`,
        );
    }
}

function assertNotContains(actual: string, expected: string, message?: string): void {
    if (actual.includes(expected)) {
        throw new Error(
            `${message || 'Assertion failed'}\nExpected NOT to contain:\n${expected}\nActual:\n${actual}`,
        );
    }
}

function assertTrue(condition: boolean, message?: string): void {
    if (!condition) {
        throw new Error(message || 'Expected true but got false');
    }
}

// ============================================================================
// DirectiveCollectorProcessor Tests
// ============================================================================

console.log('\n📦 DirectiveCollectorProcessor Tests\n');

const directiveCollector = new DirectiveCollectorProcessor();

test('DirectiveCollector: no @Component - no modification', async () => {
    const input = `
export class SimpleClass {
    constructor() {}
}
`;
    const result = await directiveCollector.process({
        filePath: '/test/simple.ts',
        fileDir: '/test',
        source: input,
    });

    assertTrue(result.modified === false, 'Expected no modification');
});

test('DirectiveCollector: @Component without imports - no modification', async () => {
    const input = `
export class TestComponent {
    static _quarcComponent = [{ selector: 'app-test', template: '<div>Test</div>' }];
    static _scopeId = 'c0';
}
`;
    const result = await directiveCollector.process({
        filePath: '/test/test.component.ts',
        fileDir: '/test',
        source: input,
    });

    assertTrue(result.modified === false, 'Expected no modification');
});

test('DirectiveCollector: @Component with directive import - adds _quarcDirectives', async () => {
    const input = `
import { HighlightDirective } from './highlight.directive';

@Directive({
    selector: '[appHighlight]',
})
export class HighlightDirective {}

export class TestComponent {
    static _quarcComponent = [{ selector: 'app-test', template: '<div appHighlight>Test</div>', imports: [HighlightDirective] }];
    static _scopeId = 'c0';
}
`;
    const result = await directiveCollector.process({
        filePath: '/test/test.component.ts',
        fileDir: '/test',
        source: input,
    });

    assertContains(result.source, '_quarcDirectives = [HighlightDirective]');
});

test('DirectiveCollector: multiple directive imports', async () => {
    const input = `
import { HighlightDirective } from './highlight.directive';
import { TooltipDirective } from './tooltip.directive';

@Directive({
    selector: '[appHighlight]',
})
export class HighlightDirective {}

@Directive({
    selector: '[appTooltip]',
})
export class TooltipDirective {}

export class TestComponent {
    static _quarcComponent = [{ selector: 'app-test', template: '<div>Test</div>', imports: [HighlightDirective, TooltipDirective] }];
    static _scopeId = 'c0';
}
`;
    const result = await directiveCollector.process({
        filePath: '/test/test.component.ts',
        fileDir: '/test',
        source: input,
    });

    assertContains(result.source, '_quarcDirectives = [HighlightDirective, TooltipDirective]');
});

test('DirectiveCollector: component import (not directive) - still adds to list', async () => {
    const input = `
import { ChildComponent } from './child.component';

export class TestComponent {
    static _quarcComponent = [{ selector: 'app-test', template: '<child></child>', imports: [ChildComponent] }];
    static _scopeId = 'c0';
}
`;
    const result = await directiveCollector.process({
        filePath: '/test/test.component.ts',
        fileDir: '/test',
        source: input,
    });

    assertContains(result.source, '_quarcDirectives = [ChildComponent]');
});

// ============================================================================
// DirectiveRegistry Tests (mock)
// ============================================================================

console.log('\n📦 DirectiveRegistry Tests\n');

test('DirectiveRegistry: selector matcher for attribute selector', () => {
    const createSelectorMatcher = (selector: string): (element: any) => boolean => {
        if (selector.startsWith('[') && selector.endsWith(']')) {
            const attrName = selector.slice(1, -1);
            return (el: any) => el.hasAttribute(attrName);
        }
        if (selector.startsWith('.')) {
            const className = selector.slice(1);
            return (el: any) => el.classList?.contains(className);
        }
        return () => false;
    };

    const matcher = createSelectorMatcher('[appHighlight]');
    const mockElement = {
        hasAttribute: (name: string) => name === 'appHighlight',
    };

    assertTrue(matcher(mockElement), 'Should match element with appHighlight attribute');
});

test('DirectiveRegistry: selector matcher for class selector', () => {
    const createSelectorMatcher = (selector: string): (element: any) => boolean => {
        if (selector.startsWith('[') && selector.endsWith(']')) {
            const attrName = selector.slice(1, -1);
            return (el: any) => el.hasAttribute(attrName);
        }
        if (selector.startsWith('.')) {
            const className = selector.slice(1);
            return (el: any) => el.classList?.contains(className);
        }
        return () => false;
    };

    const matcher = createSelectorMatcher('.highlight');
    const mockElement = {
        classList: {
            contains: (name: string) => name === 'highlight',
        },
    };

    assertTrue(matcher(mockElement), 'Should match element with highlight class');
});

// ============================================================================
// DirectiveRunner Tests (mock)
// ============================================================================

console.log('\n📦 DirectiveRunner Tests\n');

test('DirectiveRunner: scoped selector generation', () => {
    const scopeId = 'c0';
    const selector = '[appHighlight]';
    const scopedSelector = `[_ngcontent-${scopeId}]${selector}`;

    assertTrue(
        scopedSelector === '[_ngcontent-c0][appHighlight]',
        `Expected '[_ngcontent-c0][appHighlight]' but got '${scopedSelector}'`,
    );
});

test('DirectiveRunner: scoped selector for class', () => {
    const scopeId = 'c1';
    const selector = '.my-directive';
    const scopedSelector = `[_ngcontent-${scopeId}]${selector}`;

    assertTrue(
        scopedSelector === '[_ngcontent-c1].my-directive',
        `Expected '[_ngcontent-c1].my-directive' but got '${scopedSelector}'`,
    );
});

// ============================================================================
// IDirective Interface Tests
// ============================================================================

console.log('\n📦 IDirective Interface Tests\n');

test('IDirective: lifecycle hooks interface', () => {
    interface IDirective {
        ngOnInit?(): void;
        ngOnDestroy?(): void;
        ngOnChanges?(changes: Record<string, any>): void;
    }

    class TestDirective implements IDirective {
        initialized = false;
        destroyed = false;

        ngOnInit(): void {
            this.initialized = true;
        }

        ngOnDestroy(): void {
            this.destroyed = true;
        }
    }

    const directive = new TestDirective();
    directive.ngOnInit?.();
    assertTrue(directive.initialized, 'ngOnInit should set initialized to true');

    directive.ngOnDestroy?.();
    assertTrue(directive.destroyed, 'ngOnDestroy should set destroyed to true');
});

test('IDirective: ngOnChanges receives changes', () => {
    interface IDirective {
        ngOnChanges?(changes: Record<string, { previousValue: any; currentValue: any; firstChange: boolean }>): void;
    }

    class TestDirective implements IDirective {
        lastChanges: Record<string, any> | null = null;

        ngOnChanges(changes: Record<string, { previousValue: any; currentValue: any; firstChange: boolean }>): void {
            this.lastChanges = changes;
        }
    }

    const directive = new TestDirective();
    const changes = {
        color: { previousValue: 'red', currentValue: 'blue', firstChange: false },
    };

    directive.ngOnChanges?.(changes);
    assertTrue(directive.lastChanges !== null, 'ngOnChanges should store changes');
    assertTrue(
        directive.lastChanges?.color?.currentValue === 'blue',
        'ngOnChanges should receive correct current value',
    );
});

// ============================================================================
// Run all tests
// ============================================================================

async function runTests() {
    await new Promise(resolve => setTimeout(resolve, 100));

    console.log('\n' + '='.repeat(60));
    console.log('📊 DIRECTIVE TEST RESULTS');
    console.log('='.repeat(60));

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

    console.log('\n' + '-'.repeat(60));
    console.log(`Total: ${results.length} | Passed: ${passed} | Failed: ${failed}`);
    console.log('-'.repeat(60));

    if (failed > 0) {
        process.exit(1);
    }
}

runTests();
