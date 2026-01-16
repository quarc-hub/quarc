# Przykład Użycia Template Helpers

## Przykład 1: Podstawowe Parsowanie

```typescript
import { TemplateParser } from './template-parser';

const parser = new TemplateParser();
const template = `
<div class="container">
    <h1 [title]="pageTitle">{{ title }}</h1>
    <button (click)="save()">Save</button>
</div>
`;

const elements = parser.parse(template);
console.log(elements);
// Output: Drzewo elementów z wyodrębnionymi atrybutami i text nodes
```

## Przykład 1b: Parsowanie z Text Nodes

```typescript
import { TemplateParser } from './template-parser';

const parser = new TemplateParser();
const template = `
    Some text before
    <div>Inside div</div>
    Some text after
`;

const elements = parser.parse(template);

for (const node of elements) {
    if ('type' in node && node.type === 'text') {
        console.log('Text node:', node.content.trim());
    } else {
        console.log('Element:', node.tagName);
    }
}

// Output:
// Text node: Some text before
// Element: div
// Text node: Some text after
```

## Przykład 2: Przetwarzanie Atrybutów

```typescript
import { TemplateParser } from './template-parser';
import { InputBindingHelper } from './input-binding-helper';

const parser = new TemplateParser();
const inputHelper = new InputBindingHelper();

const template = '<div [title]="myTitle">Content</div>';
const elements = parser.parse(template);

parser.traverseElements(elements, (element) => {
    for (const attr of element.attributes) {
        if (inputHelper.canHandle(attr)) {
            const result = inputHelper.process({
                element,
                attribute: attr,
                filePath: 'example.component.html',
            });

            console.log('Processed:', result);
        }
    }
});
```

## Przykład 3: Transformacja Control Flow

Wejście:
```html
@if (isLoggedIn) {
    <p>Welcome back!</p>
} @else if (isGuest) {
    <p>Welcome guest!</p>
} @else {
    <p>Please log in</p>
}
```

Wyjście po transformacji:
```html
<ng-container *ngIf="isLoggedIn">
    <p>Welcome back!</p>
</ng-container>
<ng-container *ngIf="!(isLoggedIn) && isGuest">
    <p>Welcome guest!</p>
</ng-container>
<ng-container *ngIf="!(isLoggedIn) && !(isGuest)">
    <p>Please log in</p>
</ng-container>
```

## Przykład 4: Kompletny Szablon

Wejście:
```html
<div class="user-profile">
    <h1 [title]="user.fullName">{{ user.name }}</h1>

    @if (user.isAdmin) {
        <span class="badge">Admin</span>
    }

    <form>
        <input [(ngModel)]="user.email" #emailInput type="email" />
        <button (click)="saveUser()">Save</button>
    </form>

    <ul *ngFor="let post of user.posts">
        <li [class.active]="post.isActive">{{ post.title }}</li>
    </ul>
</div>
```

Po przetworzeniu przez TemplateProcessor:
```html
<div class="user-profile">
    <h1 [title]="user.fullName">{{ user.name }}</h1>

    <ng-container *ngIf="user.isAdmin">
        <span class="badge">Admin</span>
    </ng-container>

    <form>
        <input [(ngModel)]="user.email" #emailInput type="email" />
        <button (click)="saveUser()">Save</button>
    </form>

    <ul *ngFor="let post of user.posts">
        <li [class.active]="post.isActive">{{ post.title }}</li>
    </ul>
</div>
```

## Przykład 5: Własny Helper

```typescript
import { BaseAttributeHelper, AttributeProcessingContext, AttributeProcessingResult } from './base-attribute-helper';
import { AttributeType, ParsedAttribute } from './template-parser';

export class DataAttributeHelper extends BaseAttributeHelper {
    get supportedType(): string {
        return 'data-attribute';
    }

    canHandle(attribute: ParsedAttribute): boolean {
        return attribute.name.startsWith('data-');
    }

    process(context: AttributeProcessingContext): AttributeProcessingResult {
        // Konwersja data-* atrybutów na format Angular
        const dataName = context.attribute.name.replace('data-', '');

        return {
            transformed: true,
            newAttribute: {
                name: `[attr.data-${dataName}]`,
                value: context.attribute.value,
                type: AttributeType.INPUT_BINDING,
            },
        };
    }
}

// Użycie w TemplateProcessor:
// this.attributeHelpers.push(new DataAttributeHelper());
```

## Przykład 6: Debugowanie

```typescript
import { TemplateParser } from './template-parser';

const parser = new TemplateParser();
const template = '<div [title]="value" (click)="handler()">Text</div>';

const elements = parser.parse(template);

parser.traverseElements(elements, (element) => {
    console.log(`Element: ${element.tagName}`);
    console.log(`Attributes count: ${element.attributes.length}`);

    element.attributes.forEach(attr => {
        console.log(`  ${attr.name} [${attr.type}] = "${attr.value}"`);
    });

    if (element.textContent) {
        console.log(`  Text: ${element.textContent}`);
    }
});

// Output:
// Element: div
// Attributes count: 2
//   [title] [input] = "value"
//   (click) [output] = "handler()"
//   Text: Text
```

## Przykład 7: Wykrywanie Wszystkich Typów Atrybutów

```typescript
import { TemplateParser, AttributeType } from './template-parser';

const parser = new TemplateParser();
const template = `
<div class="container"
     *ngIf="show"
     [title]="tooltip"
     (click)="onClick()"
     [(ngModel)]="value"
     #myDiv>
    Content
</div>
`;

const elements = parser.parse(template);
const attributeTypes = new Map<AttributeType, number>();

parser.traverseElements(elements, (element) => {
    element.attributes.forEach(attr => {
        const count = attributeTypes.get(attr.type) || 0;
        attributeTypes.set(attr.type, count + 1);
    });
});

console.log('Attribute type statistics:');
attributeTypes.forEach((count, type) => {
    console.log(`  ${type}: ${count}`);
});

// Output:
// Attribute type statistics:
//   regular: 1
//   structural: 1
//   input: 1
//   output: 1
//   two-way: 1
//   reference: 1
```
