/**
 * Szczegółowy test transformacji pipes w template
 */

import { TemplateTransformer } from '../../cli/processors/template/template-transformer';

console.log('\n=== Detailed Pipe Transformation Test ===\n');

const transformer = new TemplateTransformer();

// Test 1: Prosta interpolacja z pipe
const test1 = `<div>{{ 123 | json }}</div>`;
console.log('Test 1: Simple pipe');
console.log('Input:', test1);
const result1 = transformer.transformAll(test1);
console.log('Output:', result1);
console.log('');

// Sprawdź czy zawiera this._pipes
if (result1.includes('this._pipes')) {
    console.log('✓ Contains this._pipes');

    // Wyciągnij wyrażenie
    const match = result1.match(/\[inner-text\]="([^"]+)"/);
    if (match) {
        console.log('Expression:', match[1]);

        // Sprawdź składnię
        if (match[1].includes("this._pipes?.['json']?.transform")) {
            console.log('✓ Correct syntax');
        } else {
            console.log('✗ Incorrect syntax');
        }
    }
} else {
    console.log('✗ Does not contain this._pipes');
}

console.log('\n---\n');

// Test 2: String z pipe
const test2 = `<div>{{ "string" | json }}</div>`;
console.log('Test 2: String with pipe');
console.log('Input:', test2);
const result2 = transformer.transformAll(test2);
console.log('Output:', result2);
console.log('');

// Test 3: Boolean z pipe
const test3 = `<div>{{ true | json }}</div>`;
console.log('Test 3: Boolean with pipe');
console.log('Input:', test3);
const result3 = transformer.transformAll(test3);
console.log('Output:', result3);
console.log('');

// Test 4: Zmienna z pipe
const test4 = `<div>{{ value | json }}</div>`;
console.log('Test 4: Variable with pipe');
console.log('Input:', test4);
const result4 = transformer.transformAll(test4);
console.log('Output:', result4);
console.log('');

// Test 5: Sprawdzenie czy literały są poprawnie obsługiwane
console.log('=== Checking literal handling ===');
const literalTests = [
    { input: '123', expected: 'number literal' },
    { input: '"string"', expected: 'string literal' },
    { input: 'true', expected: 'boolean literal' },
    { input: 'value', expected: 'variable' },
];

literalTests.forEach(({ input, expected }) => {
    const template = `{{ ${input} | json }}`;
    const result = transformer.transformAll(template);
    const match = result.match(/transform\(([^)]+)\)/);
    if (match) {
        console.log(`${expected}: transform(${match[1]})`);
    }
});

console.log('\n✅ Detailed transformation test completed');
