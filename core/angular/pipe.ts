/**
 * Opcje konfiguracji pipe.
 *
 * Ten interfejs służy wyłącznie do zapewnienia poprawności typów w TypeScript.
 * Cała logika przetwarzania odbywa się w transformerach podczas kompilacji.
 */
export interface PipeOptions {
  name: string;
  standalone?: boolean;
  pure?: boolean;
}

/**
 * Interfejs dla pipe transformacji.
 * Każdy pipe musi implementować metodę transform.
 */
export interface PipeTransform {
  transform(value: any, ...args: any[]): any;
}

/**
 * Dekorator pipe.
 *
 * Ten dekorator służy wyłącznie do zapewnienia poprawności typów w TypeScript
 * i jest podmieniany podczas kompilacji przez transformery.
 */
export function Pipe(options: PipeOptions): ClassDecorator {
  return (target: any) => {
    return target;
  };
}
