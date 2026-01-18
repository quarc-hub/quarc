import { Pipe, PipeTransform } from '../angular/pipe';

@Pipe({ name: 'pascalcase' })
export class PascalCasePipe implements PipeTransform {
    transform(value: string | null | undefined): string {
        if (value == null) return '';

        return String(value)
            .replace(/[-_\s]+(.)?/g, (_, char) => char ? char.toUpperCase() : '')
            .replace(/^[a-z]/, char => char.toUpperCase());
    }
}
