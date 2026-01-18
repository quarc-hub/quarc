# Naprawa implementacji Pipe - Problem z operatorem ||

## Problem

Po dodaniu obsługi pipes do frameworka Quarc, komponent devices w `/web/IoT/Ant` przestał renderować zawartość.

### Przyczyna

Implementacja `transformPipeExpression` w `template-transformer.ts` błędnie traktowała operator logiczny `||` jako separator pipe `|`.

Wyrażenie:
```typescript
{{ device.name || 'Unnamed' }}
```

Było transformowane na:
```typescript
this._pipes?.['']?.transform(this._pipes?.['Unnamed']?.transform(device.name))
```

Zamiast pozostać jako:
```typescript
device.name || 'Unnamed'
```

## Rozwiązanie

Dodano metodę `splitByPipe()` która poprawnie rozróżnia:
- Pojedynczy `|` - separator pipe
- Podwójny `||` - operator logiczny OR
- Podwójny `&&` - operator logiczny AND

### Zmieniony plik

**`/web/quarc/cli/processors/template/template-transformer.ts`**

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
            result = `this._pipes?.['${pipeName}']?.transform(${result})`;
        } else {
            const pipeName = pipePart.substring(0, colonIndex).trim();
            const argsStr = pipePart.substring(colonIndex + 1).trim();
            const args = argsStr.split(':').map(arg => arg.trim());
            const argsJoined = args.join(', ');
            result = `this._pipes?.['${pipeName}']?.transform(${result}, ${argsJoined})`;
        }
    }

    return result;
}

private splitByPipe(expression: string): string[] {
    const parts: string[] = [];
    let current = '';
    let i = 0;

    while (i < expression.length) {
        const char = expression[i];

        if (char === '|') {
            if (i + 1 < expression.length && expression[i + 1] === '|') {
                // To jest || (operator logiczny), nie pipe
                current += '||';
                i += 2;
            } else {
                // To jest | (separator pipe)
                parts.push(current);
                current = '';
                i++;
            }
        } else {
            current += char;
            i++;
        }
    }

    if (current) {
        parts.push(current);
    }

    return parts.length > 0 ? parts : [expression];
}
```

## Testy

Utworzono testy w `/web/quarc/tests/unit/`:

1. **test-for-transformation.ts** - Weryfikuje transformację `@for` do `*ngFor`
2. **test-interpolation-transformation.ts** - Weryfikuje transformację interpolacji `{{ }}`
3. **test-pipe-with-logical-operators.ts** - Weryfikuje rozróżnienie pipe `|` od operatorów `||` i `&&`

### Wyniki testów

```
✅ @FOR TRANSFORMATION TEST PASSED (6/6)
✅ INTERPOLATION TRANSFORMATION TEST PASSED (8/8)
✅ PIPE VS LOGICAL OPERATORS TEST PASSED (7/7)
```

## Przykłady działania

### Operator || (poprawnie zachowany)
```typescript
// Input
{{ device.name || 'Unnamed' }}

// Output
<span [inner-text]="device.name || 'Unnamed'"></span>
```

### Prawdziwy pipe (poprawnie transformowany)
```typescript
// Input
{{ value | uppercase }}

// Output
<span [inner-text]="this._pipes?.['uppercase']?.transform(value)"></span>
```

### Kombinacja || i pipe
```typescript
// Input
{{ (value || 'default') | uppercase }}

// Output
<span [inner-text]="this._pipes?.['uppercase']?.transform((value || 'default'))"></span>
```

### Łańcuch pipes
```typescript
// Input
{{ value | lowercase | slice:0:5 }}

// Output
<span [inner-text]="this._pipes?.['slice']?.transform(this._pipes?.['lowercase']?.transform(value), 0, 5)"></span>
```

## Weryfikacja

Build aplikacji IoT/Ant przechodzi pomyślnie:
```bash
cd /web/IoT/Ant/assets/resources/quarc
npm run build
# ✅ Build completed | Environment: production
```

## Wpływ na istniejący kod

Naprawa jest **wstecznie kompatybilna** - nie zmienia zachowania dla:
- Prostych interpolacji bez operatorów logicznych
- Istniejących pipes
- Transformacji `@for` i `@if`

Naprawia tylko błędną interpretację operatorów logicznych jako separatorów pipe.
