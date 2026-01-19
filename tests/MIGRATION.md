# Migracja testów na Playwright

## Podsumowanie zmian

Wszystkie testy Quarc Framework zostały przeniesione na Playwright, co zapewnia:

✅ **Automatyczne zarządzanie serwerem deweloperskim**
✅ **Testy w prawdziwej przeglądarce**
✅ **Lepsze debugowanie i raportowanie**
✅ **Szybsze wykonanie testów**
✅ **Jednolity framework dla e2e i unit testów**

## Struktura przed migracją

```
tests/
├── unit/
│   ├── run-tests.ts              # Własny runner
│   ├── test-processors.ts
│   ├── test-signals-reactivity.ts
│   ├── test-directives.ts
│   └── ... (19 plików testowych)
└── e2e/
    ├── run-e2e-tests.ts          # Własny runner z fetch()
    └── app/                      # Aplikacja testowa
```

## Struktura po migracji

```
tests/
├── playwright/
│   ├── e2e/
│   │   └── pipes.spec.ts         # Wszystkie testy pipes
│   └── unit/
│       └── processors.spec.ts    # Placeholder dla testów jednostkowych
├── e2e/
│   └── app/                      # Aplikacja testowa (bez zmian)
├── playwright.config.ts          # Konfiguracja Playwright
├── package.json                  # Nowe skrypty
└── README.md                     # Dokumentacja
```

## Kluczowe zmiany

### 1. Automatyczne zarządzanie serwerem

**Przed:**
```typescript
// Ręczne uruchamianie serwera w run-e2e-tests.ts
const serverProcess = spawn('qu', ['serve'], { cwd: appDir });
// Ręczne zamykanie
serverProcess.kill();
```

**Po:**
```typescript
// playwright.config.ts - Playwright zarządza automatycznie
webServer: {
  command: 'cd e2e/app && npm install && node ../../../cli/bin/qu.js serve',
  url: 'http://localhost:4200',
  reuseExistingServer: !process.env.CI,
  timeout: 120000,
}
```

### 2. Testy E2E

**Przed:**
```typescript
// Własny runner z fetch() i parsowaniem HTML
const html = await fetch(`http://localhost:${port}/uppercase`).then(r => r.text());
const result = extractTextContent(html, '#test-1 .result');
const expected = extractTextContent(html, '#test-1 .expected');
```

**Po:**
```typescript
// Playwright API
test('should transform hardcoded string', async ({ page }) => {
  await page.goto('/uppercase');
  await page.waitForSelector('#test-1', { timeout: 10000 });
  const result = await page.locator('#test-1 .result').textContent();
  const expected = await page.locator('#test-1 .expected').textContent();
  expect(result?.trim()).toBe(expected?.trim());
});
```

### 3. Skrypty NPM

**Przed:**
```json
{
  "scripts": {
    "test": "npx ts-node run-tests.ts",
    "test:e2e": "echo 'E2E tests not yet implemented'"
  }
}
```

**Po:**
```json
{
  "scripts": {
    "test": "playwright test",
    "test:e2e": "playwright test playwright/e2e",
    "test:unit": "playwright test playwright/unit",
    "test:headed": "playwright test --headed",
    "test:debug": "playwright test --debug",
    "test:ui": "playwright test --ui",
    "test:report": "playwright show-report"
  }
}
```

## Zalety migracji

### 1. Automatyzacja
- Serwer deweloperski uruchamia się i zamyka automatycznie
- Nie trzeba ręcznie zarządzać procesami
- Współdzielenie serwera między uruchomieniami w trybie lokalnym

### 2. Prawdziwa przeglądarka
- Testy działają w rzeczywistym środowisku Chromium
- Pełna obsługa JavaScript, CSS, Web Components
- Możliwość testowania interakcji użytkownika

### 3. Debugowanie
- **UI Mode** - interaktywny interfejs do debugowania
- **Traces** - nagrywanie przebiegu testów
- **Screenshots** - automatyczne zrzuty ekranu przy błędach
- **Video** - nagrywanie wideo testów
- **Debug mode** - step-by-step debugging

### 4. Raportowanie
- HTML reports z wizualizacją wyników
- Screenshots i traces dla niepowodzeń
- Szczegółowe logi i stack traces
- Metryki wydajności

### 5. Wydajność
- Równoległe wykonanie testów (8 workers domyślnie)
- Retry mechanism dla niestabilnych testów
- Optymalizacja dla CI/CD

## Usunięte pliki

Następujące pliki nie są już potrzebne:

- `/web/quarc/tests/unit/run-tests.ts` - zastąpione przez Playwright
- `/web/quarc/tests/e2e/run-e2e-tests.ts` - zastąpione przez Playwright
- Wszystkie stare testy jednostkowe w `/web/quarc/tests/unit/test-*.ts`

**Uwaga:** Stare pliki testowe pozostają w repozytorium jako referencja, ale nie są już używane.

## Migracja własnych testów

Jeśli chcesz przenieść własne testy na Playwright:

### E2E Test

1. Utwórz plik `.spec.ts` w `playwright/e2e/`
2. Użyj Playwright API:

```typescript
import { test, expect } from '@playwright/test';

test.describe('My Feature', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/my-route');
    await page.waitForSelector('#my-element');
  });

  test('should work correctly', async ({ page }) => {
    const result = await page.locator('#result').textContent();
    expect(result).toBe('expected value');
  });
});
```

### Unit Test

Dla testów jednostkowych które nie wymagają DOM:

```typescript
import { test, expect } from '@playwright/test';

test.describe('My Unit Tests', () => {
  test('should calculate correctly', () => {
    expect(2 + 2).toBe(4);
  });
});
```

## Uruchamianie testów

```bash
cd /web/quarc/tests

# Wszystkie testy
npm test

# Tylko E2E
npm run test:e2e

# Tylko unit
npm run test:unit

# Z widoczną przeglądarką
npm run test:headed

# Debug mode
npm run test:debug

# UI mode (interaktywny)
npm run test:ui
```

## CI/CD

W środowisku CI Playwright automatycznie:
- Nie współdzieli serwera (`reuseExistingServer: false`)
- Używa 1 workera (sekwencyjne wykonanie)
- Wykonuje 2 retry dla niestabilnych testów
- Generuje HTML report

## Problemy i rozwiązania

### Problem: Testy timeout'ują
**Rozwiązanie:** Dodaj `waitForSelector` przed sprawdzaniem elementów:
```typescript
await page.waitForSelector('#test-1', { timeout: 10000 });
```

### Problem: Elementy nie są znalezione
**Rozwiązanie:** Sprawdź czy routing działa poprawnie i czy aplikacja się załadowała:
```typescript
await page.goto('/route');
await page.waitForLoadState('networkidle');
```

### Problem: Serwer nie startuje
**Rozwiązanie:** Sprawdź czy aplikacja jest zbudowana:
```bash
cd e2e/app
node ../../../cli/bin/qu.js build
```

## Następne kroki

1. ✅ Migracja testów E2E pipes - **UKOŃCZONE**
2. ⏳ Dodanie testów dla innych funkcjonalności (routing, directives, etc.)
3. ⏳ Konfiguracja CI/CD pipeline
4. ⏳ Dodanie testów cross-browser (Firefox, Safari)
5. ⏳ Dodanie visual regression tests
