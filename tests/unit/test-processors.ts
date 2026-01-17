#!/usr/bin/env node

import { TemplateTransformer } from '../../cli/processors/template/template-transformer';
import { ClassDecoratorProcessor } from '../../cli/processors/class-decorator-processor';
import { DIProcessor } from '../../cli/processors/di-processor';
import { SignalTransformerProcessor } from '../../cli/processors/signal-transformer-processor';

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

function assertEqual(actual: string, expected: string, message?: string): void {
    if (actual !== expected) {
        throw new Error(
            `${message || 'Assertion failed'}\nExpected:\n${expected}\nActual:\n${actual}`,
        );
    }
}

function assertContains(actual: string, expected: string, message?: string): void {
    if (!actual.includes(expected)) {
        throw new Error(
            `${message || 'Assertion failed'}\nExpected to contain:\n${expected}\nActual:\n${actual}`,
        );
    }
}

// ============================================================================
// TemplateTransformer Tests
// ============================================================================

console.log('\n📦 TemplateTransformer Tests\n');

const templateTransformer = new TemplateTransformer();

test('interpolation: {{ signal() }} -> [innerText] span', () => {
    const input = '<div>{{ userName() }}</div>';
    const output = templateTransformer.transformInterpolation(input);
    assertContains(output, '[innerText]="userName()"');
});

test('interpolation: multiple interpolations', () => {
    const input = '<div>{{ a() }} and {{ b() }}</div>';
    const output = templateTransformer.transformInterpolation(input);
    assertContains(output, '[innerText]="a()"');
    assertContains(output, '[innerText]="b()"');
});

test('@if: simple condition', () => {
    const input = '@if (isVisible) { <div>Content</div> }';
    const output = templateTransformer.transformControlFlowIf(input);
    assertContains(output, '*ngIf="isVisible"');
    assertContains(output, '<div>Content</div>');
});

test('@if/@else: condition with else', () => {
    const input = '@if (isLoggedIn) { <span>Welcome</span> } @else { <span>Login</span> }';
    const output = templateTransformer.transformControlFlowIf(input);
    assertContains(output, '*ngIf="isLoggedIn"');
    assertContains(output, '<span>Welcome</span>');
    assertContains(output, '<span>Login</span>');
});

test('@if/@else if/@else: multiple conditions', () => {
    const input = '@if (a) { A } @else if (b) { B } @else { C }';
    const output = templateTransformer.transformControlFlowIf(input);
    assertContains(output, '*ngIf="a"');
    assertContains(output, 'A');
    assertContains(output, '*ngIf="!(a) && b"');
    assertContains(output, 'B');
    assertContains(output, '*ngIf="!(a) && !(b)"');
    assertContains(output, 'C');
});

test('@for: simple loop', () => {
    const input = '@for (item of items) { <div>{{ item }}</div> }';
    const output = templateTransformer.transformControlFlowFor(input);
    assertContains(output, '*ngFor="let item of items"');
});

test('@for: loop with track', () => {
    const input = '@for (item of items; track item.id) { <div>{{ item.name }}</div> }';
    const output = templateTransformer.transformControlFlowFor(input);
    assertContains(output, '*ngFor="let item of items; trackBy: item.id"');
});

test('*ngIf: directive kept as is', () => {
    const input = '<div *ngIf="isVisible">Content</div>';
    const output = templateTransformer.transformNgIfDirective(input);
    assertEqual(output, input);
});

test('*ngFor: directive kept as is', () => {
    const input = '<div *ngFor="let item of items">{{ item }}</div>';
    const output = templateTransformer.transformNgForDirective(input);
    assertEqual(output, input);
});

test('input binding: kept as is', () => {
    const input = '<app-child [data]="parentData"></app-child>';
    const output = templateTransformer.transformInputBindings(input);
    assertEqual(output, input);
});

test('output binding: kept as is', () => {
    const input = '<button (click)="onClick($event)">Click</button>';
    const output = templateTransformer.transformOutputBindings(input);
    assertEqual(output, input);
});

test('two-way binding: kept as is', () => {
    const input = '<input [(ngModel)]="userName">';
    const output = templateTransformer.transformTwoWayBindings(input);
    assertEqual(output, input);
});

test('transformAll: combined transformations', () => {
    const input = `
        @if (isVisible) {
            <div [class]="myClass" (click)="handleClick()">
                {{ message() }}
            </div>
        }
    `;
    const output = templateTransformer.transformAll(input);
    assertContains(output, '*ngIf="isVisible"');
    assertContains(output, '[class]="myClass"');
    assertContains(output, '(click)="handleClick()"');
    assertContains(output, '[innerText]="message()"');
});

// ============================================================================
// ClassDecoratorProcessor Tests
// ============================================================================

console.log('\n📦 ClassDecoratorProcessor Tests\n');

const decoratorProcessor = new ClassDecoratorProcessor();

test('Component decorator: transforms to static property', async () => {
    const input = `
@Component({
    selector: 'app-test',
    template: '<div>Test</div>',
})
export class TestComponent {}
`;
    const result = await decoratorProcessor.process({
        filePath: '/test/test.component.ts',
        fileDir: '/test',
        source: input,
    });

    assertContains(result.source, 'static _quarcComponent');
    assertContains(result.source, "selector: 'app-test'");
    assertContains(result.source, 'static _scopeId');
});

test('Injectable decorator: transforms to static property', async () => {
    const input = `
@Injectable()
export class TestService {}
`;
    const result = await decoratorProcessor.process({
        filePath: '/test/test.service.ts',
        fileDir: '/test',
        source: input,
    });

    assertContains(result.source, 'static _quarcInjectable');
});

test('Directive decorator: transforms to static property', async () => {
    const input = `
@Directive({
    selector: '[appHighlight]',
})
export class HighlightDirective {}
`;
    const result = await decoratorProcessor.process({
        filePath: '/test/highlight.directive.ts',
        fileDir: '/test',
        source: input,
    });

    assertContains(result.source, 'static _quarcDirective');
});

test('Pipe decorator: transforms to static property', async () => {
    const input = `
@Pipe({
    name: 'myPipe',
})
export class MyPipe {}
`;
    const result = await decoratorProcessor.process({
        filePath: '/test/my.pipe.ts',
        fileDir: '/test',
        source: input,
    });

    assertContains(result.source, 'static _quarcPipe');
});

// ============================================================================
// DIProcessor Tests
// ============================================================================

console.log('\n📦 DIProcessor Tests\n');

const diProcessor = new DIProcessor();

test('DI: extracts constructor params', async () => {
    const input = `
export class TestComponent {
    constructor(private userService: UserService, private http: HttpClient) {}
}
`;
    const result = await diProcessor.process({
        filePath: '/test/test.component.ts',
        fileDir: '/test',
        source: input,
    });

    assertContains(result.source, "static __di_params__ = ['UserService', 'HttpClient']");
});

test('DI: includes HTMLElement param', async () => {
    const input = `
export class TestComponent {
    constructor(public _nativeElement: HTMLElement, private service: MyService) {}
}
`;
    const result = await diProcessor.process({
        filePath: '/test/test.component.ts',
        fileDir: '/test',
        source: input,
    });

    assertContains(result.source, "static __di_params__ = ['HTMLElement', 'MyService']");
});

test('DI: no params - no modification', async () => {
    const input = `
export class TestComponent {
    constructor() {}
}
`;
    const result = await diProcessor.process({
        filePath: '/test/test.component.ts',
        fileDir: '/test',
        source: input,
    });

    if (result.modified !== false) {
        throw new Error('Expected modified to be false');
    }
});

test('DI: class with extends', async () => {
    const input = `
export class ChildComponent extends BaseComponent {
    constructor(private service: MyService) {
        super();
    }
}
`;
    const result = await diProcessor.process({
        filePath: '/test/child.component.ts',
        fileDir: '/test',
        source: input,
    });

    assertContains(result.source, "static __di_params__ = ['MyService']");
});

// ============================================================================
// SignalTransformerProcessor Tests
// ============================================================================

console.log('\n📦 SignalTransformerProcessor Tests\n');

const signalProcessor = new SignalTransformerProcessor();

test('Signal: transforms input()', async () => {
    const input = `
export class TestComponent {
    data = input<string>();
}
`;
    const result = await signalProcessor.process({
        filePath: '/test/test.component.ts',
        fileDir: '/test',
        source: input,
    });

    assertContains(result.source, 'input<string>("data", this)');
});

test('Signal: transforms output()', async () => {
    const input = `
export class TestComponent {
    clicked = output<void>();
}
`;
    const result = await signalProcessor.process({
        filePath: '/test/test.component.ts',
        fileDir: '/test',
        source: input,
    });

    assertContains(result.source, 'output<void>("clicked", this)');
});

test('Signal: transforms input with default value', async () => {
    const input = `
export class TestComponent {
    count = input<number>(0);
}
`;
    const result = await signalProcessor.process({
        filePath: '/test/test.component.ts',
        fileDir: '/test',
        source: input,
    });

    assertContains(result.source, 'input<number>("count", this, 0)');
});

test('Signal: adds _nativeElement to constructor', async () => {
    const input = `
export class TestComponent {
    data = input<string>();
}
`;
    const result = await signalProcessor.process({
        filePath: '/test/test.component.ts',
        fileDir: '/test',
        source: input,
    });

    assertContains(result.source, 'constructor(public _nativeElement: HTMLElement)');
});

test('Signal: preserves existing constructor params', async () => {
    const input = `
export class TestComponent {
    data = input<string>();
    constructor(private service: MyService) {}
}
`;
    const result = await signalProcessor.process({
        filePath: '/test/test.component.ts',
        fileDir: '/test',
        source: input,
    });

    assertContains(result.source, 'constructor(public _nativeElement: HTMLElement, private service: MyService)');
});

test('Signal: does not duplicate _nativeElement', async () => {
    const input = `
export class TestComponent {
    data = input<string>();
    constructor(public _nativeElement: HTMLElement) {}
}
`;
    const result = await signalProcessor.process({
        filePath: '/test/test.component.ts',
        fileDir: '/test',
        source: input,
    });

    const nativeElementCount = (result.source.match(/_nativeElement/g) || []).length;
    if (nativeElementCount > 2) {
        throw new Error(`_nativeElement appears ${nativeElementCount} times, expected max 2`);
    }
});

// ============================================================================
// Run all tests
// ============================================================================

async function runTests() {
    await new Promise(resolve => setTimeout(resolve, 100));

    console.log('\n' + '='.repeat(60));
    console.log('📊 TEST RESULTS');
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
