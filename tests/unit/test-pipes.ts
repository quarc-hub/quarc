/**
 * Testy dla podstawowych pipes
 */

import {
    UpperCasePipe,
    LowerCasePipe,
    JsonPipe,
    CamelCasePipe,
    PascalCasePipe,
    SnakeCasePipe,
    KebabCasePipe,
    SubstrPipe,
    DatePipe
} from '../../core/pipes/index';

console.log('\n=== Test: Quarc Pipes ===\n');

const tests: { name: string; pass: boolean }[] = [];

// UpperCasePipe
console.log('--- UpperCasePipe ---');
const upperPipe = new UpperCasePipe();
tests.push({ name: 'uppercase: hello → HELLO', pass: upperPipe.transform('hello') === 'HELLO' });
tests.push({ name: 'uppercase: null → ""', pass: upperPipe.transform(null) === '' });
tests.push({ name: 'uppercase: undefined → ""', pass: upperPipe.transform(undefined) === '' });

// LowerCasePipe
console.log('--- LowerCasePipe ---');
const lowerPipe = new LowerCasePipe();
tests.push({ name: 'lowercase: HELLO → hello', pass: lowerPipe.transform('HELLO') === 'hello' });
tests.push({ name: 'lowercase: null → ""', pass: lowerPipe.transform(null) === '' });

// JsonPipe
console.log('--- JsonPipe ---');
const jsonPipe = new JsonPipe();
const obj = { name: 'Test', value: 123 };
const jsonResult = jsonPipe.transform(obj);
tests.push({ name: 'json: object serialized', pass: jsonResult.includes('"name"') && jsonResult.includes('"Test"') });
tests.push({ name: 'json: array serialized', pass: jsonPipe.transform([1, 2, 3]).includes('[') });

// CamelCasePipe
console.log('--- CamelCasePipe ---');
const camelPipe = new CamelCasePipe();
tests.push({ name: 'camelcase: hello-world → helloWorld', pass: camelPipe.transform('hello-world') === 'helloWorld' });
tests.push({ name: 'camelcase: hello_world → helloWorld', pass: camelPipe.transform('hello_world') === 'helloWorld' });
tests.push({ name: 'camelcase: hello world → helloWorld', pass: camelPipe.transform('hello world') === 'helloWorld' });
tests.push({ name: 'camelcase: HelloWorld → helloWorld', pass: camelPipe.transform('HelloWorld') === 'helloWorld' });

// PascalCasePipe
console.log('--- PascalCasePipe ---');
const pascalPipe = new PascalCasePipe();
tests.push({ name: 'pascalcase: hello-world → HelloWorld', pass: pascalPipe.transform('hello-world') === 'HelloWorld' });
tests.push({ name: 'pascalcase: hello_world → HelloWorld', pass: pascalPipe.transform('hello_world') === 'HelloWorld' });
tests.push({ name: 'pascalcase: hello world → HelloWorld', pass: pascalPipe.transform('hello world') === 'HelloWorld' });

// SnakeCasePipe
console.log('--- SnakeCasePipe ---');
const snakePipe = new SnakeCasePipe();
tests.push({ name: 'snakecase: helloWorld → hello_world', pass: snakePipe.transform('helloWorld') === 'hello_world' });
tests.push({ name: 'snakecase: HelloWorld → hello_world', pass: snakePipe.transform('HelloWorld') === 'hello_world' });
tests.push({ name: 'snakecase: hello-world → hello_world', pass: snakePipe.transform('hello-world') === 'hello_world' });
tests.push({ name: 'snakecase: hello world → hello_world', pass: snakePipe.transform('hello world') === 'hello_world' });

// KebabCasePipe
console.log('--- KebabCasePipe ---');
const kebabPipe = new KebabCasePipe();
tests.push({ name: 'kebabcase: helloWorld → hello-world', pass: kebabPipe.transform('helloWorld') === 'hello-world' });
tests.push({ name: 'kebabcase: HelloWorld → hello-world', pass: kebabPipe.transform('HelloWorld') === 'hello-world' });
tests.push({ name: 'kebabcase: hello_world → hello-world', pass: kebabPipe.transform('hello_world') === 'hello-world' });
tests.push({ name: 'kebabcase: hello world → hello-world', pass: kebabPipe.transform('hello world') === 'hello-world' });

// SubstrPipe
console.log('--- SubstrPipe ---');
const substrPipe = new SubstrPipe();
tests.push({ name: 'substr: "hello"(0, 3) → "hel"', pass: substrPipe.transform('hello', 0, 3) === 'hel' });
tests.push({ name: 'substr: "hello"(2) → "llo"', pass: substrPipe.transform('hello', 2) === 'llo' });
tests.push({ name: 'substr: null → ""', pass: substrPipe.transform(null, 0) === '' });

// DatePipe
console.log('--- DatePipe ---');
const datePipe = new DatePipe();
const testDate = new Date('2024-01-15T14:30:45');

const shortResult = datePipe.transform(testDate, 'short');
tests.push({ name: 'date: short format contains date', pass: shortResult.includes('01') || shortResult.includes('1') });

const mediumResult = datePipe.transform(testDate, 'medium');
tests.push({ name: 'date: medium format contains month', pass: mediumResult.includes('Jan') });

const customResult = datePipe.transform(testDate, 'yyyy-MM-dd');
tests.push({ name: 'date: custom format yyyy-MM-dd', pass: customResult === '2024-01-15' });

const customTimeResult = datePipe.transform(testDate, 'HH:mm:ss');
tests.push({ name: 'date: custom format HH:mm:ss', pass: customTimeResult === '14:30:45' });

tests.push({ name: 'date: null → ""', pass: datePipe.transform(null) === '' });
tests.push({ name: 'date: invalid date → original', pass: datePipe.transform('invalid').includes('invalid') });

// Podsumowanie
console.log('\n=== Test Results ===');
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
    console.error('\n❌ PIPES TEST FAILED');
    process.exit(1);
} else {
    console.log('\n✅ PIPES TEST PASSED');
    process.exit(0);
}
