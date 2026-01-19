# Quarc Framework Tests

Kompletny zestaw testów dla Quarc Framework oparty na Playwright.

## Struktura

```
tests/
├── playwright/
│   ├── e2e/              # Testy end-to-end
│   │   └── pipes.spec.ts # Testy wszystkich pipes
│   └── unit/             # Testy jednostkowe
│       ├── processors.spec.ts
│       └── signals.spec.ts
├── e2e/
│   └── app/              # Aplikacja testowa dla e2e
├── playwright.config.ts  # Konfiguracja Playwright
├── package.json
└── README.md
```

## Instalacja

```bash
cd /web/quarc/tests
npm install
```

## Uruchamianie testów

### Wszystkie testy
```bash
npm test
```

### Tylko testy E2E
```bash
npm run test:e2e
```

### Tylko testy jednostkowe
```bash
npm run test:unit
```

### Tryb headed (z widoczną przeglądarką)
```bash
npm run test:headed
```

### Tryb debug
```bash
npm run test:debug
```

### UI Mode (interaktywny)
```bash
npm run test:ui
```

### Raport z testów
```bash
npm run test:report
```

## Jak to działa

### Dev Server

Playwright automatycznie zarządza serwerem deweloperskim:
- **Uruchamianie**: Playwright automatycznie uruchamia `qu serve` przed testami
- **Port**: Serwer nasłuchuje na `http://localhost:4200`
- **Reuse**: W trybie lokalnym serwer jest współdzielony między uruchomieniami
- **Zamykanie**: Playwright automatycznie zamyka serwer po testach

Konfiguracja w `playwright.config.ts`:
```typescript
webServer: {
  command: 'cd e2e/app && node ../../../cli/bin/qu.js serve',
  url: 'http://localhost:4200',
  reuseExistingServer: !process.env.CI,
  timeout: 120000,
}
```

### Testy E2E

Testy E2E sprawdzają działanie wszystkich pipes w prawdziwej aplikacji:

- **UpperCasePipe** - transformacja na wielkie litery
- **LowerCasePipe** - transformacja na małe litery
- **JsonPipe** - serializacja do JSON
- **Case Pipes** - CamelCase, PascalCase, SnakeCase, KebabCase
- **DatePipe** - formatowanie dat
- **SubstrPipe** - wycinanie podciągów
- **Pipe Chains** - łańcuchy pipes

Każdy test:
1. Nawiguje do odpowiedniej strony
2. Pobiera wartość `.result` (wynik pipe)
3. Pobiera wartość `.expected` (oczekiwany wynik)
4. Porównuje obie wartości

### Testy jednostkowe

Testy jednostkowe sprawdzają podstawową funkcjonalność:

- **Signals** - signal(), computed(), effect()
- **Reactivity** - aktualizacje i propagacja zmian
- **Core functionality** - podstawowe mechanizmy frameworka

## Aplikacja testowa

Aplikacja w `e2e/app/` to pełna aplikacja Quarc z routingiem:

- Każda strona testuje inny pipe lub grupę pipes
- Komponenty używają signals i metod
- Wyniki są renderowane w `.result`, oczekiwane wartości w `.expected`

## Debugowanie

### Uruchom testy z widoczną przeglądarką
```bash
npm run test:headed
```

### Uruchom w trybie debug
```bash
npm run test:debug
```

### Uruchom aplikację testową manualnie
```bash
cd e2e/app
node ../../../cli/bin/qu.js serve
```
Następnie otwórz http://localhost:4200 w przeglądarce.

### Sprawdź konkretny test
```bash
npx playwright test --grep "UpperCasePipe"
```

### Generuj traces dla niepowodzeń
Traces są automatycznie generowane dla niepowodzeń. Zobacz je przez:
```bash
npm run test:report
```

## CI/CD

W środowisku CI:
- Serwer nie jest współdzielony (`reuseExistingServer: false`)
- Testy mają 2 retry
- Worker count = 1 (sekwencyjne wykonanie)

## Migracja ze starych testów

Stare testy w `/web/quarc/tests/unit/` i `/web/quarc/tests/e2e/` zostały zastąpione przez Playwright.

### Zalety Playwright:

✅ **Automatyczne zarządzanie serwerem** - nie trzeba ręcznie uruchamiać/zamykać
✅ **Prawdziwa przeglądarka** - testy w rzeczywistym środowisku
✅ **Lepsze debugowanie** - UI mode, traces, screenshots
✅ **Szybsze** - równoległe wykonanie testów
✅ **Lepsze raporty** - HTML reports z screenshots i traces
✅ **Cross-browser** - możliwość testowania w Chrome, Firefox, Safari

## Dodawanie nowych testów

### E2E Test

1. Dodaj nowy komponent w `e2e/app/src/pages/`
2. Dodaj route w `e2e/app/src/routes.ts`
3. Dodaj test w `playwright/e2e/pipes.spec.ts`

### Unit Test

Dodaj nowy plik w `playwright/unit/` z rozszerzeniem `.spec.ts`:

```typescript
import { test, expect } from '@playwright/test';

test.describe('My Feature', () => {
  test('should work correctly', () => {
    expect(true).toBe(true);
  });
});
```

## Konfiguracja

Edytuj `playwright.config.ts` aby zmienić:
- Przeglądarki do testowania
- Timeout
- Retry policy
- Reporter
- Base URL
- WebServer command
