import { Pipe, PipeTransform } from '../angular/pipe';

@Pipe({ name: 'json' })
export class JsonPipe implements PipeTransform {
    transform(value: any): string {
        try {
            return JSON.stringify(value, null, 2);
        } catch (e) {
            return String(value);
        }
    }
}
