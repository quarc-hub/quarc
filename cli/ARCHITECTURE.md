# Architektura CLI

## Przegląd

System CLI składa się z dwóch głównych komponentów:
- **Processors** - Transformują kod źródłowy (template, style, DI)
- **Helpers** - Przetwarzają szczegółowe aspekty szablonów (atrybuty Angular)

## Diagram Architektury

```
┌─────────────────────────────────────────────────────────────┐
│                         Build Process                        │
└─────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────┐
│                      Lite Transformer                        │
│  ┌────────────────────────────────────────────────────────┐ │
│  │              Processor Pipeline                        │ │
│  │                                                        │ │
│  │  1. ClassDecoratorProcessor                           │ │
│  │     └─ Process class decorators                      │ │
│  │                                                        │ │
│  │  2. SignalTransformerProcessor                        │ │
│  │     ├─ Transform signal calls (input, output, etc.)  │ │
│  │     ├─ Add 'this' as first argument                  │ │
│  │     └─ Ensure _nativeElement in constructor          │ │
│  │                                                        │ │
│  │  3. TemplateProcessor                                 │ │
│  │     ├─ Read template file                            │ │
│  │     ├─ Transform control flow (@if → *ngIf)          │ │
│  │     ├─ Parse HTML (TemplateParser)                   │ │
│  │     ├─ Process attributes (AttributeHelpers)         │ │
│  │     ├─ Reconstruct HTML                              │ │
│  │     └─ Escape template string                        │ │
│  │                                                        │ │
│  │  4. StyleProcessor                                    │ │
│  │     ├─ Read style files                              │ │
│  │     └─ Inline styles                                 │ │
│  │                                                        │ │
│  │  5. DIProcessor                                       │ │
│  │     └─ Add __di_params__ metadata                    │ │
│  └────────────────────────────────────────────────────────┘ │
└─────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────┐
│                    Transformed Source                        │
└─────────────────────────────────────────────────────────────┘
```

## Szczegółowy Przepływ TemplateProcessor

```
Template File (HTML)
        │
        ▼
┌──────────────────────┐
│ transformControlFlow │  @if/@else → *ngIf
└──────────────────────┘
        │
        ▼
┌──────────────────────┐
│   TemplateParser     │  HTML → Element Tree
└──────────────────────┘
        │
        ▼
┌──────────────────────────────────────────────────────┐
│            Attribute Processing Loop                 │
│                                                      │
│  For each element:                                   │
│    For each attribute:                               │
│      ┌────────────────────────────────────────────┐ │
│      │  Find matching AttributeHelper             │ │
│      │                                             │ │
│      │  • StructuralDirectiveHelper (*ngIf)       │ │
│      │  • InputBindingHelper ([property])         │ │
│      │  • OutputBindingHelper ((event))           │ │
│      │  • TwoWayBindingHelper ([(model)])         │ │
│      │  • TemplateReferenceHelper (#ref)          │ │
│      └────────────────────────────────────────────┘ │
│                                                      │
│      Process attribute → Update element tree         │
└──────────────────────────────────────────────────────┘
        │
        ▼
┌──────────────────────┐
│ reconstructTemplate  │  Element Tree → HTML
└──────────────────────┘
        │
        ▼
┌──────────────────────┐
│ escapeTemplateString │  Escape \, `, $
└──────────────────────┘
        │
        ▼
  Inline Template String
```

## Hierarchia Klas

### Processors

```
BaseProcessor (abstract)
├── ClassDecoratorProcessor
├── SignalTransformerProcessor
├── TemplateProcessor
│   ├── parser: TemplateParser
│   └── attributeHelpers: BaseAttributeHelper[]
├── StyleProcessor
└── DIProcessor
```

### Helpers

```
BaseAttributeHelper (abstract)
├── StructuralDirectiveHelper
│   └── Handles: *ngIf, *ngFor, *ngSwitch
├── InputBindingHelper
│   └── Handles: [property]
├── OutputBindingHelper
│   └── Handles: (event)
├── TwoWayBindingHelper
│   └── Handles: [(model)]
└── TemplateReferenceHelper
    └── Handles: #ref
```

## Interfejsy Danych

### ProcessorContext
```typescript
{
    filePath: string;      // Ścieżka do pliku źródłowego
    fileDir: string;       // Katalog pliku
    source: string;        // Zawartość pliku
}
```

### ParsedElement
```typescript
{
    tagName: string;                           // Nazwa tagu HTML
    attributes: ParsedAttribute[];             // Lista atrybutów
    children: (ParsedElement | ParsedTextNode)[]; // Elementy potomne i text nodes
    textContent?: string;                      // Zawartość tekstowa (legacy)
}
```

### ParsedTextNode
```typescript
{
    type: 'text';      // Identyfikator typu
    content: string;   // Zawartość tekstowa z białymi znakami
}
```

### ParsedAttribute
```typescript
{
    name: string;          // Nazwa atrybutu
    value: string;         // Wartość atrybutu
    type: AttributeType;   // Typ atrybutu
}
```

### AttributeType (enum)
```typescript
STRUCTURAL_DIRECTIVE  // *ngIf, *ngFor
INPUT_BINDING        // [property]
OUTPUT_BINDING       // (event)
TWO_WAY_BINDING      // [(model)]
TEMPLATE_REFERENCE   // #ref
REGULAR              // class, id, etc.
```

## Rozszerzalność

### Dodawanie Nowego Processora

```typescript
export class CustomProcessor extends BaseProcessor {
    get name(): string {
        return 'custom-processor';
    }

    async process(context: ProcessorContext): Promise<ProcessorResult> {
        // Implementacja transformacji
        return { source: context.source, modified: false };
    }
}
```

### Dodawanie Nowego Helpera

```typescript
export class CustomAttributeHelper extends BaseAttributeHelper {
    get supportedType(): string {
        return 'custom';
    }

    canHandle(attribute: ParsedAttribute): boolean {
        // Logika wykrywania
        return attribute.name.startsWith('custom-');
    }

    process(context: AttributeProcessingContext): AttributeProcessingResult {
        // Logika przetwarzania
        return { transformed: true };
    }
}
```

## Wzorce Projektowe

### Strategy Pattern
- **BaseAttributeHelper** - Interfejs strategii
- **Concrete Helpers** - Konkretne strategie dla różnych typów atrybutów
- **TemplateProcessor** - Kontekst używający strategii

### Visitor Pattern
- **TemplateParser.traverseElements()** - Odwiedzanie elementów drzewa
- **Callback function** - Visitor wykonujący operacje na elementach

### Pipeline Pattern
- **Processor chain** - Sekwencyjne przetwarzanie przez kolejne procesory
- Każdy processor otrzymuje wynik poprzedniego

### Factory Pattern
- **Constructor TemplateProcessor** - Tworzy instancje wszystkich helperów
- Centralizacja tworzenia zależności

## Wydajność

### Optymalizacje
1. **Single-pass parsing** - Jeden przebieg przez szablon
2. **Lazy evaluation** - Przetwarzanie tylko zmodyfikowanych plików
3. **Reverse iteration** - Unikanie problemów z offsetami przy zamianie

### Złożoność
- **Parsing**: O(n) gdzie n = długość szablonu
- **Attribute processing**: O(m × h) gdzie m = liczba atrybutów, h = liczba helperów
- **Reconstruction**: O(e + t) gdzie e = liczba elementów, t = liczba text nodes

### Obsługa Text Nodes
Parser automatycznie wykrywa i zachowuje text nodes jako osobne węzły:
- Text nodes mogą występować na poziomie root lub jako dzieci elementów
- Zachowują wszystkie białe znaki (spacje, nowe linie, tabulatory)
- Są pomijane przez `traverseElements()` (tylko elementy HTML)
- Są prawidłowo rekonstruowane podczas budowania HTML
- Używają type guard `isTextNode()` do rozróżnienia od elementów

## Testowanie

### Unit Tests
```typescript
// Test parsera
const parser = new TemplateParser();
const result = parser.parse('<div [title]="value"></div>');
expect(result[0].attributes[0].type).toBe(AttributeType.INPUT_BINDING);

// Test helpera
const helper = new InputBindingHelper();
expect(helper.canHandle({ name: '[title]', value: 'x', type: AttributeType.INPUT_BINDING })).toBe(true);
```

### Integration Tests
```typescript
// Test całego procesora
const processor = new TemplateProcessor();
const result = await processor.process({
    filePath: '/test/component.ts',
    fileDir: '/test',
    source: 'templateUrl = "./template.html"'
});
expect(result.modified).toBe(true);
```

## Dokumentacja

- **[processors/README.md](./processors/README.md)** - Dokumentacja procesorów
- **[helpers/README.md](./helpers/README.md)** - Dokumentacja helperów
- **[helpers/example.md](./helpers/example.md)** - Przykłady użycia
