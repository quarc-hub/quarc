# Obsługa aliasów w @if directive

## Opis funkcjonalności

Framework Quarc został rozszerzony o obsługę składni `@if (condition; as variable)`, która pozwala przypisać wynik wyrażenia warunkowego do zmiennej lokalnej i używać jej w template bez wielokrotnego wywoływania metody/signala.

## Składnia

```typescript
@if (expression; as variableName) {
  <div>{{ variableName.property }}</div>
}
```

## Przykłady użycia

### Prosty alias
```typescript
@if (device(); as dev) {
  <div>{{ dev.name }}</div>
  <span>{{ dev.model }}</span>
}
```

### Z @else
```typescript
@if (getUser(); as user) {
  <div>Witaj {{ user.name }}</div>
} @else {
  <div>Zaloguj się</div>
}
```

### Z @else if i aliasami
```typescript
@if (getCurrentDevice(); as device) {
  <span>{{ device.model }}</span>
} @else if (getDefaultDevice(); as def) {
  <span>{{ def.model }}</span>
} @else {
  <span>Brak urządzenia</span>
}
```

### Zagnieżdżone wywołania funkcji
```typescript
@if (getData(getValue()); as data) {
  <div>{{ data.result }}</div>
}
```

## Implementacja

### Compile-time (Template Processor)

**Plik:** `/web/quarc/cli/helpers/control-flow-transformer.ts`

Kompilator template parsuje składnię `@if (condition; as variable)` i generuje:
```html
<ng-container *ngIf="condition; let variable">
```

Kluczowe metody:
- `parseConditionWithAlias()` - parsuje warunek i wyodrębnia alias
- `transformIfBlocks()` - obsługuje zagnieżdżone nawiasy w warunkach
- `buildNgContainers()` - generuje odpowiedni kod HTML z aliasem

### Runtime (Template Renderer)

**Plik:** `/web/quarc/core/module/template-renderer.ts`

Runtime obsługuje składnię `*ngIf="condition; let variable"`:

Kluczowe metody:
- `processNgIfDirective()` - przetwarza dyrektywę *ngIf z opcjonalnym aliasem
- `parseNgIfExpression()` - parsuje wyrażenie i wyodrębnia alias
- `propagateContextToChildren()` - propaguje kontekst z aliasem do elementów potomnych

**Działanie:**
1. Parsuje wyrażenie `*ngIf="condition; let variable"`
2. Ewaluuje `condition`
3. Jeśli wynik jest truthy:
   - Tworzy nowy kontekst z aliasem: `{ [variable]: value }`
   - Przypisuje kontekst do elementów DOM poprzez `__quarcContext`
   - Renderuje zawartość z dostępem do aliasu

## Testy

### Compile-time testy
**Plik:** `/web/quarc/tests/unit/test-functionality.ts`

- Test 20: Prosty alias
- Test 21: @if @else if z aliasami
- Test 22: Zagnieżdżone nawiasy w warunku
- Test 23: Białe znaki w składni
- Test 24: Wiele aliasów w @else if

### Runtime testy
**Plik:** `/web/quarc/tests/unit/test-ngif-alias.ts`

Testy runtime wymagają środowiska przeglądarki (DOM API) i nie są uruchamiane automatycznie w Node.js.

## Wyniki testów

Wszystkie testy compile-time przeszły pomyślnie:
- ✅ 24/24 testów funkcjonalnych
- ✅ 100% pokrycie dla składni z aliasem

## Kompatybilność

Składnia jest w pełni kompatybilna wstecz:
- `@if (condition)` - działa jak dotychczas
- `@if (condition; as variable)` - nowa funkcjonalność

## Uwagi techniczne

1. **Kontekst propagacji**: Alias jest dostępny dla wszystkich elementów potomnych poprzez `__quarcContext`
2. **Ewaluacja**: Wyrażenie jest ewaluowane tylko raz, a wynik jest przechowywany w aliasie
3. **Falsy values**: Wartości `null`, `undefined`, `false`, `0`, `''` nie renderują zawartości
4. **Zagnieżdżone nawiasy**: Parser poprawnie obsługuje zagnieżdżone wywołania funkcji w warunku
