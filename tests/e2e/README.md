# Quarc E2E Pipes Tests

Prawdziwe testy end-to-end dla wszystkich pipes w frameworku Quarc.

## Opis

Testy uruchamiają prawdziwą aplikację Quarc z routingiem, gdzie każda strona testuje inny pipe lub grupę pipes. Serwer deweloperski jest uruchamiany na losowym porcie, aby uniknąć konfliktów.

## Struktura

```
e2e/
├── app/                          # Aplikacja testowa
│   ├── pages/                    # Komponenty testowe dla każdego pipe
│   │   ├── home.component.ts
│   │   ├── uppercase-test.component.ts
│   │   ├── lowercase-test.component.ts
│   │   ├── json-test.component.ts
│   │   ├── case-test.component.ts
│   │   ├── date-test.component.ts
│   │   ├── substr-test.component.ts
│   │   └── chain-test.component.ts
│   ├── app.component.ts          # Root component z nawigacją
│   ├── routes.ts                 # Routing configuration
│   ├── main.ts                   # Entry point
│   ├── index.html                # HTML template
│   └── quarc.json                # Quarc config
├── run-e2e-tests.ts              # Test runner
├── package.json
└── README.md
```

## Testowane Pipes

### 1. UpperCasePipe (`/uppercase`)
- Hardcoded string
- Signal value
- Method call
- Z operatorem `||`

### 2. LowerCasePipe (`/lowercase`)
- Hardcoded string
- Signal value
- Method call

### 3. JsonPipe (`/json`)
- Number literal (123)
- String literal ("string")
- Boolean literal (true)
- Object z signal
- Array z signal
- Object z method

### 4. Case Pipes (`/case`)
- CamelCasePipe
- PascalCasePipe
- SnakeCasePipe
- KebabCasePipe
- Z signal values

### 5. DatePipe (`/date`)
- Custom format `yyyy-MM-dd`
- Custom format `HH:mm:ss`
- Predefined format `shortDate`
- Z method call

### 6. SubstrPipe (`/substr`)
- Z start i length
- Z start only
- Signal value
- Method call

### 7. Pipe Chain (`/chain`)
- lowercase | uppercase
- uppercase | substr
- Signal z chain
- Method z chain
- Triple chain

## Struktura projektów

Testy e2e składają się z dwóch osobnych projektów:

1. **`/web/quarc/tests/e2e`** - główny projekt testowy
   - Zawiera runner testów (`run-e2e-tests.ts`)
   - `postinstall`: automatycznie instaluje zależności w `app/`
   - `preserve`: zapewnia że `app/` ma zainstalowane zależności przed serve

2. **`/web/quarc/tests/e2e/app`** - aplikacja testowa
   - Zawiera komponenty testujące wszystkie pipes
   - Ma własne `package.json` z zależnościami (typescript, ts-node, @types/node)
   - Build: `npm run build`
   - Serve: `npm run serve` (instaluje zależności i uruchamia dev server)

## Uruchomienie

```bash
cd /web/quarc/tests/e2e
npm install  # Zainstaluje zależności w e2e/ i automatycznie w app/
npm test     # Zbuduje app, uruchomi serwer i wykona testy
```

## Jak to działa

1. **Start serwera**: Uruchamia `qu serve` na losowym porcie (3000-8000)
2. **Czekanie**: Odczytuje output serwera i czeka aż będzie nasłuchiwał
3. **Testy**: Dla każdego route:
   - Pobiera HTML strony
   - Parsuje wyniki testów (porównuje `.result` z `.expected`)
   - Zapisuje wyniki
4. **Raport**: Wyświetla podsumowanie wszystkich testów
5. **Cleanup**: Zamyka serwer deweloperski

## Przykładowy output

```
🧪 Starting E2E Pipes Test Suite

🚀 Starting dev server on port 4523...
✓ Server started at http://localhost:4523
⏳ Waiting for server to be ready...
✓ Server is ready

📋 Testing: UpperCase Pipe (/uppercase)
  ✓ test-1: PASS
  ✓ test-2: PASS
  ✓ test-3: PASS
  ✓ test-4: PASS

📋 Testing: JSON Pipe (/json)
  ✓ test-1: PASS
  ✓ test-2: PASS
  ✓ test-3: PASS
  ✓ test-4: PASS
  ✓ test-5: PASS
  ✓ test-6: PASS

...

============================================================
📊 E2E TEST RESULTS
============================================================
✓ /uppercase: 4/4 passed
✓ /lowercase: 3/3 passed
✓ /json: 6/6 passed
✓ /case: 5/5 passed
✓ /date: 4/4 passed
✓ /substr: 4/4 passed
✓ /chain: 5/5 passed
============================================================
Total: 31/31 tests passed
Success rate: 100.0%

✅ All E2E tests passed!

🛑 Stopping dev server...
```

## Debugowanie

Jeśli testy nie przechodzą:

1. Uruchom aplikację manualnie:
   ```bash
   cd app
   ../../../cli/bin/qu.js serve
   ```

2. Otwórz w przeglądarce i sprawdź każdy route

3. Sprawdź console w DevTools

4. Porównaj `.result` z `.expected` wizualnie

## Uwagi

- Testy używają `fetch()` do pobierania HTML, więc wymagają Node.js 18+
- Serwer jest uruchamiany na losowym porcie aby uniknąć konfliktów
- Każdy test czeka 1s po nawigacji aby komponent się wyrenderował
- Testy porównują znormalizowany tekst (bez whitespace dla JSON)
