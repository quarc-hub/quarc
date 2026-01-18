import { Component, signal } from '../../../../../core/index';
import { UpperCasePipe } from '../../../../../core/pipes/uppercase.pipe';
import { LowerCasePipe } from '../../../../../core/pipes/lowercase.pipe';
import { SubstrPipe } from '../../../../../core/pipes/substr.pipe';
import { CamelCasePipe } from '../../../../../core/pipes/camelcase.pipe';

@Component({
    selector: 'app-chain-test',
    template: `
        <h2>Pipe Chain Test</h2>

        <div class="test" id="test-1">
            <h3>Test 1: lowercase | uppercase</h3>
            <div class="result">{{ 'Hello' | lowercase | uppercase }}</div>
            <div class="expected">HELLO</div>
        </div>

        <div class="test" id="test-2">
            <h3>Test 2: uppercase | substr</h3>
            <div class="result">{{ 'hello world' | uppercase | substr:0:5 }}</div>
            <div class="expected">HELLO</div>
        </div>

        <div class="test" id="test-3">
            <h3>Test 3: Signal with chain</h3>
            <div class="result">{{ text() | lowercase | camelcase }}</div>
            <div class="expected">helloWorld</div>
        </div>

        <div class="test" id="test-4">
            <h3>Test 4: Method with chain</h3>
            <div class="result">{{ getText() | uppercase | substr:0:4 }}</div>
            <div class="expected">TEST</div>
        </div>

        <div class="test" id="test-5">
            <h3>Test 5: Triple chain</h3>
            <div class="result">{{ 'HELLO-WORLD' | lowercase | camelcase | uppercase }}</div>
            <div class="expected">HELLOWORLD</div>
        </div>
    `,
    imports: [UpperCasePipe, LowerCasePipe, SubstrPipe, CamelCasePipe],
})
export class ChainTestComponent {
    text = signal('HELLO-WORLD');

    getText() {
        return 'test value';
    }
}
