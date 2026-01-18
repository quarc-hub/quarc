import { Component, signal } from '../../../../../core/index';
import { JsonPipe } from '../../../../../core/pipes/json.pipe';

@Component({
    selector: 'app-json-test',
    template: `
        <h2>JSON Pipe Test</h2>

        <div class="test" id="test-1">
            <h3>Test 1: Number literal</h3>
            <pre class="result">{{ 123 | json }}</pre>
            <pre class="expected">123</pre>
        </div>

        <div class="test" id="test-2">
            <h3>Test 2: String literal</h3>
            <pre class="result">{{ "string" | json }}</pre>
            <pre class="expected">"string"</pre>
        </div>

        <div class="test" id="test-3">
            <h3>Test 3: Boolean literal</h3>
            <pre class="result">{{ true | json }}</pre>
            <pre class="expected">true</pre>
        </div>

        <div class="test" id="test-4">
            <h3>Test 4: Object from signal</h3>
            <pre class="result">{{ obj() | json }}</pre>
            <pre class="expected">{"name":"Test","value":123}</pre>
        </div>

        <div class="test" id="test-5">
            <h3>Test 5: Array from signal</h3>
            <pre class="result">{{ arr() | json }}</pre>
            <pre class="expected">[1,2,3]</pre>
        </div>

        <div class="test" id="test-6">
            <h3>Test 6: Object from method</h3>
            <pre class="result">{{ getObject() | json }}</pre>
            <pre class="expected">{"method":true}</pre>
        </div>
    `,
    imports: [JsonPipe],
})
export class JsonTestComponent {
    obj = signal({ name: 'Test', value: 123 });
    arr = signal([1, 2, 3]);

    getObject() {
        return { method: true };
    }
}
