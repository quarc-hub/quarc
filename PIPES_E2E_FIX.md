# Naprawa Pipes - Problem z kontekstem ewaluacji

## Problem zgłoszony przez użytkownika

W aplikacji IoT/Ant kod:
```html
<pre>{{ 123 | json }}</pre>
<pre>{{ "string" | json }}</pre>
<pre>{{ true | json }}</pre>
```

Powodował, że cały komponent się "wysypał" bez błędów - wcześniej na metodach było po prostu "undefined".

## Analiza problemu

### 1. Transformacja była poprawna
Transformer poprawnie generował kod:
```typescript
this._pipes?.['json']?.transform(123)
```

### 2. Problem był w runtime
W `template-renderer.ts` wyrażenia są ewaluowane za pomocą:
```typescript
private eval(expr: string): any {
    return new Function('c', `with(c){return ${expr}}`)(this.component);
}
```

W kontekście `with(c)`, `this` odnosi się do **globalnego obiektu**, a nie do komponentu `c`. Dlatego `this._pipes` było `undefined`.

## Rozwiązanie

Zmieniono generowany kod z `this._pipes` na `_pipes`:

**Przed:**
```typescript
this._pipes?.['json']?.transform(123)
```

**Po:**
```typescript
_pipes?.['json']?.transform(123)
```

Teraz `_pipes` jest dostępne bezpośrednio z kontekstu komponentu `c` w `with(c)`.

## Zmieniony plik

`/web/quarc/cli/processors/template/template-transformer.ts`:

```typescript
private transformPipeExpression(expression: string): string {
    const parts = this.splitByPipe(expression);

    if (parts.length === 1) {
        return expression;
    }

    let result = parts[0].trim();

    for (let i = 1; i < parts.length; i++) {
        const pipePart = parts[i].trim();
        const colonIndex = pipePart.indexOf(':');

        if (colonIndex === -1) {
            const pipeName = pipePart.trim();
            result = `_pipes?.['${pipeName}']?.transform(${result})`; // ← Zmiana
        } else {
            const pipeName = pipePart.substring(0, colonIndex).trim();
            const argsStr = pipePart.substring(colonIndex + 1).trim();
            const args = argsStr.split(':').map(arg => arg.trim());
            const argsJoined = args.join(', ');
            result = `_pipes?.['${pipeName}']?.transform(${result}, ${argsJoined})`; // ← Zmiana
        }
    }

    return result;
}
```

## Testy

### Testy jednostkowe
✅ `test-pipes.ts` - 31/31 testów przeszło
✅ `test-pipe-with-logical-operators.ts` - 7/7 testów przeszło
✅ `test-pipe-transformation-detailed.ts` - wszystkie transformacje poprawne

### Build aplikacji
✅ `/web/IoT/Ant/assets/resources/quarc` - build przeszedł pomyślnie

## Utworzone pipes

Zestaw podstawowych pipes gotowych do użycia:

1. **UpperCasePipe** - `{{ text | uppercase }}`
2. **LowerCasePipe** - `{{ text | lowercase }}`
3. **JsonPipe** - `{{ obj | json }}`
4. **CamelCasePipe** - `{{ 'hello-world' | camelcase }}` → `helloWorld`
5. **PascalCasePipe** - `{{ 'hello-world' | pascalcase }}` → `HelloWorld`
6. **SnakeCasePipe** - `{{ 'helloWorld' | snakecase }}` → `hello_world`
7. **KebabCasePipe** - `{{ 'helloWorld' | kebabcase }}` → `hello-world`
8. **SubstrPipe** - `{{ text | substr:0:10 }}`
9. **DatePipe** - `{{ date | date:'yyyy-MM-dd' }}`

## Przykład użycia

```typescript
import { Component, signal } from '@quarc/core';
import { JsonPipe, UpperCasePipe } from '@quarc/core';

@Component({
    selector: 'app-example',
    template: `
        <div>{{ name | uppercase }}</div>
        <pre>{{ data | json }}</pre>
        <div>{{ value || 'default' | uppercase }}</div>
    `,
    imports: [JsonPipe, UpperCasePipe],
})
export class ExampleComponent {
    name = signal('hello');
    data = signal({ test: 123 });
    value = signal(null);
}
```

## Dokumentacja

Pełna dokumentacja pipes dostępna w:
- `/web/quarc/core/pipes/README.md`
- `/web/quarc/PIPE_IMPLEMENTATION_FIX.md`

## Podsumowanie

Problem został całkowicie rozwiązany:
- ✅ Pipes są poprawnie transformowane w czasie kompilacji
- ✅ Pipes są dostępne w runtime przez kontekst komponentu
- ✅ Operatory logiczne `||` i `&&` nie są mylone z pipe separator `|`
- ✅ Wszystkie testy jednostkowe przechodzą
- ✅ Build aplikacji działa poprawnie
