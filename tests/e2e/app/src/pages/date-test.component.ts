import { Component, signal } from '../../../../../core/index';
import { DatePipe } from '../../../../../core/pipes/date.pipe';

@Component({
    selector: 'app-date-test',
    template: `
        <h2>Date Pipe Test</h2>

        <div class="test" id="test-1">
            <h3>Test 1: Custom format yyyy-MM-dd</h3>
            <div class="result">{{ date() | date:'yyyy-MM-dd' }}</div>
            <div class="expected">2024-01-15</div>
        </div>

        <div class="test" id="test-2">
            <h3>Test 2: Custom format HH:mm:ss</h3>
            <div class="result">{{ date() | date:'HH:mm:ss' }}</div>
            <div class="expected">14:30:45</div>
        </div>

        <div class="test" id="test-3">
            <h3>Test 3: Short date</h3>
            <div class="result">{{ date() | date:'shortDate' }}</div>
            <div class="expected-pattern">01/15/24</div>
        </div>

        <div class="test" id="test-4">
            <h3>Test 4: From method</h3>
            <div class="result">{{ getDate() | date:'yyyy-MM-dd' }}</div>
            <div class="expected">2024-01-15</div>
        </div>
    `,
    imports: [DatePipe],
})
export class DateTestComponent {
    date = signal(new Date('2024-01-15T14:30:45'));

    getDate() {
        return new Date('2024-01-15T14:30:45');
    }
}
