# Changelog - Obsługa aliasów w @if directive

## Data: 2026-01-18

### Dodane funkcjonalności

#### 1. Compile-time: Parsowanie składni `@if (condition; as variable)`

**Zmodyfikowane pliki:**
- `/web/quarc/cli/helpers/control-flow-transformer.ts`

**Zmiany:**
- Rozszerzono interfejs `ControlFlowBlock` o pole `aliasVariable`
- Dodano metodę `parseConditionWithAlias()` do parsowania składni z aliasem
- Przepisano `transform()` i `transformIfBlocks()` aby obsługiwać zagnieżdżone nawiasy
- Dodano metody `findIfBlock()` i `findIfBlockEnd()` dla precyzyjnego parsowania
- Zaktualizowano `buildNgContainers()` aby generować `*ngIf="condition; let variable"`

**Przykład transformacji:**
```
Input:  @if (device(); as dev) { <div>{{ dev.name }}</div> }
Output: <ng-container *ngIf="device(); let dev"> <div>{{ dev.name }}</div> </ng-container>
```

#### 2. Compile-time: Integracja z TemplateTransformer

**Zmodyfikowane pliki:**
- `/web/quarc/cli/processors/template/template-transformer.ts`

**Zmiany:**
- Dodano import `ControlFlowTransformer`
- Zastąpiono własną implementację `transformControlFlowIf()` wywołaniem `ControlFlowTransformer.transform()`
- Usunięto zduplikowane metody `parseIfBlock()` i `buildIfDirectives()`

**Korzyści:**
- Jedna spójna implementacja parsowania @if
- Automatyczna obsługa aliasów w całym pipeline
- Łatwiejsze utrzymanie kodu

#### 3. Runtime: Obsługa `*ngIf="condition; let variable"`

**Zmodyfikowane pliki:**
- `/web/quarc/core/module/template-renderer.ts`

**Zmiany:**
- Dodano metodę `processNgIfDirective()` do obsługi dyrektywy *ngIf z aliasem
- Dodano metodę `parseNgIfExpression()` do parsowania wyrażenia runtime
- Dodano metodę `propagateContextToChildren()` do propagacji kontekstu
- Zaktualizowano `processNgContainer()` aby używać nowej metody

**Działanie:**
1. Parser wyodrębnia warunek i nazwę aliasu z `*ngIf="condition; let variable"`
2. Ewaluuje warunek w kontekście komponentu
3. Jeśli truthy - tworzy kontekst `{ [variable]: value }` i przypisuje do `__quarcContext`
4. Propaguje kontekst do wszystkich elementów potomnych
5. Elementy mają dostęp do aliasu poprzez `__quarcContext`

### Testy

#### Nowe testy compile-time
**Plik:** `/web/quarc/tests/unit/test-functionality.ts`

Dodano 4 nowe testy:
- Test 22: @if z zagnieżdżonymi nawiasami w warunku
- Test 23: @if z aliasem i białymi znakami
- Test 24: @if @else if oba z aliasem
- Wszystkie istniejące testy (20-21) również przeszły

**Wyniki:** ✅ 24/24 testy (100%)

#### Nowe testy runtime
**Plik:** `/web/quarc/tests/unit/test-ngif-alias.ts`

Utworzono 10 testów runtime (wymagają środowiska przeglądarki):
- Prosty przypadek z aliasem
- Wartości falsy (null, undefined, false)
- Zagnieżdżone elementy z dostępem do aliasu
- Parsowanie wyrażeń
- Propagacja kontekstu

**Uwaga:** Testy runtime nie są uruchamiane automatycznie w Node.js

#### Test manualny
**Plik:** `/web/quarc/tests/manual/test-ngif-alias-example.html`

Utworzono stronę HTML do manualnego testowania w przeglądarce.

### Dokumentacja

**Nowe pliki:**
- `/web/quarc/NGIF_ALIAS_FEATURE.md` - pełna dokumentacja funkcjonalności
- `/web/quarc/CHANGELOG_NGIF_ALIAS.md` - ten plik

### Kompatybilność wstecz

✅ Pełna kompatybilność - składnia bez aliasu działa jak dotychczas:
- `@if (condition)` - bez zmian
- `@if (condition; as variable)` - nowa funkcjonalność

### Przykłady użycia

```typescript
// Przed (wielokrotne wywołanie)
@if (device()) {
  <div>{{ device().name }}</div>
  <span>{{ device().model }}</span>
  <p>{{ device().version }}</p>
}

// Po (jedno wywołanie)
@if (device(); as dev) {
  <div>{{ dev.name }}</div>
  <span>{{ dev.model }}</span>
  <p>{{ dev.version }}</p>
}
```

### Korzyści

1. **Wydajność** - metoda/signal wywoływana tylko raz
2. **Czytelność** - krótsze wyrażenia w template
3. **Bezpieczeństwo** - spójna wartość w całym bloku
4. **Zgodność** - składnia podobna do Angular

### Znane ograniczenia

1. Testy runtime wymagają środowiska przeglądarki (DOM API)
2. Alias jest dostępny tylko w bloku @if, nie w @else
3. Wartości falsy nie renderują zawartości (zgodnie z semantyką @if)

### Następne kroki

- [ ] Dodać testy E2E w rzeczywistej aplikacji
- [ ] Rozważyć wsparcie dla aliasów w @else if
- [ ] Dodać przykłady do dokumentacji głównej
- [ ] Rozważyć wsparcie dla destrukturyzacji: `@if (user(); as {name, email})`
