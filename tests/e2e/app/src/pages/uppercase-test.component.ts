import { Component, signal } from '../../../../../core/index';
import { UpperCasePipe } from '../../../../../core/pipes/uppercase.pipe';

@Component({
    selector: 'app-uppercase-test',
    template: `
        <h2>UpperCase Pipe Test</h2>

        <div class="test" id="test-1">
            <h3>Test 1: Hardcoded string</h3>
            <div class="result">{{ 'hello world' | uppercase }}</div>
            <div class="expected">HELLO WORLD</div>
        </div>

        <div class="test" id="test-2">
            <h3>Test 2: Signal value</h3>
            <div class="result">{{ text() | uppercase }}</div>
            <div class="expected">QUARC FRAMEWORK</div>
        </div>

        <div class="test" id="test-3">
            <h3>Test 3: Method call</h3>
            <div class="result">{{ getText() | uppercase }}</div>
            <div class="expected">FROM METHOD</div>
        </div>

        <div class="test" id="test-4">
            <h3>Test 4: With || operator</h3>
            <div class="result">{{ nullValue() || 'default' | uppercase }}</div>
            <div class="expected">DEFAULT</div>
        </div>
    `,
    imports: [UpperCasePipe],
})
export class UpperCaseTestComponent {
    text = signal('quarc framework');
    nullValue = signal(null);

    getText() {
        return 'from method';
    }
}
