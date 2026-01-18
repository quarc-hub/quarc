import { Pipe, PipeTransform } from '../angular/pipe';

@Pipe({ name: 'uppercase' })
export class UpperCasePipe implements PipeTransform {
    transform(value: string | null | undefined): string {
        if (value == null) return '';
        return String(value).toUpperCase();
    }
}
