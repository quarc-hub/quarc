"use strict";
/**
 * Testy funkcjonalne dla Quarc
 * Sprawdzają czy podstawowa funkcjonalność działa poprawnie
 */
Object.defineProperty(exports, "__esModule", { value: true });
const control_flow_transformer_1 = require("../cli/helpers/control-flow-transformer");
const template_parser_1 = require("../cli/helpers/template-parser");
const structural_directive_helper_1 = require("../cli/helpers/structural-directive-helper");
console.log('=== TESTY FUNKCJONALNE QUARC ===\n');
let passedTests = 0;
let failedTests = 0;
function test(name, fn) {
    try {
        const result = fn();
        if (result) {
            console.log(`✅ ${name}`);
            passedTests++;
        }
        else {
            console.log(`❌ ${name}`);
            failedTests++;
        }
    }
    catch (e) {
        console.log(`❌ ${name} - Error: ${e}`);
        failedTests++;
    }
}
// Test 1: ControlFlowTransformer - prosty @if
test('ControlFlowTransformer: @if -> *ngIf', () => {
    const transformer = new control_flow_transformer_1.ControlFlowTransformer();
    const input = '@if (show) { <div>Content</div> }';
    const result = transformer.transform(input);
    return result.includes('<ng-container *ngIf="show">') && result.includes('Content');
});
// Test 2: ControlFlowTransformer - @if @else
test('ControlFlowTransformer: @if @else', () => {
    const transformer = new control_flow_transformer_1.ControlFlowTransformer();
    const input = '@if (a) { <div>A</div> } @else { <div>B</div> }';
    const result = transformer.transform(input);
    return result.includes('*ngIf="a"') && result.includes('*ngIf="!(a)"');
});
// Test 3: ControlFlowTransformer - @if @else if @else
test('ControlFlowTransformer: @if @else if @else', () => {
    const transformer = new control_flow_transformer_1.ControlFlowTransformer();
    const input = '@if (a) { <div>A</div> } @else if (b) { <div>B</div> } @else { <div>C</div> }';
    const result = transformer.transform(input);
    return result.includes('*ngIf="a"') &&
        result.includes('*ngIf="!(a) && b"') &&
        result.includes('*ngIf="!(a) && !(b)"');
});
// Test 4: TemplateParser - parsowanie prostego HTML
test('TemplateParser: prosty HTML', () => {
    const parser = new template_parser_1.TemplateParser();
    const elements = parser.parse('<div>Content</div>');
    return elements.length === 1 &&
        'tagName' in elements[0] &&
        elements[0].tagName === 'div';
});
// Test 5: TemplateParser - parsowanie atrybutów
test('TemplateParser: atrybuty', () => {
    const parser = new template_parser_1.TemplateParser();
    const elements = parser.parse('<div class="test" id="main">Content</div>');
    return elements.length === 1 &&
        'attributes' in elements[0] &&
        elements[0].attributes.length === 2;
});
// Test 6: TemplateParser - *ngIf jako structural directive
test('TemplateParser: *ngIf detection', () => {
    const parser = new template_parser_1.TemplateParser();
    const elements = parser.parse('<div *ngIf="show">Content</div>');
    if (elements.length === 0 || !('attributes' in elements[0]))
        return false;
    const attr = elements[0].attributes.find(a => a.name === '*ngIf');
    return attr !== undefined && attr.type === 'structural';
});
// Test 7: TemplateParser - text nodes
test('TemplateParser: text nodes', () => {
    const parser = new template_parser_1.TemplateParser();
    const elements = parser.parse('Text before <div>Content</div> Text after');
    return elements.length === 3 &&
        'type' in elements[0] && elements[0].type === 'text' &&
        'tagName' in elements[1] && elements[1].tagName === 'div' &&
        'type' in elements[2] && elements[2].type === 'text';
});
// Test 8: TemplateParser - zagnieżdżone elementy
test('TemplateParser: zagnieżdżone elementy', () => {
    const parser = new template_parser_1.TemplateParser();
    const elements = parser.parse('<div><span>Nested</span></div>');
    return elements.length === 1 &&
        'children' in elements[0] &&
        elements[0].children.length === 1 &&
        'tagName' in elements[0].children[0] &&
        elements[0].children[0].tagName === 'span';
});
// Test 9: StructuralDirectiveHelper - canHandle *ngIf
test('StructuralDirectiveHelper: canHandle *ngIf', () => {
    const helper = new structural_directive_helper_1.StructuralDirectiveHelper();
    const attr = { name: '*ngIf', value: 'show', type: template_parser_1.AttributeType.STRUCTURAL_DIRECTIVE };
    return helper.canHandle(attr);
});
// Test 10: StructuralDirectiveHelper - process *ngIf
test('StructuralDirectiveHelper: process *ngIf', () => {
    const helper = new structural_directive_helper_1.StructuralDirectiveHelper();
    const attr = { name: '*ngIf', value: 'show', type: template_parser_1.AttributeType.STRUCTURAL_DIRECTIVE };
    const element = { tagName: 'div', attributes: [attr], children: [] };
    const result = helper.process({ element, attribute: attr, filePath: 'test.ts' });
    return result.transformed === true &&
        result.newAttribute?.name === '*ngIf' &&
        result.newAttribute?.value === 'show';
});
// Test 11: ControlFlowTransformer - brak transformacji bez @if
test('ControlFlowTransformer: brak @if', () => {
    const transformer = new control_flow_transformer_1.ControlFlowTransformer();
    const input = '<div>Regular content</div>';
    const result = transformer.transform(input);
    return result === input;
});
// Test 12: TemplateParser - self-closing tags
test('TemplateParser: self-closing tags', () => {
    const parser = new template_parser_1.TemplateParser();
    const elements = parser.parse('<img src="test.jpg" />');
    return elements.length === 1 &&
        'tagName' in elements[0] &&
        elements[0].tagName === 'img' &&
        elements[0].children.length === 0;
});
// Test 13: TemplateParser - komentarze są pomijane
test('TemplateParser: komentarze', () => {
    const parser = new template_parser_1.TemplateParser();
    const elements = parser.parse('<!-- comment --><div>Content</div>');
    return elements.length === 1 &&
        'tagName' in elements[0] &&
        elements[0].tagName === 'div';
});
// Test 14: ControlFlowTransformer - wieloliniowy @if
test('ControlFlowTransformer: wieloliniowy @if', () => {
    const transformer = new control_flow_transformer_1.ControlFlowTransformer();
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
    const parser = new template_parser_1.TemplateParser();
    const elements = parser.parse('<div></div>');
    return elements.length === 1 &&
        'tagName' in elements[0] &&
        elements[0].tagName === 'div' &&
        elements[0].children.length === 0;
});
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
