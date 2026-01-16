"use strict";
/**
 * Test wstrzykiwania stylów z transformacją :host
 */
Object.defineProperty(exports, "__esModule", { value: true });
const web_component_1 = require("../core/module/web-component");
const component_1 = require("../core/module/component");
console.log('=== TEST WSTRZYKIWANIA STYLÓW ===\n');
let passedTests = 0;
let failedTests = 0;
// Funkcja pomocnicza do tworzenia mock komponentów z _scopeId jako właściwością klasy
function createMockComponent(options) {
    const component = {
        _quarcComponent: [{
                selector: options.selector,
                template: options.template,
                style: options.style || '',
                encapsulation: options.encapsulation || component_1.ViewEncapsulation.Emulated,
            }],
    };
    // Dodaj _scopeId jako właściwość klasy
    component._scopeId = options.scopeId;
    return component;
}
function test(name, fn) {
    Promise.resolve(fn()).then(result => {
        if (result) {
            console.log(`✅ ${name}`);
            passedTests++;
        }
        else {
            console.log(`❌ ${name}`);
            failedTests++;
        }
    }).catch(e => {
        console.log(`❌ ${name} - Error: ${e}`);
        failedTests++;
    });
}
// Mock document jeśli nie istnieje (dla środowiska Node.js)
if (typeof document === 'undefined') {
    console.log('⚠️  Testy wymagają środowiska przeglądarki (JSDOM)');
    console.log('Uruchom testy w przeglądarce lub zainstaluj jsdom: npm install --save-dev jsdom');
}
// Test 1: Transformacja :host na [_nghost-scopeId]
test('Transformacja :host na [_nghost-scopeId]', () => {
    const component = createMockComponent({
        selector: 'test-component',
        template: '<div>Test</div>',
        style: ':host { display: block; }',
        encapsulation: component_1.ViewEncapsulation.Emulated,
        scopeId: 'test123',
    });
    const webComponent = new web_component_1.WebComponent();
    webComponent.setComponentInstance(component);
    // Sprawdź czy style zostały wstrzyknięte do head
    const styleElements = document.head.querySelectorAll('style[data-scope-id="test123"]');
    if (styleElements.length === 0)
        return false;
    const styleContent = styleElements[0].textContent || '';
    // Sprawdź czy :host został zamieniony na [_nghost-test123]
    return styleContent.includes('[_nghost-test123]') &&
        !styleContent.includes(':host') &&
        styleContent.includes('display: block');
});
// Test 2: Transformacja :host() z selektorem
test('Transformacja :host() z selektorem', () => {
    const component = createMockComponent({
        selector: 'test-component',
        template: '<div>Test</div>',
        style: ':host(.active) { background: red; }',
        encapsulation: component_1.ViewEncapsulation.Emulated,
        scopeId: 'test456',
    });
    const webComponent = new web_component_1.WebComponent();
    webComponent.setComponentInstance(component);
    const styleElements = document.head.querySelectorAll('style[data-scope-id="test456"]');
    if (styleElements.length === 0)
        return false;
    const styleContent = styleElements[0].textContent || '';
    // Sprawdź czy :host(.active) został zamieniony na [_nghost-test456].active
    return styleContent.includes('[_nghost-test456].active') &&
        !styleContent.includes(':host') &&
        styleContent.includes('background: red');
});
// Test 3: Wiele wystąpień :host w jednym pliku
test('Wiele wystąpień :host', () => {
    const component = createMockComponent({
        selector: 'test-component',
        template: '<div>Test</div>',
        style: ':host { display: block; } :host(.active) { color: blue; } :host:hover { opacity: 0.8; }',
        encapsulation: component_1.ViewEncapsulation.Emulated,
        scopeId: 'test789',
    });
    const webComponent = new web_component_1.WebComponent();
    webComponent.setComponentInstance(component);
    const styleElements = document.head.querySelectorAll('style[data-scope-id="test789"]');
    if (styleElements.length === 0)
        return false;
    const styleContent = styleElements[0].textContent || '';
    return styleContent.includes('[_nghost-test789]') &&
        styleContent.includes('[_nghost-test789].active') &&
        styleContent.includes('[_nghost-test789]:hover') &&
        !styleContent.includes(':host ') &&
        !styleContent.includes(':host.') &&
        !styleContent.includes(':host:');
});
// Test 4: ShadowDom - style bez transformacji
test('ShadowDom: style bez transformacji :host', () => {
    const component = createMockComponent({
        selector: 'test-component',
        template: '<div>Test</div>',
        style: ':host { display: flex; }',
        encapsulation: component_1.ViewEncapsulation.ShadowDom,
        scopeId: 'shadow123',
    });
    const webComponent = new web_component_1.WebComponent();
    webComponent.setComponentInstance(component);
    // Dla ShadowDom style powinny być w shadow root, nie w head
    const styleElements = document.head.querySelectorAll('style[data-scope-id="shadow123"]');
    // Nie powinno być żadnych stylów w head dla ShadowDom
    return styleElements.length === 0;
});
// Test 5: ViewEncapsulation.None - style bez transformacji
test('ViewEncapsulation.None: style bez transformacji', () => {
    const component = createMockComponent({
        selector: 'test-component',
        template: '<div>Test</div>',
        style: ':host { display: inline; }',
        encapsulation: component_1.ViewEncapsulation.None,
        scopeId: 'none123',
    });
    const webComponent = new web_component_1.WebComponent();
    webComponent.setComponentInstance(component);
    // Dla None style są dodawane bezpośrednio do komponentu
    const styleElements = webComponent.querySelectorAll('style');
    if (styleElements.length === 0)
        return false;
    const styleContent = styleElements[0].textContent || '';
    // Style powinny pozostać nietknięte (z :host)
    return styleContent.includes(':host');
});
// Test 6: Atrybut _nghost-scopeId na elemencie hosta
test('Atrybut _nghost-scopeId na elemencie hosta', () => {
    const component = createMockComponent({
        selector: 'test-component',
        template: '<div>Test</div>',
        style: ':host { display: block; }',
        encapsulation: component_1.ViewEncapsulation.Emulated,
        scopeId: 'host123',
    });
    const webComponent = new web_component_1.WebComponent();
    webComponent.setComponentInstance(component);
    // Sprawdź czy element ma atrybut _nghost-host123
    return webComponent.hasAttribute('_nghost-host123');
});
// Test 7: Złożone selektory :host
test('Złożone selektory :host', () => {
    const component = createMockComponent({
        selector: 'test-complex',
        template: '<div>Complex</div>',
        style: ':host { display: flex; } :host:hover { background: blue; } :host(.active) .inner { color: red; }',
        encapsulation: component_1.ViewEncapsulation.Emulated,
        scopeId: 'complex123',
    });
    const webComponent = new web_component_1.WebComponent();
    webComponent.setComponentInstance(component);
    const styleElements = document.head.querySelectorAll('style[data-scope-id="complex123"]');
    if (styleElements.length === 0)
        return false;
    const styleContent = styleElements[0].textContent || '';
    return styleContent.includes('[_nghost-complex123]') &&
        styleContent.includes('[_nghost-complex123]:hover') &&
        styleContent.includes('[_nghost-complex123].active .inner') &&
        !styleContent.includes(':host ') &&
        !styleContent.includes(':host.') &&
        !styleContent.includes(':host:');
});
// Test 8: Brak transformacji dla ViewEncapsulation.ShadowDom
test('Brak transformacji dla ViewEncapsulation.ShadowDom', () => {
    const component = createMockComponent({
        selector: 'test-shadow',
        template: '<div>Shadow</div>',
        style: ':host { display: block; }',
        encapsulation: component_1.ViewEncapsulation.ShadowDom,
        scopeId: 'shadow789',
    });
    const webComponent = new web_component_1.WebComponent();
    webComponent.setComponentInstance(component);
    // Dla ShadowDom style powinny być w shadow root, nie w head
    const styleElements = document.head.querySelectorAll('style[data-scope-id="shadow789"]');
    // Nie powinno być żadnych stylów w head dla ShadowDom
    return styleElements.length === 0;
});
// Test 9: Brak transformacji dla ViewEncapsulation.None
test('Brak transformacji dla ViewEncapsulation.None', () => {
    const component = createMockComponent({
        selector: 'test-none',
        template: '<div>None</div>',
        style: ':host { display: block; }',
        encapsulation: component_1.ViewEncapsulation.None,
        scopeId: 'none123',
    });
    const webComponent = new web_component_1.WebComponent();
    webComponent.setComponentInstance(component);
    // Dla None style są dodawane bezpośrednio do komponentu
    const styleElements = webComponent.querySelectorAll('style');
    if (styleElements.length === 0)
        return false;
    const styleContent = styleElements[0].textContent || '';
    // Style powinny pozostać nietknięte (z :host)
    return styleContent.includes(':host');
});
// Test 10: Komponent bez stylów
test('Komponent bez stylów', () => {
    const component = createMockComponent({
        selector: 'test-no-style',
        template: '<div>No styles</div>',
        encapsulation: component_1.ViewEncapsulation.Emulated,
        scopeId: 'nostyle789',
    });
    const webComponent1 = new web_component_1.WebComponent();
    webComponent1.setComponentInstance(component);
    const webComponent2 = new web_component_1.WebComponent();
    webComponent2.setComponentInstance(component);
    // Powinien być tylko jeden element style dla tego scopeId
    const styleElements = document.head.querySelectorAll('style[data-scope-id="unique123"]');
    return styleElements.length === 1;
});
// Poczekaj na zakończenie wszystkich testów
setTimeout(() => {
    console.log('\n=== PODSUMOWANIE ===');
    console.log(`✅ Testy zaliczone: ${passedTests}`);
    console.log(`❌ Testy niezaliczone: ${failedTests}`);
    console.log(`📊 Procent sukcesu: ${((passedTests / (passedTests + failedTests)) * 100).toFixed(1)}%`);
    if (failedTests === 0) {
        console.log('\n🎉 Wszystkie testy przeszły pomyślnie!');
    }
    else {
        console.log('\n⚠️  Niektóre testy nie przeszły. Sprawdź implementację.');
    }
}, 1000);
