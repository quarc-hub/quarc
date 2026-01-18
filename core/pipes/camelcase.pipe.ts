import { Pipe, PipeTransform } from '../angular/pipe';

@Pipe({ name: 'camelcase' })
export class CamelCasePipe implements PipeTransform {
    transform(value: string | null | undefined): string {
        if (value == null) return '';

        return String(value)
            .replace(/[-_\s]+(.)?/g, (_, char) => char ? char.toUpperCase() : '')
            .replace(/^[A-Z]/, char => char.toLowerCase());
    }
}
