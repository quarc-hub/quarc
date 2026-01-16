# Lite Transformer Processors

This directory contains the processor architecture for the `lite-transformer` plugin.

## Architecture

The lite-transformer uses a modular processor-based architecture where each processor handles a specific transformation:

```
lite-transformer
├── BaseProcessor (abstract)
├── ClassDecoratorProcessor
├── SignalTransformerProcessor
├── TemplateProcessor
├── StyleProcessor
└── DIProcessor
```

## Processors

### BaseProcessor

Abstract base class that all processors must extend.

**Interface:**
```typescript
abstract class BaseProcessor {
    abstract get name(): string;
    abstract process(context: ProcessorContext): Promise<ProcessorResult>;
}
```

### TemplateProcessor

Transforms `templateUrl` properties to inline `template` properties and processes Angular attributes.

**Transformation:**
```typescript
// Before
templateUrl = './component.html'

// After
template = `<div>Component content</div>`
```

**Features:**
- Reads HTML file from disk
- Transforms Angular control flow syntax (`@if/@else` → `*ngIf`)
- Parses and processes Angular attributes using helper system
- Escapes template string characters
- Throws error if file not found

**Template Processing Pipeline:**
1. Read template file from disk
2. Transform control flow syntax
3. Parse HTML to element tree
4. Process attributes with specialized helpers
5. Reconstruct HTML from element tree
6. Escape template string characters

**Supported Attribute Types:**
- Structural directives: `*ngIf`, `*ngFor`, `*ngSwitch`
- Input bindings: `[property]`
- Output bindings: `(event)`
- Two-way bindings: `[(model)]`
- Template references: `#ref`

See [helpers/README.md](../helpers/README.md) for detailed information about the attribute helper system.

### StyleProcessor

Transforms `styleUrl` and `styleUrls` properties to inline `style` properties.

**Transformations:**
```typescript
// Single style file
styleUrl = './component.scss'
// → style = `:host { ... }`

// Multiple style files
styleUrls = ['./base.scss', './theme.scss']
// → style = `/* base.scss */\n/* theme.scss */`
```

**Features:**
- Handles both `styleUrl` (single) and `styleUrls` (array)
- Combines multiple style files with newline separator
- Escapes template string characters
- Throws error if any file not found

### DIProcessor

Adds dependency injection metadata to classes with constructor parameters.

**Transformation:**
```typescript
// Before
export class MyService {
    constructor(private http: HttpClient) {}
}

// After
export class MyService {
    static __di_params__ = [HttpClient];
    constructor(private http: HttpClient) {}
}
```

**Features:**
- Extracts constructor parameter types
- Adds static `__di_params__` property
- Skips classes without constructor parameters

### SignalTransformerProcessor

Transforms Angular-like signal function calls (`input`, `output`) to include property name and `this` as arguments, and ensures `_nativeElement: HTMLElement` is available in the constructor.

**Transformation:**
```typescript
// Before
export class MyComponent {
    public userName = input<string>();
    private clicked = output<void>();
    readonly count = input<number>(0);

    constructor(private service: SomeService) {}
}

// After
export class MyComponent {
    public userName = input<string>("userName", this);
    private clicked = output<void>("clicked", this);
    readonly count = input<number>("count", this, 0);

    constructor(public _nativeElement: HTMLElement, private service: SomeService) {}
}
```

**Features:**
- Extracts property name and adds it as first argument (string)
- Adds `this` as second argument for component context
- Handles generic type parameters (e.g., `input<string>()`)
- Preserves existing arguments after `this`
- Adds `public _nativeElement: HTMLElement` to constructor if not present
- Skips if `HTMLElement` or `_nativeElement` already exists in constructor
- Throws `SignalTransformerError` if property name cannot be determined

**Supported Functions:**
- `input` - Input signal binding (property name used for attribute binding)
- `output` - Output signal binding (property name used for event name)

**Error Handling:**
If the processor cannot determine the property name (e.g., signal used outside of property assignment), it throws a `SignalTransformerError` which stops the build with a clear error message.

## Usage

### Using the Default Transformer

```typescript
import { liteTransformer } from './lite-transformer';

// Uses all processors in default order
plugins: [liteTransformer()]
```

### Custom Processor Configuration

```typescript
import { liteTransformer } from './lite-transformer';
import { TemplateProcessor, StyleProcessor } from './processors';

// Use only specific processors
plugins: [
    liteTransformer([
        new TemplateProcessor(),
        new StyleProcessor()
    ])
]
```

### Creating Custom Processors

```typescript
import { BaseProcessor, ProcessorContext, ProcessorResult } from './processors';

export class CustomProcessor extends BaseProcessor {
    get name(): string {
        return 'custom-processor';
    }

    async process(context: ProcessorContext): Promise<ProcessorResult> {
        // Your transformation logic
        return {
            source: context.source,
            modified: false
        };
    }
}
```

## Processor Execution Order

Processors execute in the order they are registered:

1. **ClassDecoratorProcessor** - Processes class decorators
2. **SignalTransformerProcessor** - Transforms signal function calls
3. **TemplateProcessor** - Inlines HTML templates
4. **StyleProcessor** - Inlines CSS styles
5. **DIProcessor** - Adds DI metadata

Each processor receives the output of the previous processor, allowing for chained transformations.

## Error Handling

All processors throw errors for missing files:

```typescript
throw new Error(`Template file not found: ${fullPath} (referenced in ${context.filePath})`);
```

This ensures build-time validation of all referenced assets.
