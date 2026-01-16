# Fragment Re-rendering

System fragment re-rendering pozwala na selektywne przeładowywanie części DOM bez konieczności re-renderowania całego komponentu.

## Jak to działa

Każdy `ng-container` w template jest zastępowany parą komentarzy-markerów:

```html
<!-- Przed przetworzeniem -->
<ng-container *ngIf="showDetails">
  <div>Szczegóły</div>
</ng-container>

<!-- Po przetworzeniu w DOM -->
<!--ng-container-start *ngIf="showDetails"-->
  <div>Szczegóły</div>
<!--ng-container-end-->
```

## Zalety

1. **Widoczność w DevTools** - możesz zobaczyć w DOM gdzie był `ng-container`
2. **Selektywne re-renderowanie** - możesz przeładować tylko fragment zamiast całego komponentu
3. **Zachowanie struktury** - markery pokazują dokładne granice fragmentu
4. **Debugowanie** - łatwiej śledzić które fragmenty są renderowane

## API

### Pobranie TemplateFragment

```typescript
const appRoot = document.querySelector('app-root') as any;
const templateFragment = appRoot.templateFragment;
```

### Pobranie informacji o markerach

```typescript
const markers = templateFragment.getFragmentMarkers();

// Zwraca tablicę obiektów:
// {
//   startMarker: Comment,      // Komentarz początkowy
//   endMarker: Comment,        // Komentarz końcowy
//   condition?: string,        // Warunek *ngIf (jeśli istnieje)
//   originalTemplate: string   // Oryginalny HTML fragmentu
// }
```

### Re-renderowanie konkretnego fragmentu

```typescript
// Re-renderowanie fragmentu po indeksie
templateFragment.rerenderFragment(0);

// Lub znalezienie fragmentu po warunku
const markers = templateFragment.getFragmentMarkers();
const index = markers.findIndex(m => m.condition?.includes('showDetails'));
if (index >= 0) {
  templateFragment.rerenderFragment(index);
}
```

### Re-renderowanie wszystkich fragmentów

```typescript
templateFragment.rerenderAllFragments();
```

## Przykłady użycia

### Przykład 1: Toggle visibility

```typescript
// Komponent
class MyComponent {
  showDetails = false;

  toggleDetails() {
    this.showDetails = !this.showDetails;

    // Re-renderuj fragment z showDetails
    const appRoot = document.querySelector('app-root') as any;
    const templateFragment = appRoot.templateFragment;
    const markers = templateFragment.getFragmentMarkers();

    const detailsIndex = markers.findIndex(m =>
      m.condition?.includes('showDetails')
    );

    if (detailsIndex >= 0) {
      templateFragment.rerenderFragment(detailsIndex);
    }
  }
}
```

### Przykład 2: Conditional rendering

```html
<!-- Template -->
<ng-container *ngIf="isLoggedIn">
  <div>Witaj, {{ userName }}!</div>
</ng-container>

<ng-container *ngIf="!isLoggedIn">
  <button (click)="login()">Zaloguj się</button>
</ng-container>
```

```typescript
// Po zalogowaniu
login() {
  this.isLoggedIn = true;
  this.userName = 'Jan Kowalski';

  // Re-renderuj wszystkie fragmenty
  const appRoot = document.querySelector('app-root') as any;
  appRoot.templateFragment.rerenderAllFragments();
}
```

### Przykład 3: Debugowanie w DevTools

```typescript
// W konsoli przeglądarki
const appRoot = document.querySelector('app-root');
const markers = appRoot.templateFragment.getFragmentMarkers();

console.table(markers.map((m, i) => ({
  index: i,
  condition: m.condition || 'none',
  hasContent: m.originalTemplate.length > 0
})));

// Re-renderuj konkretny fragment
appRoot.templateFragment.rerenderFragment(2);
```

## Inspekcja w DevTools

W DevTools możesz zobaczyć markery jako komentarze:

```html
<app-root>
  <div>app</div>
  <!--ng-container-start *ngIf="false"-->
  <!--ng-container-end-->
  <!--ng-container-start *ngIf="true"-->
    <div>Widoczna zawartość</div>
  <!--ng-container-end-->
</app-root>
```

## Wydajność

- Re-renderowanie fragmentu jest szybsze niż re-renderowanie całego komponentu
- Markery w DOM zajmują minimalną ilość pamięci (tylko komentarze)
- Property bindings są przetwarzane tylko dla re-renderowanego fragmentu

## Ograniczenia

1. Markery są dodawane tylko dla `ng-container` z `*ngIf`
2. Zagnieżdżone `ng-container` mają osobne pary markerów
3. Zmiana warunku wymaga ręcznego wywołania `rerenderFragment()`

## Przyszłe rozszerzenia

Planowane funkcjonalności:

- Automatyczne re-renderowanie przy zmianie właściwości
- Obsługa `*ngFor` w fragmentach
- Animacje przy re-renderowaniu
- Lazy loading fragmentów
