# Automatic Component Dependency Registration

## Overview

The framework now automatically registers all component dependencies before rendering. When you bootstrap or create a component, all components listed in its `imports` array are recursively registered as native Web Components.

## How It Works

### Registration Flow

```typescript
@Component({
    selector: 'app-root',
    template: '<dashboard></dashboard>',
    imports: [DashboardComponent],
})
export class AppComponent {}

// When bootstrapping:
Core.bootstrap(AppComponent);
```

**Internal Process:**

1. `Core.bootstrap(AppComponent)` is called
2. `WebComponentFactory.createFromElement()` is invoked
3. `registerWithDependencies(appComponentInstance)` is called
4. Framework checks `imports: [DashboardComponent]`
5. Creates `DashboardComponent` instance via Injector
6. Recursively calls `registerWithDependencies(dashboardComponentInstance)`
7. Registers `DashboardComponent` as `<dashboard>` custom element
8. Registers `AppComponent` as `<app-root>` custom element
9. Renders the template with all dependencies ready

### Code Implementation

```typescript
// In WebComponentFactory
static registerWithDependencies(component: IComponent): boolean {
    const imports = component._quarcComponent[0].imports || [];
    const injector = Injector.get();

    // Register all imported components first
    for (const importItem of imports) {
        if (this.isComponentType(importItem)) {
            let componentInstance = injector.createInstance<IComponent>(
                importItem as Type<IComponent>
            );

            if (!componentInstance._quarcComponent) {
                componentInstance = importItem as unknown as IComponent;
            }

            if (componentInstance._quarcComponent) {
                // Recursive call for nested dependencies
                this.registerWithDependencies(componentInstance);
            }
        }
    }

    // Finally register the parent component
    return this.tryRegister(component);
}
```

## Example: Multi-Level Dependencies

```typescript
// Level 3: Icon Component (no dependencies)
@Component({
    selector: 'app-icon',
    template: '<svg><path d="..."/></svg>',
})
export class IconComponent {}

// Level 2: Button Component (depends on Icon)
@Component({
    selector: 'app-button',
    template: `
        <button>
            <app-icon></app-icon>
            <span>Click Me</span>
        </button>
    `,
    imports: [IconComponent],
})
export class ButtonComponent {}

// Level 1: Dashboard Component (depends on Button)
@Component({
    selector: 'dashboard',
    template: `
        <div class="dashboard">
            <h1>Dashboard</h1>
            <app-button></app-button>
        </div>
    `,
    imports: [ButtonComponent],
})
export class DashboardComponent {}

// Level 0: Root Component (depends on Dashboard)
@Component({
    selector: 'app-root',
    template: '<dashboard></dashboard>',
    imports: [DashboardComponent],
})
export class AppComponent {}
```

**Registration Order:**
1. `IconComponent` → `<app-icon>`
2. `ButtonComponent` → `<app-button>`
3. `DashboardComponent` → `<dashboard>`
4. `AppComponent` → `<app-root>`

## Benefits

### ✅ No Manual Registration

Before:
```typescript
// Manual registration required
WebComponentFactory.tryRegister(iconComponent);
WebComponentFactory.tryRegister(buttonComponent);
WebComponentFactory.tryRegister(dashboardComponent);
Core.bootstrap(AppComponent);
```

After:
```typescript
// Automatic registration
Core.bootstrap(AppComponent); // All dependencies registered automatically
```

### ✅ Correct Order Guaranteed

The framework ensures components are registered in the correct dependency order, preventing errors where a parent tries to use an unregistered child component.

### ✅ Prevents Duplicate Registration

The `tryRegister()` method checks if a component is already registered and returns `false` if it is, preventing duplicate registration errors.

### ✅ Supports Circular Dependencies

If two components import each other (not recommended but possible), the registration system handles it gracefully by checking if a component is already registered before attempting to register it again.

### ✅ Works with Lazy Loading

Components are only registered when they're actually needed, supporting lazy loading patterns:

```typescript
// Only registers when loaded
const lazyComponent = await import('./lazy.component');
WebComponentFactory.create(lazyComponent.LazyComponent);
```

## Type Checking

The `isComponentType()` helper ensures only valid components are processed:

```typescript
private static isComponentType(item: any): boolean {
    // Check if it's a class constructor
    if (typeof item === 'function') {
        return true;
    }
    // Check if it's already an instance with metadata
    if (item && typeof item === 'object' && item._quarcComponent) {
        return true;
    }
    return false;
}
```

## Integration with Injector

The framework uses the `Injector` to create component instances, which:
- Resolves constructor dependencies
- Caches instances for reuse
- Supports dependency injection patterns

```typescript
const injector = Injector.get();
let componentInstance = injector.createInstance<IComponent>(
    importItem as Type<IComponent>
);
```

## Error Handling

Registration errors are caught and logged without breaking the application:

```typescript
try {
    customElements.define(tagName, WebComponentClass);
    this.registeredComponents.set(tagName, WebComponentClass);
    this.componentInstances.set(tagName, component);
    return true;
} catch (error) {
    console.warn(`Failed to register component ${tagName}:`, error);
    return false;
}
```

Common errors:
- **Duplicate registration**: Component already registered (handled gracefully)
- **Invalid tag name**: Tag name doesn't contain a hyphen (auto-converted)
- **Constructor errors**: Component constructor throws an error (logged)

## Best Practices

### 1. Always Declare Imports

```typescript
@Component({
    selector: 'parent',
    template: '<child></child>',
    imports: [ChildComponent], // ✅ Declared
})
export class ParentComponent {}
```

### 2. Avoid Circular Dependencies

```typescript
// ❌ Avoid this
@Component({
    selector: 'comp-a',
    imports: [ComponentB],
})
export class ComponentA {}

@Component({
    selector: 'comp-b',
    imports: [ComponentA], // Circular!
})
export class ComponentB {}
```

### 3. Use Lazy Loading for Large Dependencies

```typescript
@Component({
    selector: 'app-root',
    template: '<router-outlet></router-outlet>',
    // Don't import heavy components here
})
export class AppComponent {
    async loadHeavyComponent() {
        const { HeavyComponent } = await import('./heavy.component');
        WebComponentFactory.create(HeavyComponent);
    }
}
```

## Debugging

Enable console logging to see the registration flow:

```typescript
// In WebComponentFactory.registerWithDependencies
console.log(`Registering dependencies for: ${component._quarcComponent[0].selector}`);

// In WebComponentFactory.tryRegister
console.log(`Registering component: ${tagName}`);
```

## Migration from Manual Registration

If you have existing code with manual registration:

**Before:**
```typescript
WebComponentFactory.tryRegister(childComponent);
WebComponentFactory.tryRegister(parentComponent);
```

**After:**
```typescript
// Just use the parent, children are registered automatically
WebComponentFactory.create(parentComponent);
```

Or simply:
```typescript
Core.bootstrap(ParentComponent);
```

## Summary

The automatic dependency registration system:
- ✅ Registers components in correct order
- ✅ Handles nested dependencies recursively
- ✅ Prevents duplicate registrations
- ✅ Integrates with dependency injection
- ✅ Provides error handling and logging
- ✅ Supports lazy loading patterns
- ✅ Simplifies component usage

No manual registration needed - just declare your imports and bootstrap your app!
