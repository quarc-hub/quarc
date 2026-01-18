import { Component, signal } from '../../../../../core/index';
import { SubstrPipe } from '../../../../../core/pipes/substr.pipe';

@Component({
    selector: 'app-substr-test',
    template: `
        <h2>Substr Pipe Test</h2>

        <div class="test" id="test-1">
            <h3>Test 1: Hardcoded with start and length</h3>
            <div class="result">{{ 'hello world' | substr:0:5 }}</div>
            <div class="expected">hello</div>
        </div>

        <div class="test" id="test-2">
            <h3>Test 2: Hardcoded with start only</h3>
            <div class="result">{{ 'hello world' | substr:6 }}</div>
            <div class="expected">world</div>
        </div>

        <div class="test" id="test-3">
            <h3>Test 3: Signal value</h3>
            <div class="result">{{ text() | substr:0:10 }}</div>
            <div class="expected">quarc fram</div>
        </div>

        <div class="test" id="test-4">
            <h3>Test 4: Method call</h3>
            <div class="result">{{ getText() | substr:5:6 }}</div>
            <div class="expected">method</div>
        </div>
    `,
    imports: [SubstrPipe],
})
export class SubstrTestComponent {
    text = signal('quarc framework');

    getText() {
        return 'from method call';
    }
}
