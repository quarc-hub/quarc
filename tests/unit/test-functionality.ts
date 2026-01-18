/**
 * Testy funkcjonalne dla Quarc
 * Sprawdzają czy podstawowa funkcjonalność działa poprawnie
 */

import { ControlFlowTransformer } from '../../cli/helpers/control-flow-transformer';
import { TemplateParser, AttributeType } from '../../cli/helpers/template-parser';
import { StructuralDirectiveHelper } from '../../cli/helpers/structural-directive-helper';

console.log('=== TESTY FUNKCJONALNE QUARC ===\n');

let passedTests = 0;
let failedTests = 0;

function test(name: string, fn: () => boolean): void {
    try {
        const result = fn();
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

// Test 1: ControlFlowTransformer - prosty @if
test('ControlFlowTransformer: @if -> *ngIf', () => {
    const transformer = new ControlFlowTransformer();
    const input = '@if (show) { <div>Content</div> }';
    const result = transformer.transform(input);
    return result.includes('<ng-container *ngIf="show">') && result.includes('Content');
});

// Test 2: ControlFlowTransformer - @if @else
test('ControlFlowTransformer: @if @else', () => {
    const transformer = new ControlFlowTransformer();
    const input = '@if (a) { <div>A</div> } @else { <div>B</div> }';
    const result = transformer.transform(input);
    return result.includes('*ngIf="a"') && result.includes('*ngIf="!(a)"');
});

// Test 3: ControlFlowTransformer - @if @else if @else
test('ControlFlowTransformer: @if @else if @else', () => {
    const transformer = new ControlFlowTransformer();
    const input = '@if (a) { <div>A</div> } @else if (b) { <div>B</div> } @else { <div>C</div> }';
    const result = transformer.transform(input);
    return result.includes('*ngIf="a"') &&
           result.includes('*ngIf="!(a) && b"') &&
           result.includes('*ngIf="!(a) && !(b)"');
});

// Test 4: TemplateParser - parsowanie prostego HTML
test('TemplateParser: prosty HTML', () => {
    const parser = new TemplateParser();
    const elements = parser.parse('<div>Content</div>');
    return elements.length === 1 &&
           'tagName' in elements[0] &&
           elements[0].tagName === 'div';
});

// Test 5: TemplateParser - parsowanie atrybutów
test('TemplateParser: atrybuty', () => {
    const parser = new TemplateParser();
    const elements = parser.parse('<div class="test" id="main">Content</div>');
    return elements.length === 1 &&
           'attributes' in elements[0] &&
           elements[0].attributes.length === 2;
});

// Test 6: TemplateParser - *ngIf jako structural directive
test('TemplateParser: *ngIf detection', () => {
    const parser = new TemplateParser();
    const elements = parser.parse('<div *ngIf="show">Content</div>');
    if (elements.length === 0 || !('attributes' in elements[0])) return false;
    const attr = elements[0].attributes.find(a => a.name === '*ngIf');
    return attr !== undefined && attr.type === 'structural';
});

// Test 7: TemplateParser - text nodes
test('TemplateParser: text nodes', () => {
    const parser = new TemplateParser();
    const elements = parser.parse('Text before <div>Content</div> Text after');
    return elements.length === 3 &&
           'type' in elements[0] && elements[0].type === 'text' &&
           'tagName' in elements[1] && elements[1].tagName === 'div' &&
           'type' in elements[2] && elements[2].type === 'text';
});

// Test 8: TemplateParser - zagnieżdżone elementy
test('TemplateParser: zagnieżdżone elementy', () => {
    const parser = new TemplateParser();
    const elements = parser.parse('<div><span>Nested</span></div>');
    return elements.length === 1 &&
           'children' in elements[0] &&
           elements[0].children.length === 1 &&
           'tagName' in elements[0].children[0] &&
           elements[0].children[0].tagName === 'span';
});

// Test 9: StructuralDirectiveHelper - canHandle *ngIf
test('StructuralDirectiveHelper: canHandle *ngIf', () => {
    const helper = new StructuralDirectiveHelper();
    const attr = { name: '*ngIf', value: 'show', type: AttributeType.STRUCTURAL_DIRECTIVE };
    return helper.canHandle(attr);
});

// Test 10: StructuralDirectiveHelper - process *ngIf
test('StructuralDirectiveHelper: process *ngIf', () => {
    const helper = new StructuralDirectiveHelper();
    const attr = { name: '*ngIf', value: 'show', type: AttributeType.STRUCTURAL_DIRECTIVE };
    const element = { tagName: 'div', attributes: [attr], children: [] };
    const result = helper.process({ element, attribute: attr, filePath: 'test.ts' });
    return result.transformed === true &&
           result.newAttribute?.name === '*ngIf' &&
           result.newAttribute?.value === 'show';
});

// Test 11: ControlFlowTransformer - brak transformacji bez @if
test('ControlFlowTransformer: brak @if', () => {
    const transformer = new ControlFlowTransformer();
    const input = '<div>Regular content</div>';
    const result = transformer.transform(input);
    return result === input;
});

// Test 12: TemplateParser - self-closing tags
test('TemplateParser: self-closing tags', () => {
    const parser = new TemplateParser();
    const elements = parser.parse('<img src="test.jpg" />');
    return elements.length === 1 &&
           'tagName' in elements[0] &&
           elements[0].tagName === 'img' &&
           elements[0].children.length === 0;
});

// Test 13: TemplateParser - komentarze są pomijane
test('TemplateParser: komentarze', () => {
    const parser = new TemplateParser();
    const elements = parser.parse('<!-- comment --><div>Content</div>');
    return elements.length === 1 &&
           'tagName' in elements[0] &&
           elements[0].tagName === 'div';
});

// Test 14: ControlFlowTransformer - wieloliniowy @if
test('ControlFlowTransformer: wieloliniowy @if', () => {
    const transformer = new ControlFlowTransformer();
    const input = `@if (show) {
    <div>
        Multi-line content
    </div>
}`;
    const result = transformer.transform(input);
    return result.includes('<ng-container *ngIf="show">') &&
           result.includes('Multi-line content');
});

// Test 15: TemplateParser - puste elementy
test('TemplateParser: puste elementy', () => {
    const parser = new TemplateParser();
    const elements = parser.parse('<div></div>');
    return elements.length === 1 &&
           'tagName' in elements[0] &&
           elements[0].tagName === 'div' &&
           elements[0].children.length === 0;
});

// Test 16: ControlFlowTransformer - prosty @for
test('ControlFlowTransformer: @for -> *ngFor', () => {
    const transformer = new ControlFlowTransformer();
    const input = '@for (item of items) { <div>{{ item }}</div> }';
    const result = transformer.transform(input);
    return result.includes('<ng-container *ngFor="let item of items">') &&
           result.includes('<div>{{ item }}</div>');
});

// Test 17: ControlFlowTransformer - @for z trackBy
test('ControlFlowTransformer: @for z trackBy', () => {
    const transformer = new ControlFlowTransformer();
    const input = '@for (item of items; track item.id) { <div>{{ item.name }}</div> }';
    const result = transformer.transform(input);
    return result.includes('<ng-container *ngFor="let item of items; trackBy: item.id">') &&
           result.includes('<div>{{ item.name }}</div>');
});

// Test 18: ControlFlowTransformer - @for z wieloliniową zawartością
test('ControlFlowTransformer: @for wieloliniowy', () => {
    const transformer = new ControlFlowTransformer();
    const input = `@for (user of users) {
    <div class="user-card">
        <h3>{{ user.name }}</h3>
        <p>{{ user.email }}</p>
    </div>
}`;
    const result = transformer.transform(input);
    return result.includes('<ng-container *ngFor="let user of users">') &&
           result.includes('user-card') &&
           result.includes('{{ user.name }}');
});

// Test 19: ControlFlowTransformer - @for i @if razem
test('ControlFlowTransformer: @for i @if razem', () => {
    const transformer = new ControlFlowTransformer();
    const input = `@for (item of items) {
    @if (item.active) {
        <div>Active item: {{ item.name }}</div>
    }
}`;
    const result = transformer.transform(input);
    return result.includes('<ng-container *ngFor="let item of items">') &&
           result.includes('<ng-container *ngIf="item.active">') &&
           result.includes('Active item:');
});

// Test 20: ControlFlowTransformer - @if z aliasem (as variable)
test('ControlFlowTransformer: @if (condition; as variable)', () => {
    const transformer = new ControlFlowTransformer();
    const input = '@if (device(); as dev) { <div>{{ dev.name }}</div> }';
    const result = transformer.transform(input);
    return result.includes('<ng-container *ngIf="device(); let dev">') &&
           result.includes('<div>{{ dev.name }}</div>');
});

// Test 21: ControlFlowTransformer - @if @else if z aliasem
test('ControlFlowTransformer: @if @else if z aliasem', () => {
    const transformer = new ControlFlowTransformer();
    const input = '@if (getUser(); as user) { <div>{{ user.name }}</div> } @else if (getGuest(); as guest) { <div>{{ guest.id }}</div> }';
    const result = transformer.transform(input);
    return result.includes('*ngIf="getUser(); let user"') &&
           result.includes('*ngIf="!(getUser()) && getGuest(); let guest"');
});

// Test 22: ControlFlowTransformer - @if z zagnieżdżonymi nawiasami w warunku
test('ControlFlowTransformer: @if z zagnieżdżonymi nawiasami', () => {
    const transformer = new ControlFlowTransformer();
    const input = '@if (getData(getValue()); as data) { <div>{{ data }}</div> }';
    const result = transformer.transform(input);
    return result.includes('*ngIf="getData(getValue()); let data"');
});

// Test 23: ControlFlowTransformer - @if z aliasem i białymi znakami
test('ControlFlowTransformer: @if z aliasem i białymi znakami', () => {
    const transformer = new ControlFlowTransformer();
    const input = '@if (  device()  ;  as   dev  ) { <div>{{ dev.name }}</div> }';
    const result = transformer.transform(input);
    return result.includes('*ngIf="device(); let dev"');
});

// Test 24: ControlFlowTransformer - @if z aliasem w @else if
test('ControlFlowTransformer: @if @else if oba z aliasem', () => {
    const transformer = new ControlFlowTransformer();
    const input = '@if (primary(); as p) { <div>{{ p }}</div> } @else if (secondary(); as s) { <div>{{ s }}</div> } @else { <div>None</div> }';
    const result = transformer.transform(input);
    return result.includes('*ngIf="primary(); let p"') &&
           result.includes('*ngIf="!(primary()) && secondary(); let s"') &&
           result.includes('*ngIf="!(primary()) && !(secondary())"');
});

// Test 25: ControlFlowTransformer - niekompletny @if (bez zamknięcia)
test('ControlFlowTransformer: niekompletny @if', () => {
    const transformer = new ControlFlowTransformer();
    const input = '@if (range.name) { content';
    const result = transformer.transform(input);
    return result.includes('<ng-container *ngIf="range.name">content</ng-container>');
});

// Test 26: ControlFlowTransformer - niekompletny @if na końcu
test('ControlFlowTransformer: niekompletny @if na końcu', () => {
    const transformer = new ControlFlowTransformer();
    const input = '} @if (prepared.sensor.loading) { ';
    const result = transformer.transform(input);
    return result.includes('<ng-container *ngIf="prepared.sensor.loading"></ng-container>');
});

// Test 27: ControlFlowTransformer - niekompletny @if bez nawiasu klamrowego
test('ControlFlowTransformer: niekompletny @if bez nawiasu klamrowego', () => {
    const transformer = new ControlFlowTransformer();
    const input = '@if (condition) ';
    const result = transformer.transform(input);
    return result.includes('<ng-container *ngIf="condition"></ng-container>');
});

// Test 28: ControlFlowTransformer - zagnieżdżony @if wewnątrz @for
test('ControlFlowTransformer: zagnieżdżony @if wewnątrz @for', () => {
    const transformer = new ControlFlowTransformer();
    const input = `@for (item of items) {
        @if (item.active) {
            <span>{{ item.name }}</span>
        }
    }`;
    const result = transformer.transform(input);
    return result.includes('<ng-container *ngFor="let item of items">') &&
           result.includes('<ng-container *ngIf="item.active">') &&
           !result.includes('@if') &&
           !result.includes('@for');
});

// Test 29: ControlFlowTransformer - zagnieżdżony @for wewnątrz @if
test('ControlFlowTransformer: zagnieżdżony @for wewnątrz @if', () => {
    const transformer = new ControlFlowTransformer();
    const input = `@if (hasItems) {
        @for (item of items; track item.id) {
            <div>{{ item }}</div>
        }
    }`;
    const result = transformer.transform(input);
    return result.includes('<ng-container *ngIf="hasItems">') &&
           result.includes('<ng-container *ngFor="let item of items; trackBy: item.id">') &&
           !result.includes('@if') &&
           !result.includes('@for');
});

// Test 30: ControlFlowTransformer - wielokrotnie zagnieżdżone @if wewnątrz @for
test('ControlFlowTransformer: wielokrotnie zagnieżdżone @if wewnątrz @for', () => {
    const transformer = new ControlFlowTransformer();
    const input = `@for (range of ranges; track $index) {
        <div>
            @if (range.name) {
                <span>{{ range.name }}</span>
            }
            <span>{{ range.min }}</span>
        </div>
    }`;
    const result = transformer.transform(input);
    return result.includes('<ng-container *ngFor="let range of ranges; trackBy: $index">') &&
           result.includes('<ng-container *ngIf="range.name">') &&
           !result.includes('@if') &&
           !result.includes('@for');
});

// Test 31: ControlFlowTransformer - kompleksowy przypadek z user template
test('ControlFlowTransformer: kompleksowy przypadek użytkownika', () => {
    const transformer = new ControlFlowTransformer();
    const input = `@if (prepared.sensor.ranges) {
    <span>
        @for (range of prepared.sensor.ranges; track $index) {
            <div>
                @if (range.name) {
                    <span>{{ range.name }}</span>
                }
                <span>{{ range.min }}</span>
                <span>{{ range.max }}</span>
            </div>
        }
    </span>
}`;
    const result = transformer.transform(input);
    return result.includes('<ng-container *ngIf="prepared.sensor.ranges">') &&
           result.includes('<ng-container *ngFor="let range of prepared.sensor.ranges; trackBy: $index">') &&
           result.includes('<ng-container *ngIf="range.name">') &&
           !result.includes('@if') &&
           !result.includes('@for');
});

// Test 32: ControlFlowTransformer - głęboko zagnieżdżone @if/@for/@if
test('ControlFlowTransformer: głęboko zagnieżdżone @if/@for/@if', () => {
    const transformer = new ControlFlowTransformer();
    const input = `@if (level1) {
        @for (item of items; track item.id) {
            @if (item.visible) {
                <div>{{ item.name }}</div>
            }
        }
    }`;
    const result = transformer.transform(input);
    return result.includes('<ng-container *ngIf="level1">') &&
           result.includes('<ng-container *ngFor="let item of items; trackBy: item.id">') &&
           result.includes('<ng-container *ngIf="item.visible">') &&
           !result.includes('@if') &&
           !result.includes('@for');
});

// Test 33: ControlFlowTransformer - @for z funkcją w iterable
test('ControlFlowTransformer: @for z funkcją w iterable', () => {
    const transformer = new ControlFlowTransformer();
    const input = '@for (item of getItems(); track item.id) { <div>{{ item }}</div> }';
    const result = transformer.transform(input);
    return result.includes('<ng-container *ngFor="let item of getItems(); trackBy: item.id">') &&
           !result.includes('@for');
});

// Test 34: ControlFlowTransformer - @for z zagnieżdżonymi nawiasami w funkcji
test('ControlFlowTransformer: @for z zagnieżdżonymi nawiasami w funkcji', () => {
    const transformer = new ControlFlowTransformer();
    const input = '@for (prepared of preparedSensors(); track prepared.sensor.id) { <div>{{ prepared.sensor.name }}</div> }';
    const result = transformer.transform(input);
    return result.includes('<ng-container *ngFor="let prepared of preparedSensors(); trackBy: prepared.sensor.id">') &&
           result.includes('prepared.sensor.name') &&
           !result.includes('@for');
});

// Test 35: ControlFlowTransformer - @for z metodą obiektu w iterable
test('ControlFlowTransformer: @for z metodą obiektu w iterable', () => {
    const transformer = new ControlFlowTransformer();
    const input = '@for (item of data.getItems(); track $index) { <span>{{ item }}</span> }';
    const result = transformer.transform(input);
    return result.includes('<ng-container *ngFor="let item of data.getItems(); trackBy: $index">') &&
           !result.includes('@for');
});

// Test 36: ControlFlowTransformer - @for z wieloma zagnieżdżonymi nawiasami
test('ControlFlowTransformer: @for z wieloma zagnieżdżonymi nawiasami', () => {
    const transformer = new ControlFlowTransformer();
    const input = '@for (item of service.getData(filter(value())); track item.id) { <div>{{ item }}</div> }';
    const result = transformer.transform(input);
    return result.includes('<ng-container *ngFor="let item of service.getData(filter(value())); trackBy: item.id">') &&
           !result.includes('@for');
});

// Test 37: ControlFlowTransformer - @for z funkcją i złożonym trackBy
test('ControlFlowTransformer: @for z funkcją i złożonym trackBy', () => {
    const transformer = new ControlFlowTransformer();
    const input = '@for (range of prepared.sensor.ranges; track $index) { <div>{{ range.name }}</div> }';
    const result = transformer.transform(input);
    return result.includes('<ng-container *ngFor="let range of prepared.sensor.ranges; trackBy: $index">') &&
           result.includes('range.name') &&
           !result.includes('@for');
});

console.log('\n=== PODSUMOWANIE ===');
console.log(`✅ Testy zaliczone: ${passedTests}`);
console.log(`❌ Testy niezaliczone: ${failedTests}`);
console.log(`📊 Procent sukcesu: ${((passedTests / (passedTests + failedTests)) * 100).toFixed(1)}%`);

if (failedTests === 0) {
    console.log('\n🎉 Wszystkie testy przeszły pomyślnie!');
} else {
    console.log('\n⚠️  Niektóre testy nie przeszły. Sprawdź implementację.');
}
