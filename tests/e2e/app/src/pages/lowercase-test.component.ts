import { Component, signal } from '../../../../../core/index';
import { LowerCasePipe } from '../../../../../core/pipes/lowercase.pipe';

@Component({
    selector: 'app-lowercase-test',
    template: `
        <h2>LowerCase Pipe Test</h2>

        <div class="test" id="test-1">
            <h3>Test 1: Hardcoded string</h3>
            <div class="result">{{ 'HELLO WORLD' | lowercase }}</div>
            <div class="expected">hello world</div>
        </div>

        <div class="test" id="test-2">
            <h3>Test 2: Signal value</h3>
            <div class="result">{{ text() | lowercase }}</div>
            <div class="expected">quarc framework</div>
        </div>

        <div class="test" id="test-3">
            <h3>Test 3: Method call</h3>
            <div class="result">{{ getText() | lowercase }}</div>
            <div class="expected">from method</div>
        </div>
    `,
    imports: [LowerCasePipe],
})
export class LowerCaseTestComponent {
    text = signal('QUARC FRAMEWORK');

    getText() {
        return 'FROM METHOD';
    }
}
