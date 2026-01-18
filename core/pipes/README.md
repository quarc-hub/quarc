# Quarc Pipes

Zestaw podstawowych pipes dla frameworka Quarc, inspirowanych pipes z Angulara.

## Instalacja

Pipes są dostępne w `@quarc/core`:

```typescript
import { UpperCasePipe, DatePipe, JsonPipe } from '@quarc/core';
```

## Użycie w komponentach

### 1. Zaimportuj pipe w komponencie

```typescript
import { Component } from '@quarc/core';
import { UpperCasePipe } from '@quarc/core';

@Component({
    selector: 'app-example',
    template: '<div>{{ name | uppercase }}</div>',
    imports: [UpperCasePipe],
})
export class ExampleComponent {
    name = 'hello world';
}
```

### 2. Użyj w template

```html
<!-- Prosty pipe -->
<div>{{ value | uppercase }}</div>

<!-- Pipe z argumentami -->
<div>{{ text | substr:0:10 }}</div>

<!-- Łańcuch pipes -->
<div>{{ name | lowercase | camelcase }}</div>

<!-- Kombinacja z operatorami -->
<div>{{ value || 'default' | uppercase }}</div>
```

## Dostępne Pipes

### UpperCasePipe

Konwertuje tekst na wielkie litery.

```typescript
@Pipe({ name: 'uppercase' })
```

**Przykłady:**
```html
{{ 'hello' | uppercase }}  <!-- HELLO -->
{{ name | uppercase }}      <!-- JOHN DOE -->
```

---

### LowerCasePipe

Konwertuje tekst na małe litery.

```typescript
@Pipe({ name: 'lowercase' })
```

**Przykłady:**
```html
{{ 'HELLO' | lowercase }}  <!-- hello -->
{{ name | lowercase }}      <!-- john doe -->
```

---

### JsonPipe

Serializuje obiekt do formatu JSON z wcięciami.

```typescript
@Pipe({ name: 'json' })
```

**Przykłady:**
```html
{{ user | json }}
<!--
{
  "name": "John",
  "age": 30
}
-->

{{ items | json }}
<!--
[
  "item1",
  "item2"
]
-->
```

---

### CamelCasePipe

Konwertuje tekst do camelCase.

```typescript
@Pipe({ name: 'camelcase' })
```

**Przykłady:**
```html
{{ 'hello-world' | camelcase }}   <!-- helloWorld -->
{{ 'hello_world' | camelcase }}   <!-- helloWorld -->
{{ 'hello world' | camelcase }}   <!-- helloWorld -->
{{ 'HelloWorld' | camelcase }}    <!-- helloWorld -->
```

---

### PascalCasePipe

Konwertuje tekst do PascalCase.

```typescript
@Pipe({ name: 'pascalcase' })
```

**Przykłady:**
```html
{{ 'hello-world' | pascalcase }}  <!-- HelloWorld -->
{{ 'hello_world' | pascalcase }}  <!-- HelloWorld -->
{{ 'hello world' | pascalcase }}  <!-- HelloWorld -->
{{ 'helloWorld' | pascalcase }}   <!-- HelloWorld -->
```

---

### SnakeCasePipe

Konwertuje tekst do snake_case.

```typescript
@Pipe({ name: 'snakecase' })
```

**Przykłady:**
```html
{{ 'helloWorld' | snakecase }}    <!-- hello_world -->
{{ 'HelloWorld' | snakecase }}    <!-- hello_world -->
{{ 'hello-world' | snakecase }}   <!-- hello_world -->
{{ 'hello world' | snakecase }}   <!-- hello_world -->
```

---

### KebabCasePipe

Konwertuje tekst do kebab-case.

```typescript
@Pipe({ name: 'kebabcase' })
```

**Przykłady:**
```html
{{ 'helloWorld' | kebabcase }}    <!-- hello-world -->
{{ 'HelloWorld' | kebabcase }}    <!-- hello-world -->
{{ 'hello_world' | kebabcase }}   <!-- hello-world -->
{{ 'hello world' | kebabcase }}   <!-- hello-world -->
```

---

### SubstrPipe

Zwraca fragment tekstu.

```typescript
@Pipe({ name: 'substr' })
```

**Parametry:**
- `start: number` - pozycja początkowa
- `length?: number` - długość fragmentu (opcjonalne)

**Przykłady:**
```html
{{ 'hello world' | substr:0:5 }}   <!-- hello -->
{{ 'hello world' | substr:6 }}     <!-- world -->
{{ text | substr:0:10 }}           <!-- pierwsze 10 znaków -->
```

---

### DatePipe

Formatuje daty.

```typescript
@Pipe({ name: 'date' })
```

**Parametry:**
- `format: string` - format daty (domyślnie: 'medium')

**Predefiniowane formaty:**

| Format | Przykład |
|--------|----------|
| `short` | 1/15/24, 2:30 PM |
| `medium` | Jan 15, 2024, 2:30:45 PM |
| `long` | January 15, 2024 at 2:30:45 PM |
| `full` | Monday, January 15, 2024 at 2:30:45 PM |
| `shortDate` | 1/15/24 |
| `mediumDate` | Jan 15, 2024 |
| `longDate` | January 15, 2024 |
| `fullDate` | Monday, January 15, 2024 |
| `shortTime` | 2:30 PM |
| `mediumTime` | 2:30:45 PM |

**Własne formaty:**

| Symbol | Znaczenie | Przykład |
|--------|-----------|----------|
| `yyyy` | Rok (4 cyfry) | 2024 |
| `yy` | Rok (2 cyfry) | 24 |
| `MM` | Miesiąc (2 cyfry) | 01 |
| `M` | Miesiąc (1-2 cyfry) | 1 |
| `dd` | Dzień (2 cyfry) | 15 |
| `d` | Dzień (1-2 cyfry) | 15 |
| `HH` | Godzina 24h (2 cyfry) | 14 |
| `H` | Godzina 24h (1-2 cyfry) | 14 |
| `hh` | Godzina 12h (2 cyfry) | 02 |
| `h` | Godzina 12h (1-2 cyfry) | 2 |
| `mm` | Minuty (2 cyfry) | 30 |
| `m` | Minuty (1-2 cyfry) | 30 |
| `ss` | Sekundy (2 cyfry) | 45 |
| `s` | Sekundy (1-2 cyfry) | 45 |
| `a` | AM/PM | PM |

**Przykłady:**
```html
{{ date | date }}                    <!-- Jan 15, 2024, 2:30:45 PM -->
{{ date | date:'short' }}            <!-- 1/15/24, 2:30 PM -->
{{ date | date:'yyyy-MM-dd' }}       <!-- 2024-01-15 -->
{{ date | date:'HH:mm:ss' }}         <!-- 14:30:45 -->
{{ date | date:'dd/MM/yyyy' }}       <!-- 15/01/2024 -->
{{ date | date:'h:mm a' }}           <!-- 2:30 PM -->
```

## Łańcuchowanie Pipes

Możesz łączyć wiele pipes w łańcuch:

```html
{{ name | lowercase | camelcase }}
{{ text | substr:0:20 | uppercase }}
{{ value | json | lowercase }}
```

## Kombinacja z operatorami

Pipes działają poprawnie z operatorami logicznymi:

```html
{{ value || 'default' | uppercase }}
{{ (name || 'Unknown') | pascalcase }}
{{ condition && value | lowercase }}
```

## Tworzenie własnych Pipes

```typescript
import { Pipe, PipeTransform } from '@quarc/core';

@Pipe({ name: 'reverse' })
export class ReversePipe implements PipeTransform {
    transform(value: string | null | undefined): string {
        if (value == null) return '';
        return String(value).split('').reverse().join('');
    }
}
```

Użycie:

```typescript
@Component({
    selector: 'app-example',
    template: '<div>{{ text | reverse }}</div>',
    imports: [ReversePipe],
})
export class ExampleComponent {
    text = 'hello';  // Wyświetli: olleh
}
```

## Testy

Wszystkie pipes są przetestowane. Uruchom testy:

```bash
cd /web/quarc/tests/unit
npx ts-node test-pipes.ts
```

## Uwagi

- Wszystkie pipes obsługują wartości `null` i `undefined` zwracając pusty string
- DatePipe obsługuje obiekty `Date`, stringi i liczby (timestamp)
- Pipes są transformowane w czasie kompilacji na wywołania metod dla minimalnego rozmiaru bundle
- Pipes są pure (czyste) - wynik zależy tylko od argumentów wejściowych
