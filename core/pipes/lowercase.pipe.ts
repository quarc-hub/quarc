import { Pipe, PipeTransform } from '../angular/pipe';

@Pipe({ name: 'lowercase' })
export class LowerCasePipe implements PipeTransform {
    transform(value: string | null | undefined): string {
        if (value == null) return '';
        return String(value).toLowerCase();
    }
}
