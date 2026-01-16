/**
 * Opcje konfiguracji dyrektywy.
 *
 * Ten interfejs służy wyłącznie do zapewnienia poprawności typów w TypeScript.
 * Cała logika przetwarzania odbywa się w transformerach podczas kompilacji.
 */
export interface DirectiveOptions {
  selector: string;
  inputs?: string[];
  outputs?: string[];
  standalone?: boolean;
  host?: { [key: string]: string };
  providers?: any[];
  exportAs?: string[];
  jit?: boolean;
}

export interface IDirective {
  ngOnInit?(): void;
  ngOnDestroy?(): void;
  ngOnChanges?(changes: Record<string, { previousValue: any; currentValue: any; firstChange: boolean }>): void;
}

/**
 * Dekorator dyrektywy.
 *
 * Ten dekorator służy wyłącznie do zapewnienia poprawności typów w TypeScript
 * i jest podmieniany podczas kompilacji przez transformery.
 */
export function Directive(options: DirectiveOptions): ClassDecorator {
  return (target: any) => {
    return target;
  };
}
