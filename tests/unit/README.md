# Testy Quarc Framework

Ta struktura zawiera wszystkie testy dla Quarc Framework.

## Struktura

- `test-functionality.ts` - Testy podstawowej funkcjonalności (ControlFlowTransformer, TemplateParser, etc.)
- `test-style-injection.ts` - Testy wstrzykiwania stylów i transformacji `:host`
- `test-style-injection.html` - Strona HTML do uruchamiania testów stylów w przeglądarce
- `test-lifecycle.ts` - Testy interfejsów lifecycle (OnInit, OnDestroy, AfterViewInit, etc.)
- `run-tests.ts` - Główny skrypt do uruchamiania wszystkich testów

## Uruchamianie testów

### Instalacja zależności
```bash
cd quarc/tests/unit
npm install
```

### Wszystkie testy (jednostkowe + e2e)
```bash
npm test
# lub
npm run test:all
```

### Tylko testy jednostkowe
```bash
npm run test:unit
```

### Tylko testy e2e
```bash
npm run test:e2e
```

### Indywidualne testy
```bash
# Testy funkcjonalne
npm run test:functionality

# Testy wstrzykiwania stylów
npm run test:style

# Testy lifecycle
npm run test:lifecycle
```

### Testy w przeglądarce
```bash
npm run test:browser
# lub
xdg-open test-style-injection.html
```

## Wymagania

- `ts-node` - do uruchamiania testów TypeScript
- `@types/node` - typy Node.js
- Środowisko przeglądarki dla testów stylów (lub JSDOM)

## Co testujemy?

### Testy funkcjonalne
- ✅ Transformacja `@if` na `*ngIf`
- ✅ Transformacja `@for` na `*ngFor`
- ✅ Parsowanie szablonów
- ✅ Helpery dla dyrektyw strukturalnych

### Testy wstrzykiwania stylów
- ✅ Transformacja `:host` na `[_nghost-scopeId]`
- ✅ Transformacja `:host()` z selektorami
- ✅ Obsługa różnych ViewEncapsulation
- ✅ Dodawanie atrybutów `_nghost` i `_ngcontent`
- ✅ Wiele wystąpień `:host` w jednym pliku

### Testy lifecycle
- ✅ OnInit - `ngOnInit()`
- ✅ OnDestroy - `ngOnDestroy()`
- ✅ AfterViewInit - `ngAfterViewInit()`
- ✅ AfterViewChecked - `ngAfterViewChecked()`
- ✅ AfterContentInit - `ngAfterContentInit()`
- ✅ AfterContentChecked - `ngAfterContentChecked()`
- ✅ DoCheck - `ngDoCheck()`
- ✅ OnChanges - `ngOnChanges(changes: SimpleChanges)`
- ✅ Wielokrotna implementacja hooków
- ✅ Poprawna kolejność wywołań lifecycle

## Rozwój

Aby dodać nowy test:

1. Stwórz nowy plik `test-nazwa.ts` w tym katalogu
2. Dodaj go do listy `testFiles` w `run-tests.ts`
3. Użyj funkcji `test()` z istniejących plików jako wzoru

## Problemy

Jeśli testy stylów nie działają w Node.js, uruchom je w przeglądarce przez `test-style-injection.html`.
