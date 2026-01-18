import { Pipe, PipeTransform } from '../angular/pipe';

@Pipe({ name: 'date' })
export class DatePipe implements PipeTransform {
    transform(value: Date | string | number | null | undefined, format: string = 'medium'): string {
        if (value == null) return '';

        const date = value instanceof Date ? value : new Date(value);

        if (isNaN(date.getTime())) {
            return String(value);
        }

        switch (format) {
            case 'short':
                return this.formatShort(date);
            case 'medium':
                return this.formatMedium(date);
            case 'long':
                return this.formatLong(date);
            case 'full':
                return this.formatFull(date);
            case 'shortDate':
                return this.formatShortDate(date);
            case 'mediumDate':
                return this.formatMediumDate(date);
            case 'longDate':
                return this.formatLongDate(date);
            case 'fullDate':
                return this.formatFullDate(date);
            case 'shortTime':
                return this.formatShortTime(date);
            case 'mediumTime':
                return this.formatMediumTime(date);
            default:
                return this.formatCustom(date, format);
        }
    }

    private pad(num: number, size: number = 2): string {
        return String(num).padStart(size, '0');
    }

    private formatShort(date: Date): string {
        return `${this.pad(date.getMonth() + 1)}/${this.pad(date.getDate())}/${date.getFullYear().toString().substr(2)}, ${this.formatShortTime(date)}`;
    }

    private formatMedium(date: Date): string {
        return `${this.getMonthShort(date)} ${date.getDate()}, ${date.getFullYear()}, ${this.formatMediumTime(date)}`;
    }

    private formatLong(date: Date): string {
        return `${this.getMonthLong(date)} ${date.getDate()}, ${date.getFullYear()} at ${this.formatMediumTime(date)}`;
    }

    private formatFull(date: Date): string {
        return `${this.getDayLong(date)}, ${this.getMonthLong(date)} ${date.getDate()}, ${date.getFullYear()} at ${this.formatMediumTime(date)}`;
    }

    private formatShortDate(date: Date): string {
        return `${this.pad(date.getMonth() + 1)}/${this.pad(date.getDate())}/${date.getFullYear().toString().substr(2)}`;
    }

    private formatMediumDate(date: Date): string {
        return `${this.getMonthShort(date)} ${date.getDate()}, ${date.getFullYear()}`;
    }

    private formatLongDate(date: Date): string {
        return `${this.getMonthLong(date)} ${date.getDate()}, ${date.getFullYear()}`;
    }

    private formatFullDate(date: Date): string {
        return `${this.getDayLong(date)}, ${this.getMonthLong(date)} ${date.getDate()}, ${date.getFullYear()}`;
    }

    private formatShortTime(date: Date): string {
        const hours = date.getHours();
        const minutes = date.getMinutes();
        const ampm = hours >= 12 ? 'PM' : 'AM';
        const displayHours = hours % 12 || 12;
        return `${displayHours}:${this.pad(minutes)} ${ampm}`;
    }

    private formatMediumTime(date: Date): string {
        const hours = date.getHours();
        const minutes = date.getMinutes();
        const seconds = date.getSeconds();
        const ampm = hours >= 12 ? 'PM' : 'AM';
        const displayHours = hours % 12 || 12;
        return `${displayHours}:${this.pad(minutes)}:${this.pad(seconds)} ${ampm}`;
    }

    private getMonthShort(date: Date): string {
        const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
        return months[date.getMonth()];
    }

    private getMonthLong(date: Date): string {
        const months = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
        return months[date.getMonth()];
    }

    private getDayLong(date: Date): string {
        const days = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
        return days[date.getDay()];
    }

    private formatCustom(date: Date, format: string): string {
        return format
            .replace(/yyyy/g, String(date.getFullYear()))
            .replace(/yy/g, String(date.getFullYear()).substr(2))
            .replace(/MM/g, this.pad(date.getMonth() + 1))
            .replace(/M/g, String(date.getMonth() + 1))
            .replace(/dd/g, this.pad(date.getDate()))
            .replace(/d/g, String(date.getDate()))
            .replace(/HH/g, this.pad(date.getHours()))
            .replace(/H/g, String(date.getHours()))
            .replace(/hh/g, this.pad(date.getHours() % 12 || 12))
            .replace(/h/g, String(date.getHours() % 12 || 12))
            .replace(/mm/g, this.pad(date.getMinutes()))
            .replace(/m/g, String(date.getMinutes()))
            .replace(/ss/g, this.pad(date.getSeconds()))
            .replace(/s/g, String(date.getSeconds()))
            .replace(/a/g, date.getHours() >= 12 ? 'PM' : 'AM');
    }
}
