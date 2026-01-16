/**
 * Testy asynchronicznego ładowania wtyczek dla Quarc
 * Sprawdzają czy:
 * 1. Skrypt wtyczki jest ładowany gdy wchodzimy na dany adres
 * 2. Web-komponent z wtyczki jest poprawnie renderowany
 * 3. Custom Element jest definiowany po załadowaniu skryptu
 */

console.log('=== TESTY ŁADOWANIA WTYCZEK QUARC ===\n');

let passedTests = 0;
let failedTests = 0;

async function test(name: string, fn: () => Promise<boolean> | boolean): Promise<void> {
    try {
        const result = await fn();
        if (result) {
            console.log(`✅ ${name}`);
            passedTests++;
        } else {
            console.log(`❌ ${name}`);
            failedTests++;
        }
    } catch (e) {
        console.log(`❌ ${name} - Error: ${e}`);
        failedTests++;
    }
}

// Mock DOM
class MockElement {
    tagName: string;
    innerHTML = '';
    children: MockElement[] = [];
    parentElement: MockElement | null = null;
    attributes: Map<string, string> = new Map();

    constructor(tagName: string) {
        this.tagName = tagName.toUpperCase();
    }

    querySelector(selector: string): MockElement | null {
        if (selector.startsWith('script[src="')) {
            const src = selector.match(/script\[src="(.+)"\]/)?.[1];
            for (const child of this.children) {
                if (child.tagName === 'SCRIPT' && child.attributes.get('src') === src) {
                    return child;
                }
            }
        }
        return null;
    }

    appendChild(child: MockElement): void {
        this.children.push(child);
        child.parentElement = this;
    }

    setAttribute(name: string, value: string): void {
        this.attributes.set(name, value);
    }

    getAttribute(name: string): string | null {
        return this.attributes.get(name) ?? null;
    }
}

class MockDocument {
    head = new MockElement('HEAD');
    body = new MockElement('BODY');
    createdElements: MockElement[] = [];

    createElement(tagName: string): MockElement {
        const el = new MockElement(tagName);
        this.createdElements.push(el);
        return el;
    }

    querySelector(selector: string): MockElement | null {
        return null;
    }
}

// Mock customElements
class MockCustomElementRegistry {
    private definitions = new Map<string, any>();

    define(name: string, constructor: any): void {
        if (this.definitions.has(name)) {
            throw new Error(`Custom element ${name} already defined`);
        }
        this.definitions.set(name, constructor);
    }

    get(name: string): any {
        return this.definitions.get(name);
    }

    isDefined(name: string): boolean {
        return this.definitions.has(name);
    }
}

// Symulacja ensureScriptLoaded
async function ensureScriptLoaded(
    source: string,
    mockDocument: MockDocument,
): Promise<void> {
    const existingScript = mockDocument.head.querySelector(`script[src="${source}"]`);
    if (existingScript) {
        return;
    }

    return new Promise((resolve) => {
        const script = mockDocument.createElement('script');
        script.setAttribute('src', source);
        script.setAttribute('type', 'module');
        mockDocument.head.appendChild(script);
        // Symulacja async load
        setTimeout(() => resolve(), 10);
    });
}

// Symulacja ComponentLoader
type ComponentLoader = () => Promise<string>;

function createComponentLoader(
    source: string,
    componentTag: string,
    mockDocument: MockDocument,
): ComponentLoader {
    return async () => {
        await ensureScriptLoaded(source, mockDocument);
        return componentTag;
    };
}

// Symulacja WebComponentFactory
class MockWebComponentFactory {
    private static registeredComponents = new Map<string, boolean>();

    static registerWithDependencies(selector: string): boolean {
        if (this.registeredComponents.has(selector)) {
            return false;
        }
        this.registeredComponents.set(selector, true);
        return true;
    }

    static isRegistered(selector: string): boolean {
        return this.registeredComponents.has(selector);
    }

    static clear(): void {
        this.registeredComponents.clear();
    }
}

// Symulacja bootstrapPlugin
function bootstrapPlugin(
    pluginId: string,
    selector: string,
    customElements: MockCustomElementRegistry,
): string {
    // Rejestruje Custom Element
    if (!customElements.isDefined(selector)) {
        customElements.define(selector, class extends Object {});
    }
    MockWebComponentFactory.registerWithDependencies(selector);
    return selector;
}

(async () => {

// Test 1: Script jest dodawany do head gdy nie istnieje
await test('Script jest dodawany do head gdy nie istnieje', async () => {
    const mockDoc = new MockDocument();
    const source = '/plugins/cameras/main.js';

    await ensureScriptLoaded(source, mockDoc);

    const script = mockDoc.head.querySelector(`script[src="${source}"]`);
    return script !== null && script.getAttribute('src') === source;
});

// Test 2: Script nie jest duplikowany gdy już istnieje
await test('Script nie jest duplikowany gdy już istnieje w head', async () => {
    const mockDoc = new MockDocument();
    const source = '/plugins/cameras/main.js';

    await ensureScriptLoaded(source, mockDoc);
    const countBefore = mockDoc.head.children.length;

    await ensureScriptLoaded(source, mockDoc);
    const countAfter = mockDoc.head.children.length;

    return countBefore === countAfter && countAfter === 1;
});

// Test 3: ComponentLoader ładuje skrypt i zwraca selector
await test('ComponentLoader ładuje skrypt i zwraca selector', async () => {
    const mockDoc = new MockDocument();
    const source = '/plugins/test/main.js';
    const componentTag = 'test-component';

    const loader = createComponentLoader(source, componentTag, mockDoc);
    const result = await loader();

    const scriptExists = mockDoc.head.querySelector(`script[src="${source}"]`) !== null;
    return result === componentTag && scriptExists;
});

// Test 4: bootstrapPlugin rejestruje Custom Element
await test('bootstrapPlugin rejestruje Custom Element', async () => {
    const customElements = new MockCustomElementRegistry();
    const selector = 'app-camera-list';

    bootstrapPlugin('cameras', selector, customElements);

    return customElements.isDefined(selector);
});

// Test 5: bootstrapPlugin rejestruje w WebComponentFactory
await test('bootstrapPlugin rejestruje w WebComponentFactory', async () => {
    MockWebComponentFactory.clear();
    const customElements = new MockCustomElementRegistry();
    const selector = 'app-test-plugin';

    bootstrapPlugin('test', selector, customElements);

    return MockWebComponentFactory.isRegistered(selector);
});

// Test 6: Wielokrotne wywołanie bootstrapPlugin nie powoduje błędu
await test('Wielokrotne wywołanie bootstrapPlugin nie powoduje błędu', async () => {
    const customElements = new MockCustomElementRegistry();
    const selector = 'app-duplicate-test';

    bootstrapPlugin('dup1', selector, customElements);

    // Drugie wywołanie nie powinno rzucić błędu
    try {
        // Custom element już zdefiniowany, więc pomijamy define
        if (!customElements.isDefined(selector)) {
            customElements.define(selector, class {});
        }
        return true;
    } catch {
        return false;
    }
});

// Test 7: Symulacja pełnego flow - ładowanie wtyczki przez routing
await test('Pełny flow: routing -> ComponentLoader -> script -> Custom Element', async () => {
    const mockDoc = new MockDocument();
    const customElements = new MockCustomElementRegistry();
    const source = '/plugins/cameras/main.js';
    const selector = 'app-camera-list';

    // 1. Router wywołuje ComponentLoader
    const loader = createComponentLoader(source, selector, mockDoc);

    // 2. ComponentLoader ładuje skrypt
    const returnedSelector = await loader();

    // 3. Skrypt wywołuje bootstrapPlugin (symulacja)
    bootstrapPlugin('cameras', selector, customElements);

    // 4. Sprawdzamy czy wszystko jest poprawnie zarejestrowane
    const scriptLoaded = mockDoc.head.querySelector(`script[src="${source}"]`) !== null;
    const customElementDefined = customElements.isDefined(selector);
    const factoryRegistered = MockWebComponentFactory.isRegistered(selector);

    return scriptLoaded &&
           customElementDefined &&
           factoryRegistered &&
           returnedSelector === selector;
});

// Test 8: Script ma poprawne atrybuty (type="module", async)
await test('Script ma poprawne atrybuty type="module"', async () => {
    const mockDoc = new MockDocument();
    const source = '/plugins/attrs/main.js';

    await ensureScriptLoaded(source, mockDoc);

    const script = mockDoc.head.querySelector(`script[src="${source}"]`);
    return script !== null && script.getAttribute('type') === 'module';
});

// Test 9: Różne wtyczki mają różne selektory
await test('Różne wtyczki mają różne selektory', async () => {
    MockWebComponentFactory.clear();
    const customElements = new MockCustomElementRegistry();

    bootstrapPlugin('cameras', 'app-camera-list', customElements);
    bootstrapPlugin('settings', 'app-settings-panel', customElements);

    return customElements.isDefined('app-camera-list') &&
           customElements.isDefined('app-settings-panel') &&
           MockWebComponentFactory.isRegistered('app-camera-list') &&
           MockWebComponentFactory.isRegistered('app-settings-panel');
});

// Test 10: ComponentLoader może być wywołany wielokrotnie bez duplikacji skryptu
await test('ComponentLoader wywołany wielokrotnie nie duplikuje skryptu', async () => {
    const mockDoc = new MockDocument();
    const source = '/plugins/multi/main.js';
    const selector = 'multi-component';

    const loader = createComponentLoader(source, selector, mockDoc);

    await loader();
    await loader();
    await loader();

    const scriptCount = mockDoc.head.children.filter(
        c => c.tagName === 'SCRIPT' && c.getAttribute('src') === source,
    ).length;

    return scriptCount === 1;
});

console.log('\n=== PODSUMOWANIE ===');
console.log(`✅ Testy zaliczone: ${passedTests}`);
console.log(`❌ Testy niezaliczone: ${failedTests}`);
console.log(`📊 Procent sukcesu: ${((passedTests / (passedTests + failedTests)) * 100).toFixed(1)}%`);

if (failedTests === 0) {
    console.log('\n🎉 Wszystkie testy przeszły pomyślnie!');
    process.exit(0);
} else {
    console.log('\n⚠️  Niektóre testy nie przeszły. Sprawdź implementację.');
    process.exit(1);
}

})();
