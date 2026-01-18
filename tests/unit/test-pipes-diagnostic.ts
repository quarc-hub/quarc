/**
 * Test diagnostyczny - sprawdza czy _pipes jest dostępne w komponencie
 */

import { Component, signal } from '../../core/index';
import { JsonPipe } from '../../core/pipes/json.pipe';

@Component({
    selector: 'test-diagnostic',
    template: '<div>Test</div>',
    imports: [JsonPipe],
})
class DiagnosticComponent {
    value = signal(123);

    constructor() {
        console.log('DiagnosticComponent constructor');
        console.log('this._pipes:', (this as any)._pipes);
    }

    ngOnInit() {
        console.log('DiagnosticComponent ngOnInit');
        console.log('this._pipes:', (this as any)._pipes);

        setTimeout(() => {
            console.log('DiagnosticComponent after timeout');
            console.log('this._pipes:', (this as any)._pipes);

            if ((this as any)._pipes) {
                console.log('_pipes keys:', Object.keys((this as any)._pipes));
                console.log('_pipes.json:', (this as any)._pipes['json']);

                if ((this as any)._pipes['json']) {
                    const result = (this as any)._pipes['json'].transform(123);
                    console.log('Manual pipe call result:', result);
                }
            }
        }, 100);
    }
}

console.log('\n=== Diagnostic Test ===\n');

const comp = new DiagnosticComponent();
console.log('After construction, comp._pipes:', (comp as any)._pipes);

// Symulacja tego co robi WebComponent
const pipeInstance = new JsonPipe();
(comp as any)._pipes = { json: pipeInstance };

console.log('After manual assignment, comp._pipes:', (comp as any)._pipes);
console.log('Manual transform test:', (comp as any)._pipes.json.transform(123));

console.log('\n✅ Diagnostic test completed - check logs above');
