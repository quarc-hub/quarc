import { ViewEncapsulation } from '../module/component';
import { Type } from '../module/type';

/**
 * Opcje konfiguracji komponentu.
 *
 * Ten interfejs służy wyłącznie do zapewnienia poprawności typów w TypeScript.
 * Cała logika przetwarzania (np. ładowanie templateUrl, styleUrl) odbywa się
 * w transformerach podczas kompilacji (quarc/cli/processors/).
 */
export interface ComponentOptions {
  selector: string;
  template?: string;
  templateUrl?: string;
  style?: string;
  styles?: string[];
  styleUrl?: string;
  styleUrls?: string[];
  standalone?: boolean;
  imports?: Array<Type<any> | any[]>;
  encapsulation?: ViewEncapsulation;
  changeDetection?: any;
  providers?: any[];
  exportAs?: string;
  preserveWhitespaces?: boolean;
  jit?: boolean;
}

/**
 * Dekorator komponentu.
 *
 * Ten dekorator służy wyłącznie do zapewnienia poprawności typów w TypeScript
 * i jest podmieniany podczas kompilacji przez transformer (quarc/cli/processors/class-decorator-processor.ts).
 * Cała logika przetwarzania templateUrl, styleUrl, control flow itp. odbywa się w transformerach,
 * co minimalizuje rozmiar końcowej aplikacji.
 */
export function Component(options: ComponentOptions): ClassDecorator {
  return (target: any) => {
    return target;
  };
}
