# Template Helpers

System helperów do parsowania i przetwarzania atrybutów Angular w szablonach HTML.

## Architektura

```
helpers/
├── TemplateParser - Parser HTML do drzewa elementów
├── ControlFlowTransformer - Transformacja @if/@else do *ngIf
├── ContentInterpolation - Transformacja {{ }} do [innerText] (w TemplateTransformer)
├── BaseAttributeHelper - Klasa bazowa dla helperów atrybutów
├── StructuralDirectiveHelper - Obsługa dyrektyw strukturalnych (*ngIf, *ngFor)
├── InputBindingHelper - Obsługa bindowania wejść ([property])
├── OutputBindingHelper - Obsługa bindowania wyjść ((event))
├── TwoWayBindingHelper - Obsługa bindowania dwukierunkowego ([(model)])
└── TemplateReferenceHelper - Obsługa referencji do elementów (#ref)
```

## TemplateParser

Parser HTML, który konwertuje szablon na drzewo elementów z wyodrębnionymi atrybutami.

### Interfejsy

```typescript
interface ParsedElement {
    tagName: string;
    attributes: ParsedAttribute[];
    children: (ParsedElement | ParsedTextNode)[];
    textContent?: string;
}

interface ParsedTextNode {
    type: 'text';
    content: string;
}

interface ParsedAttribute {
    name: string;
    value: string;
    type: AttributeType;
}

enum AttributeType {
    STRUCTURAL_DIRECTIVE = 'structural',
    INPUT_BINDING = 'input',
    OUTPUT_BINDING = 'output',
    TWO_WAY_BINDING = 'two-way',
    TEMPLATE_REFERENCE = 'reference',
    REGULAR = 'regular',
}
```

### Użycie

```typescript
const parser = new TemplateParser();
const elements = parser.parse('<div [title]="value">Content</div>');

// Iteracja po wszystkich elementach (pomija text nodes)
parser.traverseElements(elements, (element) => {
    console.log(element.tagName, element.attributes);
});

// Przetwarzanie wszystkich węzłów włącznie z text nodes
for (const node of elements) {
    if ('type' in node && node.type === 'text') {
        console.log('Text:', node.content);
    } else {
        console.log('Element:', node.tagName);
    }
}
```

### Obsługa Text Nodes

Parser automatycznie wykrywa i zachowuje text nodes jako osobne węzły w drzewie:

```typescript
const template = `
<div>
    Header text
    <p>Paragraph</p>
    Footer text
</div>
`;

const elements = parser.parse(template);
// Zwraca drzewo z text nodes jako osobnymi węzłami typu ParsedTextNode
```

**Cechy text nodes:**
- Zachowują białe znaki (spacje, nowe linie, tabulatory)
- Są pomijane przez `traverseElements()` (tylko elementy HTML)
- Mogą występować na poziomie root lub jako dzieci elementów
- Są prawidłowo rekonstruowane podczas budowania HTML

## ControlFlowTransformer

Transformer konwertujący nową składnię Angular control flow (`@if`, `@else if`, `@else`) na starą składnię z dyrektywami `*ngIf`.

### Transformacje

**Prosty @if:**
```typescript
// Input
@if (isVisible) {
    <div>Content</div>
}

// Output
<ng-container *ngIf="isVisible">
    <div>Content</div>
</ng-container>
```

**@if z @else:**
```typescript
// Input
@if (isAdmin) {
    <span>Admin</span>
} @else {
    <span>User</span>
}

// Output
<ng-container *ngIf="isAdmin">
    <span>Admin</span>
</ng-container>
<ng-container *ngIf="!(isAdmin)">
    <span>User</span>
</ng-container>
```

**@if z @else if:**
```typescript
// Input
@if (role === 'admin') {
    <span>Admin</span>
} @else if (role === 'user') {
    <span>User</span>
} @else {
    <span>Guest</span>
}

// Output
<ng-container *ngIf="role === 'admin'">
    <span>Admin</span>
</ng-container>
<ng-container *ngIf="!(role === 'admin') && role === 'user'">
    <span>User</span>
</ng-container>
<ng-container *ngIf="!(role === 'admin') && !(role === 'user')">
    <span>Guest</span>
</ng-container>
```

### Użycie

```typescript
import { ControlFlowTransformer } from './control-flow-transformer';

const transformer = new ControlFlowTransformer();
const template = '@if (show) { <div>Content</div> }';
const result = transformer.transform(template);
// '<ng-container *ngIf="show"> <div>Content</div> </ng-container>'
```

### Optymalizacja

`ControlFlowTransformer` jest współdzielony między `TemplateProcessor` a innymi komponentami, co zmniejsza rozmiar końcowej aplikacji poprzez uniknięcie duplikacji kodu.

## Content Interpolation

Transformacja interpolacji Angular (`{{ expression }}`) na property binding z `innerText` (bezpieczniejsze niż innerHTML - zapobiega XSS).

### Transformacja

```typescript
// Input
<div>{{ userName }}</div>
<span>Value: {{ data }}</span>

// Output
<div><span [innerText]="userName"></span></div>
<span>Value: <span [innerText]="data"></span></span>
```

### Użycie

Transformacja jest częścią `TemplateTransformer`:

```typescript
import { TemplateTransformer } from './processors/template/template-transformer';

const transformer = new TemplateTransformer();
const template = '<div>{{ message }}</div>';
const result = transformer.transformInterpolation(template);
// '<div><span [innerText]="message"></span></div>'
```

### Obsługa w Runtime

Property bindings `[innerText]` są przetwarzane w runtime przez `TemplateFragment.processPropertyBindings()`:

1. Znajduje wszystkie atrybuty w formacie `[propertyName]`
2. Tworzy `effect` który reaguje na zmiany sygnałów
3. Ewaluuje wyrażenie w kontekście komponentu
4. Przypisuje wartość do właściwości DOM elementu: `element[propertyName] = value`
5. Usuwa atrybut z elementu

Dzięki temu `[innerText]`, `[innerHTML]`, `[textContent]`, `[value]` i inne property bindings działają automatycznie z granularną reaktywnością.

## Fragment Re-rendering

Każdy `ng-container` jest zastępowany parą komentarzy-markerów w DOM:

```html
<!-- ng-container-start *ngIf="condition" -->
  <!-- zawartość renderowana gdy warunek jest true -->
<!-- ng-container-end -->
```

### Zalety

1. **Widoczność w DOM** - można zobaczyć gdzie był `ng-container`
2. **Selektywne re-renderowanie** - można przeładować tylko fragment zamiast całego komponentu
3. **Zachowanie struktury** - markery pokazują granice fragmentu

### API

```typescript
// Pobranie TemplateFragment z elementu
const appRoot = document.querySelector('app-root') as any;
const templateFragment = appRoot.templateFragment;

// Pobranie informacji o markerach
const markers = templateFragment.getFragmentMarkers();
// Returns: Array<{ startMarker, endMarker, condition?, originalTemplate }>

// Re-renderowanie konkretnego fragmentu (po indeksie)
templateFragment.rerenderFragment(0);

// Re-renderowanie wszystkich fragmentów
templateFragment.rerenderAllFragments();
```

### Przykład użycia

```typescript
// Zmiana właściwości komponentu
component.showDetails = true;

// Re-renderowanie fragmentu który zależy od tej właściwości
const markers = templateFragment.getFragmentMarkers();
const detailsFragmentIndex = markers.findIndex(m =>
  m.condition?.includes('showDetails')
);
if (detailsFragmentIndex >= 0) {
  templateFragment.rerenderFragment(detailsFragmentIndex);
}
```

## BaseAttributeHelper

Abstrakcyjna klasa bazowa dla wszystkich helperów obsługujących atrybuty.

### Interfejs

```typescript
abstract class BaseAttributeHelper {
    abstract get supportedType(): string;
    abstract canHandle(attribute: ParsedAttribute): boolean;
    abstract process(context: AttributeProcessingContext): AttributeProcessingResult;
}

interface AttributeProcessingContext {
    element: ParsedElement;
    attribute: ParsedAttribute;
    filePath: string;
}

interface AttributeProcessingResult {
    transformed: boolean;
    newAttribute?: ParsedAttribute;
    additionalAttributes?: ParsedAttribute[];
    removeOriginal?: boolean;
}
```

## Helpery Atrybutów

### StructuralDirectiveHelper

Obsługuje dyrektywy strukturalne Angular.

**Rozpoznawane atrybuty:**
- `*ngIf` - warunkowe renderowanie
- `*ngFor` - iteracja po kolekcji
- `*ngSwitch` - przełączanie widoków

**Przykład:**
```html
<div *ngIf="isVisible">Content</div>
<li *ngFor="let item of items">{{ item }}</li>
```

### InputBindingHelper

Obsługuje bindowanie właściwości wejściowych.

**Format:** `[propertyName]="expression"`

**Przykład:**
```html
<app-child [title]="parentTitle"></app-child>
<img [src]="imageUrl" />
```

### OutputBindingHelper

Obsługuje bindowanie zdarzeń wyjściowych.

**Format:** `(eventName)="handler()"`

**Przykład:**
```html
<button (click)="handleClick()">Click</button>
<app-child (valueChange)="onValueChange($event)"></app-child>
```

### TwoWayBindingHelper

Obsługuje bindowanie dwukierunkowe (banana-in-a-box).

**Format:** `[(propertyName)]="variable"`

**Przykład:**
```html
<input [(ngModel)]="username" />
<app-custom [(value)]="data"></app-custom>
```

### TemplateReferenceHelper

Obsługuje referencje do elementów w szablonie.

**Format:** `#referenceName`

**Przykład:**
```html
<input #nameInput type="text" />
<button (click)="nameInput.focus()">Focus</button>
```

## Tworzenie Własnego Helpera

```typescript
import { BaseAttributeHelper, AttributeProcessingContext, AttributeProcessingResult } from './base-attribute-helper';
import { AttributeType, ParsedAttribute } from './template-parser';

export class CustomAttributeHelper extends BaseAttributeHelper {
    get supportedType(): string {
        return 'custom-attribute';
    }

    canHandle(attribute: ParsedAttribute): boolean {
        // Logika określająca czy helper obsługuje dany atrybut
        return attribute.name.startsWith('custom-');
    }

    process(context: AttributeProcessingContext): AttributeProcessingResult {
        // Logika przetwarzania atrybutu
        return {
            transformed: true,
            newAttribute: {
                name: 'data-custom',
                value: context.attribute.value,
                type: AttributeType.REGULAR,
            },
        };
    }
}
```

## Integracja z TemplateProcessor

Helpery są automatycznie wykorzystywane przez `TemplateProcessor` podczas przetwarzania szablonów:

```typescript
export class TemplateProcessor extends BaseProcessor {
    private parser: TemplateParser;
    private attributeHelpers: BaseAttributeHelper[];

    constructor() {
        super();
        this.parser = new TemplateParser();
        this.attributeHelpers = [
            new StructuralDirectiveHelper(),
            new InputBindingHelper(),
            new OutputBindingHelper(),
            new TwoWayBindingHelper(),
            new TemplateReferenceHelper(),
            // Dodaj własne helpery tutaj
        ];
    }
}
```

## Kolejność Przetwarzania

1. **Parsowanie** - `TemplateParser` konwertuje HTML na drzewo elementów
2. **Transformacja control flow** - `@if/@else` → `*ngIf`
3. **Przetwarzanie atrybutów** - Helpery przetwarzają atrybuty każdego elementu
4. **Rekonstrukcja** - Drzewo jest konwertowane z powrotem na HTML
5. **Escapowanie** - Znaki specjalne są escapowane dla template string

## Wykrywanie Typów Atrybutów

Parser automatycznie wykrywa typ atrybutu na podstawie składni:

| Składnia | Typ | Helper |
|----------|-----|--------|
| `*ngIf` | STRUCTURAL_DIRECTIVE | StructuralDirectiveHelper |
| `[property]` | INPUT_BINDING | InputBindingHelper |
| `(event)` | OUTPUT_BINDING | OutputBindingHelper |
| `[(model)]` | TWO_WAY_BINDING | TwoWayBindingHelper |
| `#ref` | TEMPLATE_REFERENCE | TemplateReferenceHelper |
| `class` | REGULAR | - |

## Runtime Bindings (TemplateFragment)

Podczas renderowania szablonu w runtime, `TemplateFragment` przetwarza bindingi:

### Input Bindings dla Custom Elements

Dla elementów z `-` w nazwie (custom elements), input bindings tworzą signale w `__inputs`:

```html
<app-toolbar [mode]="currentMode" [title]="pageTitle"></app-toolbar>
```

```typescript
// W runtime element będzie miał:
element.__inputs = {
    mode: WritableSignal<any>,   // signal z wartością currentMode
    title: WritableSignal<any>,  // signal z wartością pageTitle
};

// W komponencie można odczytać:
const mode = this._nativeElement.__inputs?.['mode']?.();
```

### Output Bindings

Output bindings są obsługiwane przez `addEventListener`:

```html
<app-toolbar (menu-click)="toggleMenu()" (search)="onSearch($event)"></app-toolbar>
```

```typescript
// W runtime dodawane są event listenery:
element.addEventListener('menuClick', (event) => {
    component.toggleMenu();
});
element.addEventListener('search', (event) => {
    component.onSearch(event);
});
```

### Specjalne Bindingi

#### `[attr.X]` - Attribute Binding

```html
<button [attr.disabled]="isDisabled" [attr.aria-label]="label"></button>
```

- `true` → ustawia pusty atrybut
- `false/null/undefined` → usuwa atrybut
- inne wartości → ustawia jako string

#### `[style.X]` - Style Binding

```html
<div [style.color]="textColor" [style.fontSize]="size + 'px'"></div>
```

- Obsługuje camelCase (`fontSize`) i kebab-case (`font-size`)
- `false/null/undefined` → usuwa właściwość stylu

#### `[class.X]` - Class Binding

```html
<div [class.active]="isActive" [class.hidden]="!isVisible"></div>
```

- `true` → dodaje klasę
- `false` → usuwa klasę

### DOM Property Bindings

Dla zwykłych elementów HTML, bindingi ustawiają właściwości DOM:

```html
<div [innerHTML]="htmlContent"></div>
<input [value]="inputValue" />
```
