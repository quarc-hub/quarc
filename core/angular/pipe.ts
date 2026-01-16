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
