import { Pipe, PipeTransform } from '../angular/pipe';

@Pipe({ name: 'substr' })
export class SubstrPipe implements PipeTransform {
    transform(value: string | null | undefined, start: number, length?: number): string {
        if (value == null) return '';

        const str = String(value);

        if (length !== undefined) {
            return str.substr(start, length);
        }

        return str.substr(start);
    }
}
