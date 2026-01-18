import { Component, signal } from '../../../../../core/index';
import { CamelCasePipe } from '../../../../../core/pipes/camelcase.pipe';
import { PascalCasePipe } from '../../../../../core/pipes/pascalcase.pipe';
import { SnakeCasePipe } from '../../../../../core/pipes/snakecase.pipe';
import { KebabCasePipe } from '../../../../../core/pipes/kebabcase.pipe';

@Component({
    selector: 'app-case-test',
    template: `
        <h2>Case Pipes Test</h2>

        <div class="test" id="test-1">
            <h3>Test 1: CamelCase</h3>
            <div class="result">{{ 'hello-world' | camelcase }}</div>
            <div class="expected">helloWorld</div>
        </div>

        <div class="test" id="test-2">
            <h3>Test 2: PascalCase</h3>
            <div class="result">{{ 'hello-world' | pascalcase }}</div>
            <div class="expected">HelloWorld</div>
        </div>

        <div class="test" id="test-3">
            <h3>Test 3: SnakeCase</h3>
            <div class="result">{{ 'helloWorld' | snakecase }}</div>
            <div class="expected">hello_world</div>
        </div>

        <div class="test" id="test-4">
            <h3>Test 4: KebabCase</h3>
            <div class="result">{{ 'helloWorld' | kebabcase }}</div>
            <div class="expected">hello-world</div>
        </div>

        <div class="test" id="test-5">
            <h3>Test 5: CamelCase from signal</h3>
            <div class="result">{{ text() | camelcase }}</div>
            <div class="expected">testValue</div>
        </div>
    `,
    imports: [CamelCasePipe, PascalCasePipe, SnakeCasePipe, KebabCasePipe],
})
export class CaseTestComponent {
    text = signal('test-value');
}
