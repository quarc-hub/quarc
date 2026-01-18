/**
 * Test aby upewnić się, że operatory logiczne (||, &&) nie są mylone z pipe separator |
 */

import { TemplateTransformer } from '../../cli/processors/template/template-transformer';

console.log('\n=== Test: Pipe vs Logical Operators ===\n');

const transformer = new TemplateTransformer();

// Test 1: Operator || nie powinien być traktowany jako pipe
const test1 = `{{ value || 'default' }}`;
console.log('Test 1: Operator ||');
console.log('Input:', test1);
const result1 = transformer.transformInterpolation(test1);
console.log('Output:', result1);
const pass1 = !result1.includes('this._pipes') && result1.includes('||');
console.log('Pass:', pass1);

// Test 2: Operator && nie powinien być traktowany jako pipe
const test2 = `{{ condition && value }}`;
console.log('\nTest 2: Operator &&');
console.log('Input:', test2);
const result2 = transformer.transformInterpolation(test2);
console.log('Output:', result2);
const pass2 = !result2.includes('this._pipes') && result2.includes('&&');
console.log('Pass:', pass2);

// Test 3: Prawdziwy pipe powinien być transformowany
const test3 = `{{ value | uppercase }}`;
console.log('\nTest 3: Prawdziwy pipe');
console.log('Input:', test3);
const result3 = transformer.transformInterpolation(test3);
console.log('Output:', result3);
const pass3 = result3.includes('this._pipes') && result3.includes('uppercase');
console.log('Pass:', pass3);

// Test 4: Pipe z argumentami
const test4 = `{{ value | slice:0:10 }}`;
console.log('\nTest 4: Pipe z argumentami');
console.log('Input:', test4);
const result4 = transformer.transformInterpolation(test4);
console.log('Output:', result4);
const pass4 = result4.includes('this._pipes') && result4.includes('slice');
console.log('Pass:', pass4);

// Test 5: Kombinacja || i pipe
const test5 = `{{ (value || 'default') | uppercase }}`;
console.log('\nTest 5: Kombinacja || i pipe');
console.log('Input:', test5);
const result5 = transformer.transformInterpolation(test5);
console.log('Output:', result5);
const pass5 = result5.includes('this._pipes') && result5.includes('||') && result5.includes('uppercase');
console.log('Pass:', pass5);

// Test 6: Wielokrotne ||
const test6 = `{{ value1 || value2 || 'default' }}`;
console.log('\nTest 6: Wielokrotne ||');
console.log('Input:', test6);
const result6 = transformer.transformInterpolation(test6);
console.log('Output:', result6);
const pass6 = !result6.includes('this._pipes') && (result6.match(/\|\|/g) || []).length === 2;
console.log('Pass:', pass6);

// Test 7: Łańcuch pipes
const test7 = `{{ value | lowercase | slice:0:5 }}`;
console.log('\nTest 7: Łańcuch pipes');
console.log('Input:', test7);
const result7 = transformer.transformInterpolation(test7);
console.log('Output:', result7);
const pass7 = result7.includes('lowercase') && result7.includes('slice');
console.log('Pass:', pass7);

const allTests = [pass1, pass2, pass3, pass4, pass5, pass6, pass7];
const passed = allTests.filter(p => p).length;
const failed = allTests.length - passed;

console.log('\n=== Summary ===');
console.log(`Passed: ${passed}/${allTests.length}`);
console.log(`Failed: ${failed}/${allTests.length}`);

if (failed > 0) {
    console.error('\n❌ PIPE VS LOGICAL OPERATORS TEST FAILED');
    process.exit(1);
} else {
    console.log('\n✅ PIPE VS LOGICAL OPERATORS TEST PASSED');
    process.exit(0);
}
