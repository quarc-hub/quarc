import { Type } from '../module/type';

/**
 * Opcje konfiguracji serwisu.
 *
 * Ten interfejs służy wyłącznie do zapewnienia poprawności typów w TypeScript.
 * Cała logika przetwarzania odbywa się w transformerach podczas kompilacji.
 */
export interface InjectableOptions {
  providedIn?: Type<any> | 'root' | 'platform' | 'any' | null;
}

/**
 * Dekorator serwisu (Injectable).
 *
 * Ten dekorator służy wyłącznie do zapewnienia poprawności typów w TypeScript
 * i jest podmieniany podczas kompilacji przez transformery.
 */
export function Injectable(options?: InjectableOptions): ClassDecorator {
  return (target: any) => {
    return target;
  };
}
