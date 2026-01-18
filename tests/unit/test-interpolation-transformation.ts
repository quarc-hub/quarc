/**
 * Test transformacji interpolacji {{ }}
 * Sprawdza czy interpolacja działa poprawnie po dodaniu obsługi pipes
 */

import { TemplateTransformer } from '../../cli/processors/template/template-transformer';

console.log('\n=== Test: Interpolation Transformation ===\n');

const transformer = new TemplateTransformer();

// Test 1: Prosta interpolacja bez pipes
const template1 = `<div>{{ device.name }}</div>`;
console.log('Test 1: Prosta interpolacja');
console.log('Input:', template1);
const result1 = transformer.transformInterpolation(template1);
console.log('Output:', result1);
console.log('Contains [innerText]:', result1.includes('[innerText]'));

// Test 2: Interpolacja z operatorem ||
const template2 = `<div>{{ device.name || 'Unnamed' }}</div>`;
console.log('\n\nTest 2: Interpolacja z operatorem ||');
console.log('Input:', template2);
const result2 = transformer.transformInterpolation(template2);
console.log('Output:', result2);

// Test 3: Interpolacja z wywołaniem funkcji
const template3 = `<div>{{ deviceCount() }}</div>`;
console.log('\n\nTest 3: Interpolacja z wywołaniem funkcji');
console.log('Input:', template3);
const result3 = transformer.transformInterpolation(template3);
console.log('Output:', result3);

// Test 4: Wiele interpolacji w jednym elemencie
const template4 = `<div>{{ device.name }} - {{ device.address }}</div>`;
console.log('\n\nTest 4: Wiele interpolacji');
console.log('Input:', template4);
const result4 = transformer.transformInterpolation(template4);
console.log('Output:', result4);

// Test 5: Interpolacja w atrybucie
const template5 = `<div title="{{ device.name }}">Content</div>`;
console.log('\n\nTest 5: Interpolacja w atrybucie');
console.log('Input:', template5);
const result5 = transformer.transformInterpolation(template5);
console.log('Output:', result5);

// Test 6: Pełny template jak w devices component
const template6 = `
<div class="content">
    @for (device of devices(); track device.address) {
        <div class="device card">
            <div class="name">{{ device.name || 'Unnamed' }}</div>
            <div class="address">{{ device.address }}</div>
        </div>
    }
</div>
<div class="footer">
    Devices: <span>{{ deviceCount() }}</span>
</div>
`;
console.log('\n\nTest 6: Pełny template devices component');
console.log('Input:', template6);
const result6 = transformer.transformAll(template6);
console.log('Output:', result6);

// Sprawdzenie czy wszystkie transformacje są poprawne
const tests = [
    {
        name: 'Test 1: Simple interpolation transformed',
        pass: result1.includes('[innerText]') && result1.includes('device.name')
    },
    {
        name: 'Test 2: OR operator preserved',
        pass: result2.includes('||') && result2.includes('Unnamed')
    },
    {
        name: 'Test 3: Function call preserved',
        pass: result3.includes('deviceCount()')
    },
    {
        name: 'Test 4: Multiple interpolations',
        pass: (result4.match(/\[innerText\]/g) || []).length === 2
    },
    {
        name: 'Test 5: Attribute interpolation',
        pass: result5.includes('data-quarc-attr-bindings') || result5.includes('[attr.title]')
    },
    {
        name: 'Test 6: Full template has *ngFor',
        pass: result6.includes('*ngFor')
    },
    {
        name: 'Test 6: Full template has interpolations',
        pass: result6.includes('[inner-text]') || result6.includes('[innerText]')
    },
    {
        name: 'Test 6: No pipe errors in simple expressions',
        pass: !result6.includes('this._pipes') || result6.includes('|')
    }
];

console.log('\n\n=== Test Results ===');
let passed = 0;
let failed = 0;

tests.forEach(test => {
    const status = test.pass ? '✓ PASS' : '✗ FAIL';
    console.log(`${status}: ${test.name}`);
    if (test.pass) passed++;
    else failed++;
});

console.log(`\nTotal: ${passed} passed, ${failed} failed`);

// Dodatkowa diagnostyka
console.log('\n\n=== Diagnostyka ===');
console.log('Czy result1 zawiera this._pipes?:', result1.includes('this._pipes'));
console.log('Czy result2 zawiera this._pipes?:', result2.includes('this._pipes'));
console.log('Czy result3 zawiera this._pipes?:', result3.includes('this._pipes'));
console.log('\nResult6 check:');
console.log('Zawiera [inner-text]?:', result6.includes('[inner-text]'));
console.log('Zawiera [innerText]?:', result6.includes('[innerText]'));
console.log('Liczba wystąpień [inner-text]:', (result6.match(/\[inner-text\]/g) || []).length);
console.log('Liczba wystąpień [innerText]:', (result6.match(/\[innerText\]/g) || []).length);

if (failed > 0) {
    console.error('\n❌ INTERPOLATION TRANSFORMATION TEST FAILED');
    process.exit(1);
} else {
    console.log('\n✅ INTERPOLATION TRANSFORMATION TEST PASSED');
    process.exit(0);
}
