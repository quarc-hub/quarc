"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.Component = Component;
/**
 * Dekorator komponentu.
 *
 * Ten dekorator służy wyłącznie do zapewnienia poprawności typów w TypeScript
 * i jest podmieniany podczas kompilacji przez transformer (quarc/cli/processors/class-decorator-processor.ts).
 * Cała logika przetwarzania templateUrl, styleUrl, control flow itp. odbywa się w transformerach,
 * co minimalizuje rozmiar końcowej aplikacji.
 */
function Component(options) {
    return (target) => {
        target._quarcComponent = options;
        return target;
    };
}
