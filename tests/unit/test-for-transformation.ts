/**
 * Test transformacji @for do *ngFor
 * Reprodukuje problem z komponentu devices z /web/IoT/Ant
 */

import { ControlFlowTransformer } from '../../cli/helpers/control-flow-transformer';

console.log('\n=== Test: @for Transformation ===\n');

const transformer = new ControlFlowTransformer();

// Test 1: Prosty @for jak w devices component
const template1 = `
<div class="content">
    @for (device of devices(); track device.address) {
        <div class="device card">
            <div class="name">{{ device.name }}</div>
        </div>
    }
</div>
`;

console.log('Test 1: Prosty @for z track');
console.log('Input:', template1);
const result1 = transformer.transform(template1);
console.log('Output:', result1);
console.log('Contains *ngFor:', result1.includes('*ngFor'));
console.log('Contains ng-container:', result1.includes('ng-container'));

// Test 2: @for z wywołaniem funkcji (devices())
const template2 = `@for (item of items(); track item.id) {
    <div>{{ item.name }}</div>
}`;

console.log('\n\nTest 2: @for z wywołaniem funkcji');
console.log('Input:', template2);
const result2 = transformer.transform(template2);
console.log('Output:', result2);

// Test 3: Zagnieżdżony @for
const template3 = `
@for (device of devices(); track device.address) {
    <div>
        @for (sensor of device.sensors; track sensor.id) {
            <span>{{ sensor.name }}</span>
        }
    </div>
}
`;

console.log('\n\nTest 3: Zagnieżdżony @for');
console.log('Input:', template3);
const result3 = transformer.transform(template3);
console.log('Output:', result3);

// Test 4: @for z interpolacją w środku
const template4 = `
@for (device of devices(); track device.address) {
    <div class="device">
        <div>{{ device.name || 'Unnamed' }}</div>
        <div>{{ device.address }}</div>
    </div>
}
`;

console.log('\n\nTest 4: @for z interpolacją');
console.log('Input:', template4);
const result4 = transformer.transform(template4);
console.log('Output:', result4);

// Sprawdzenie czy wszystkie transformacje zawierają wymagane elementy
const tests = [
    { name: 'Test 1: *ngFor exists', pass: result1.includes('*ngFor') },
    { name: 'Test 1: ng-container exists', pass: result1.includes('ng-container') },
    { name: 'Test 1: track preserved', pass: result1.includes('track') || result1.includes('trackBy') },
    { name: 'Test 2: *ngFor exists', pass: result2.includes('*ngFor') },
    { name: 'Test 3: nested *ngFor exists', pass: (result3.match(/\*ngFor/g) || []).length === 2 },
    { name: 'Test 4: interpolation preserved', pass: result4.includes('device.name') },
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

if (failed > 0) {
    console.error('\n❌ @FOR TRANSFORMATION TEST FAILED');
    process.exit(1);
} else {
    console.log('\n✅ @FOR TRANSFORMATION TEST PASSED');
    process.exit(0);
}
