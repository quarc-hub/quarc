# Native Web Components Implementation

This framework now uses **native browser Web Components API** with custom elements registration.

## Key Features

- ✅ Uses `customElements.define()` for component registration
- ✅ Components extend native `HTMLElement`
- ✅ Automatic lifecycle management with `connectedCallback` and `disconnectedCallback`
- ✅ Safe registration with `tryRegister()` method that prevents duplicate registration errors
- ✅ Support for Shadow DOM, Emulated, and None encapsulation modes

## How It Works

### 1. Component Definition

Components are defined using the `@Component` decorator, just like before:

```typescript
import { Component } from '@quarc/core';

@Component({
    selector: 'app-root',
    templateUrl: './app.component.html',
    styleUrl: './app.component.scss',
})
export class AppComponent {
    constructor() {
        // Your component logic
    }
}
```

### 2. Native Custom Element Registration

The `WebComponentFactory.tryRegister()` method:

- Converts the selector (e.g., `'app-root'`) to a valid custom element tag name (e.g., `'app-root'`)
- Creates a custom element class that extends `HTMLElement`
- Registers it using `customElements.define()`
- Returns `true` if registration succeeds, `false` if already registered
- Catches and logs any registration errors

```typescript
const success = WebComponentFactory.tryRegister(componentInstance);
// Returns false if already registered, preventing errors
```

### 3. Component Instantiation

Components can be created in three ways:

#### a) Auto-create and append to body
```typescript
const webComponent = WebComponentFactory.create(componentInstance);
```

#### b) Create inside a parent element
```typescript
const parent = document.getElementById('container');
const webComponent = WebComponentFactory.createInElement(componentInstance, parent);
```

#### c) Replace an existing element
```typescript
const existingElement = document.querySelector('.my-element');
const webComponent = WebComponentFactory.createFromElement(componentInstance, existingElement);
```

### 4. Native Custom Elements in HTML

Once registered, components can be used directly in HTML:

```html
<!DOCTYPE html>
<html>
<body>
    <!-- Native custom element - automatically recognized by browser -->
    <app-root></app-root>

    <script src="main.js"></script>
</body>
</html>
```

## API Reference

### WebComponentFactory

#### `registerWithDependencies(component: IComponent): boolean`

Recursively registers a component and all its imported dependencies as native custom elements. This ensures that all child components are registered before the parent component renders.

```typescript
@Component({
    selector: 'parent-component',
    template: '<child-component></child-component>',
    imports: [ChildComponent], // Automatically registered before parent
})
export class ParentComponent {}

// All imports are registered recursively
WebComponentFactory.registerWithDependencies(parentComponentInstance);
```

**How it works:**
1. Iterates through the `imports` array in component metadata
2. Creates instances of imported components using the Injector
3. Recursively calls `registerWithDependencies` on each imported component
4. Finally registers the parent component

This method is automatically called by `create()`, `createInElement()`, and `createFromElement()`.

#### `tryRegister(component: IComponent): boolean`

Safely registers a single component as a native custom element without checking dependencies. Returns `false` if already registered.

```typescript
const isNewRegistration = WebComponentFactory.tryRegister(myComponent);
```

**Note:** Use `registerWithDependencies()` instead if your component has imports.

#### `create(component: IComponent, selector?: string): WebComponent`

Creates and returns a web component instance. If no element with the selector exists, creates one and appends to body.

#### `createInElement(component: IComponent, parent: HTMLElement): WebComponent`

Creates a web component and appends it to the specified parent element.

#### `createFromElement(component: IComponent, element: HTMLElement): WebComponent`

Converts an existing HTML element to a web component or replaces it with the component's custom element.

#### `isRegistered(selector: string): boolean`

Checks if a component with the given selector is already registered.

#### `getRegisteredTagName(selector: string): string | undefined`

Returns the registered tag name for a selector, or `undefined` if not registered.

## WebComponent Class

The `WebComponent` class now extends `HTMLElement` and implements:

### Lifecycle Callbacks

- `connectedCallback()` - Called when element is added to DOM (protected against multiple initialization)
- `disconnectedCallback()` - Called when element is removed from DOM

**Note:** The component uses an internal `_initialized` flag to prevent multiple renderings. Even if `initialize()` is called multiple times (e.g., from both `setComponentInstance()` and `connectedCallback()`), the component will only render once.

### Methods

- `setComponentInstance(component: IComponent, componentType: ComponentType<IComponent>)` - Sets the component instance and component type, then initializes
- `getComponentOptions()` - Returns the component options from the static `_quarcComponent` property
- `renderComponent()` - Renders the component template and styles
- `getHostElement()` - Returns the element itself (since it IS the host)
- `getShadowRoot()` - Returns the shadow root if using Shadow DOM encapsulation
- `getAttributes()` - Returns all attributes as an array
- `getChildElements()` - Returns all child elements with metadata
- `querySelector(selector)` - Queries within the component's render target
- `querySelectorAll(selector)` - Queries all matching elements
- `destroy()` - Removes all child nodes

## Component Dependencies & Import Registration

The framework automatically handles component dependencies through the `imports` property. When a component is registered, all its imported components are recursively registered first.

### Example: Parent-Child Components

```typescript
// Child component
@Component({
    selector: 'user-card',
    template: '<div class="card">User Info</div>',
    style: '.card { border: 1px solid #ccc; }',
})
export class UserCardComponent {}

// Parent component
@Component({
    selector: 'user-list',
    template: `
        <div>
            <user-card></user-card>
            <user-card></user-card>
        </div>
    `,
    imports: [UserCardComponent], // Child component will be registered first
})
export class UserListComponent {}

// Bootstrap
Core.bootstrap(UserListComponent);
```

### Registration Flow

1. **UserListComponent** is bootstrapped
2. `registerWithDependencies()` is called
3. Framework finds `UserCardComponent` in imports
4. **UserCardComponent** is registered as `<user-card>` custom element
5. **UserListComponent** is registered as `<user-list>` custom element
6. Template renders with `<user-card>` elements working natively

### Nested Dependencies

Dependencies can be nested multiple levels deep:

```typescript
@Component({
    selector: 'icon',
    template: '<svg>...</svg>',
})
export class IconComponent {}

@Component({
    selector: 'button',
    template: '<button><icon></icon> Click</button>',
    imports: [IconComponent],
})
export class ButtonComponent {}

@Component({
    selector: 'form',
    template: '<form><button></button></form>',
    imports: [ButtonComponent], // IconComponent is also registered automatically
})
export class FormComponent {}
```

**Registration order:** `IconComponent` → `ButtonComponent` → `FormComponent`

### Benefits

✅ **Automatic dependency resolution** - No manual registration needed
✅ **Prevents registration errors** - Components registered in correct order
✅ **Supports deep nesting** - Recursive registration handles any depth
✅ **Lazy loading ready** - Only registers components that are actually used
✅ **Type-safe** - TypeScript ensures imports are valid component types

## Encapsulation Modes

### ViewEncapsulation.ShadowDom

Uses native Shadow DOM for true style encapsulation:

```typescript
@Component({
    selector: 'my-component',
    template: '<div>Content</div>',
    style: 'div { color: red; }',
    encapsulation: ViewEncapsulation.ShadowDom,
})
```

### ViewEncapsulation.Emulated

Angular-style scoped attributes (`_nghost-*`, `_ngcontent-*`):

```typescript
@Component({
    selector: 'my-component',
    template: '<div>Content</div>',
    style: 'div { color: red; }',
    encapsulation: ViewEncapsulation.Emulated, // Default
})
```

### ViewEncapsulation.None

No encapsulation - styles are global:

```typescript
@Component({
    selector: 'my-component',
    template: '<div>Content</div>',
    style: 'div { color: red; }',
    encapsulation: ViewEncapsulation.None,
})
```

## Migration from Old System

The old system created wrapper `<div>` elements with `data-component` attributes. The new system:

1. ✅ Registers actual custom elements with the browser
2. ✅ Uses native lifecycle callbacks
3. ✅ Allows direct HTML usage without JavaScript
4. ✅ Better performance and browser integration
5. ✅ Proper custom element naming (must contain hyphen)

## Browser Compatibility

Native Web Components are supported in all modern browsers:
- Chrome 54+
- Firefox 63+
- Safari 10.1+
- Edge 79+

For older browsers, polyfills may be required.
