import { Pipe, PipeTransform } from '../angular/pipe';

@Pipe({ name: 'snakecase' })
export class SnakeCasePipe implements PipeTransform {
    transform(value: string | null | undefined): string {
        if (value == null) return '';

        return String(value)
            .replace(/([A-Z])/g, '_$1')
            .replace(/[-\s]+/g, '_')
            .replace(/^_/, '')
            .toLowerCase();
    }
}
