# Optymalizacje Quarc dla urządzeń embedded

Quarc oferuje zaawansowane opcje optymalizacji, które pozwalają zminimalizować rozmiar aplikacji dla urządzeń z ograniczoną pamięcią.

## Opcje optymalizacji

### 1. `minifyTemplate` (boolean)

Minifikuje szablony HTML poprzez:
- Usuwanie komentarzy HTML
- Usuwanie białych znaków między tagami
- Redukowanie wielokrotnych spacji do jednej w tekście
- Zachowanie spacji między tagami a tekstem

**Przykład:**

```json
{
  "environments": {
    "production": {
      "minifyTemplate": true
    }
  }
}
```

**Przed:**
```html
<div class="container">
  <h1>Tytuł</h1>
  <!-- Komentarz -->
  <p>
    Tekst z     wieloma spacjami
  </p>
</div>
```

**Po:**
```html
<div class="container"><h1>Tytuł</h1><p>Tekst z wieloma spacjami</p></div>
```

**Oszczędność:** ~30-50% rozmiaru szablonów

### 2. `removeConsole` (boolean)

Całkowicie usuwa wszystkie wywołania `console.*` z kodu:
- `console.log()`
- `console.error()`
- `console.warn()`
- `console.info()`
- `console.debug()`
- `console.trace()`

**Przykład:**

```json
{
  "environments": {
    "production": {
      "removeConsole": true
    }
  }
}
```

**Przed:**
```typescript
export class MyComponent {
  ngOnInit() {
    console.log('Component initialized');
    this.loadData();
  }
}
```

**Po:**
```typescript
export class MyComponent {
  ngOnInit() {
    /* removed */
    this.loadData();
  }
}
```

**Oszczędność:** ~5-15% w zależności od ilości logowania

### 3. `removeComments` (boolean)

Usuwa wszystkie komentarze z kodu JavaScript (włącznie z licencjami):

```json
{
  "environments": {
    "production": {
      "removeComments": true
    }
  }
}
```

**Oszczędność:** ~2-5%

### 4. `aggressiveTreeShaking` (boolean)

Włącza agresywny tree-shaking, który:
- Ignoruje adnotacje `@__PURE__`
- Usuwa nieużywany kod nawet jeśli ma side effects
- Bardziej agresywnie eliminuje martwy kod

**UWAGA:** Może usunąć kod, który jest potrzebny w niektórych przypadkach. Testuj dokładnie!

```json
{
  "environments": {
    "production": {
      "aggressiveTreeShaking": true
    }
  }
}
```

**Oszczędność:** ~10-20% dodatkowej redukcji

### 5. `minifyNames` (boolean)

Minifikuje nazwy zmiennych i funkcji (już istniejąca opcja):

```json
{
  "environments": {
    "production": {
      "minifyNames": true
    }
  }
}
```

**Oszczędność:** ~20-30%

### 6. `compressed` (boolean)

Kompresuje output za pomocą gzip (już istniejąca opcja):

```json
{
  "environments": {
    "production": {
      "compressed": true
    }
  }
}
```

**Oszczędność:** ~70-80% rozmiaru transferu

## Przykładowe konfiguracje

### Maksymalna optymalizacja dla ESP32

```json
{
  "environment": "production",
  "build": {
    "minifyNames": true,
    "styles": ["src/main.scss"],
    "limits": {
      "total": {
        "warning": "30 KB",
        "error": "50 KB"
      },
      "main": {
        "warning": "20 KB",
        "error": "30 KB"
      }
    }
  },
  "environments": {
    "production": {
      "treatWarningsAsErrors": true,
      "minifyNames": true,
      "minifyTemplate": true,
      "generateSourceMaps": false,
      "compressed": true,
      "removeComments": true,
      "removeConsole": true,
      "aggressiveTreeShaking": true
    }
  }
}
```

**Oczekiwany rozmiar:** 5-25 KB (w zależności od funkcjonalności)

### Zbalansowana konfiguracja

```json
{
  "environment": "production",
  "environments": {
    "production": {
      "treatWarningsAsErrors": false,
      "minifyNames": true,
      "minifyTemplate": true,
      "generateSourceMaps": false,
      "compressed": true,
      "removeComments": true,
      "removeConsole": false,
      "aggressiveTreeShaking": false
    }
  }
}
```

**Oczekiwany rozmiar:** 15-40 KB

### Development (bez optymalizacji)

```json
{
  "environment": "development",
  "environments": {
    "development": {
      "treatWarningsAsErrors": false,
      "minifyNames": false,
      "minifyTemplate": false,
      "generateSourceMaps": true,
      "compressed": false,
      "removeComments": false,
      "removeConsole": false,
      "aggressiveTreeShaking": false,
      "devServer": {
        "port": 4200
      }
    }
  }
}
```

## Porównanie rozmiarów

| Konfiguracja | Rozmiar (nieskompresowany) | Rozmiar (gzip) | Oszczędność |
|--------------|---------------------------|----------------|-------------|
| Bez optymalizacji | 150 KB | 45 KB | - |
| Podstawowa (`minifyNames`) | 105 KB | 32 KB | 30% / 29% |
| Zbalansowana | 75 KB | 22 KB | 50% / 51% |
| Maksymalna | 45 KB | 12 KB | 70% / 73% |

*Wartości przykładowe dla aplikacji z routingiem i kilkoma komponentami*

## Rekomendacje dla różnych urządzeń

### ESP32 (520 KB SRAM, 4 MB Flash)
```json
{
  "minifyTemplate": true,
  "removeConsole": true,
  "removeComments": true,
  "aggressiveTreeShaking": true,
  "minifyNames": true,
  "compressed": true
}
```

### Arduino (32 KB Flash)
```json
{
  "minifyTemplate": true,
  "removeConsole": true,
  "removeComments": true,
  "aggressiveTreeShaking": true,
  "minifyNames": true,
  "compressed": true
}
```
**Uwaga:** Dla Arduino może być konieczne usunięcie niektórych funkcjonalności

### Routery OpenWrt (8-32 MB Flash)
```json
{
  "minifyTemplate": true,
  "removeConsole": false,
  "removeComments": true,
  "aggressiveTreeShaking": false,
  "minifyNames": true,
  "compressed": true
}
```

### Raspberry Pi / urządzenia z większą pamięcią
```json
{
  "minifyTemplate": false,
  "removeConsole": false,
  "removeComments": false,
  "aggressiveTreeShaking": false,
  "minifyNames": true,
  "compressed": true
}
```

## Testowanie optymalizacji

1. **Build z optymalizacjami:**
```bash
qu build --env production
```

2. **Sprawdź rozmiary:**
```bash
ls -lh dist/
```

3. **Testuj funkcjonalność:**
```bash
qu serve --env production
```

4. **Sprawdź w przeglądarce:**
- Otwórz DevTools
- Sprawdź Network tab
- Upewnij się, że wszystko działa poprawnie

## Debugowanie problemów

### Aplikacja nie działa po włączeniu `aggressiveTreeShaking`

Wyłącz `aggressiveTreeShaking` i sprawdź czy problem znika:

```json
{
  "aggressiveTreeShaking": false
}
```

### Brakuje logów w konsoli

Sprawdź czy `removeConsole` nie jest włączone:

```json
{
  "removeConsole": false
}
```

### Szablony wyglądają źle

Wyłącz `minifyTemplate` i sprawdź czy to rozwiązuje problem:

```json
{
  "minifyTemplate": false
}
```

## Dodatkowe wskazówki

1. **Lazy loading** - Użyj lazy loading dla routes aby zmniejszyć initial bundle:
```typescript
{
  path: 'dashboard',
  loadComponent: () => import('./dashboard/dashboard.component')
    .then(m => m.DashboardComponent),
}
```

2. **External scripts** - Przenieś duże biblioteki na zewnętrzny serwer:
```typescript
bootstrapApplication(AppComponent, {
  externalUrls: ['https://cdn.example.com/icons.js']
});
```

3. **Code splitting** - Wykorzystaj automatyczny code splitting w esbuild

4. **Monitoruj rozmiary** - Ustaw limity w `quarc.json`:
```json
{
  "build": {
    "limits": {
      "total": {
        "warning": "50 KB",
        "error": "100 KB"
      }
    }
  }
}
```

## Podsumowanie

Łącząc wszystkie optymalizacje możesz osiągnąć:
- **70-80% redukcji** rozmiaru nieskompresowanego
- **60-75% redukcji** rozmiaru skompresowanego (gzip)
- **Typowy rozmiar:** 5-25 KB dla podstawowych aplikacji
- **Idealny dla:** ESP32, Arduino, routery, IoT devices
