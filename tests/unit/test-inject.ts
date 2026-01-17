#!/usr/bin/env node

import { InjectProcessor } from '../../cli/processors/inject-processor';

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

function assertNotContains(actual: string, unexpected: string, message?: string): void {
    if (actual.includes(unexpected)) {
        throw new Error(
            `${message || 'Assertion failed'}\nExpected NOT to contain:\n${unexpected}\nActual:\n${actual}`,
        );
    }
}

console.log('\n📦 InjectProcessor Tests\n');

const injectProcessor = new InjectProcessor();

test('Inject: transforms inject<Type>(ClassName) to inject<Type>("ClassName")', async () => {
    const input = `
export class TestComponent {
    private service = inject<UserService>(UserService);
}
`;
    const result = await injectProcessor.process({
        filePath: '/test/test.component.ts',
        fileDir: '/test',
        source: input,
    });

    assertContains(result.source, 'inject<UserService>("UserService")');
    assertNotContains(result.source, 'inject<UserService>(UserService)');
});

test('Inject: transforms inject(ClassName) to inject("ClassName")', async () => {
    const input = `
export class TestComponent {
    private service = inject(UserService);
}
`;
    const result = await injectProcessor.process({
        filePath: '/test/test.component.ts',
        fileDir: '/test',
        source: input,
    });

    assertContains(result.source, 'inject("UserService")');
    assertNotContains(result.source, 'inject(UserService)');
});

test('Inject: handles multiple inject calls', async () => {
    const input = `
export class TestComponent {
    private userService = inject(UserService);
    private httpClient = inject<HttpClient>(HttpClient);
    private router = inject(Router);
}
`;
    const result = await injectProcessor.process({
        filePath: '/test/test.component.ts',
        fileDir: '/test',
        source: input,
    });

    assertContains(result.source, 'inject("UserService")');
    assertContains(result.source, 'inject<HttpClient>("HttpClient")');
    assertContains(result.source, 'inject("Router")');
});

test('Inject: handles inject in constructor', async () => {
    const input = `
export class TestComponent {
    constructor() {
        this.service = inject(MyService);
    }
}
`;
    const result = await injectProcessor.process({
        filePath: '/test/test.component.ts',
        fileDir: '/test',
        source: input,
    });

    assertContains(result.source, 'inject("MyService")');
});

test('Inject: handles inject in methods', async () => {
    const input = `
export class TestComponent {
    public loadService(): void {
        const service = inject(DynamicService);
        service.load();
    }
}
`;
    const result = await injectProcessor.process({
        filePath: '/test/test.component.ts',
        fileDir: '/test',
        source: input,
    });

    assertContains(result.source, 'inject("DynamicService")');
});

test('Inject: preserves inject with string argument', async () => {
    const input = `
export class TestComponent {
    private service = inject("CustomToken");
}
`;
    const result = await injectProcessor.process({
        filePath: '/test/test.component.ts',
        fileDir: '/test',
        source: input,
    });

    assertContains(result.source, 'inject("CustomToken")');
    if (result.modified) {
        throw new Error('Expected no modification for string token');
    }
});

test('Inject: handles inject with whitespace', async () => {
    const input = `
export class TestComponent {
    private service = inject(  UserService  );
    private http = inject<HttpClient>(  HttpClient  );
}
`;
    const result = await injectProcessor.process({
        filePath: '/test/test.component.ts',
        fileDir: '/test',
        source: input,
    });

    assertContains(result.source, 'inject("UserService")');
    assertContains(result.source, 'inject<HttpClient>("HttpClient")');
});

test('Inject: no inject calls - no modification', async () => {
    const input = `
export class TestComponent {
    constructor(private service: UserService) {}
}
`;
    const result = await injectProcessor.process({
        filePath: '/test/test.component.ts',
        fileDir: '/test',
        source: input,
    });

    if (result.modified) {
        throw new Error('Expected no modification when no inject calls present');
    }
});

test('Inject: handles HTMLElement injection', async () => {
    const input = `
export class TestComponent {
    private element = inject(HTMLElement);
}
`;
    const result = await injectProcessor.process({
        filePath: '/test/test.component.ts',
        fileDir: '/test',
        source: input,
    });

    assertContains(result.source, 'inject("HTMLElement")');
});

test('Inject: handles complex generic types', async () => {
    const input = `
export class TestComponent {
    private service = inject<Observable<User>>(UserService);
}
`;
    const result = await injectProcessor.process({
        filePath: '/test/test.component.ts',
        fileDir: '/test',
        source: input,
    });

    assertContains(result.source, 'inject<Observable<User>>("UserService")');
});

test('Inject: handles inject in arrow functions', async () => {
    const input = `
export class TestComponent {
    private factory = () => inject(FactoryService);
}
`;
    const result = await injectProcessor.process({
        filePath: '/test/test.component.ts',
        fileDir: '/test',
        source: input,
    });

    assertContains(result.source, 'inject("FactoryService")');
});

test('Inject: handles multiple inject calls on same line', async () => {
    const input = `
export class TestComponent {
    private services = [inject(ServiceA), inject(ServiceB), inject(ServiceC)];
}
`;
    const result = await injectProcessor.process({
        filePath: '/test/test.component.ts',
        fileDir: '/test',
        source: input,
    });

    assertContains(result.source, 'inject("ServiceA")');
    assertContains(result.source, 'inject("ServiceB")');
    assertContains(result.source, 'inject("ServiceC")');
});

test('Inject: preserves lowercase inject calls (not class names)', async () => {
    const input = `
export class TestComponent {
    private value = inject(someFunction);
}
`;
    const result = await injectProcessor.process({
        filePath: '/test/test.component.ts',
        fileDir: '/test',
        source: input,
    });

    assertContains(result.source, 'inject(someFunction)');
    if (result.modified) {
        throw new Error('Expected no modification for non-class name');
    }
});

test('Inject: handles nested inject calls', async () => {
    const input = `
export class TestComponent {
    private service = createWrapper(inject(MyService));
}
`;
    const result = await injectProcessor.process({
        filePath: '/test/test.component.ts',
        fileDir: '/test',
        source: input,
    });

    assertContains(result.source, 'inject("MyService")');
});

async function runTests() {
    await new Promise(resolve => setTimeout(resolve, 100));

    console.log('\n' + '='.repeat(60));
    console.log('📊 INJECT TEST RESULTS');
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
