import { Pipe, PipeTransform } from '../angular/pipe';

@Pipe({ name: 'kebabcase' })
export class KebabCasePipe implements PipeTransform {
    transform(value: string | null | undefined): string {
        if (value == null) return '';

        return String(value)
            .replace(/([A-Z])/g, '-$1')
            .replace(/[_\s]+/g, '-')
            .replace(/^-/, '')
            .toLowerCase();
    }
}
