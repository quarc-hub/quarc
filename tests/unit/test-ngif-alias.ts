/**
 * Testy runtime dla @if z aliasem (condition; as variable)
 */

import { TemplateFragment } from '../../core/module/template-renderer';
import { Component } from '../../core/angular/component';
import { IComponent } from '../../core/module/component';

console.log('=== TESTY RUNTIME @IF Z ALIASEM ===\n');

let passedTests = 0;
let failedTests = 0;

function test(name: string, fn: () => boolean | Promise<boolean>): void {
    const result = fn();

    if (result instanceof Promise) {
        result.then(passed => {
            if (passed) {
                console.log(`✅ ${name}`);
                passedTests++;
            } else {
                console.log(`❌ ${name}`);
                failedTests++;
            }
        }).catch(e => {
            console.log(`❌ ${name} - Error: ${e}`);
            failedTests++;
        });
    } else {
        if (result) {
            console.log(`✅ ${name}`);
            passedTests++;
        } else {
            console.log(`❌ ${name}`);
            failedTests++;
        }
    }
}

@Component({
    selector: 'test-component',
    template: ''
})
class TestComponent implements IComponent {
    _nativeElement?: HTMLElement;

    device() {
        return { name: 'iPhone', model: 'iPhone 15' };
    }

    getUser() {
        return { name: 'Jan', email: 'jan@example.com' };
    }

    nullValue() {
        return null;
    }

    undefinedValue() {
        return undefined;
    }

    falseValue() {
        return false;
    }
}

test('Runtime: @if z aliasem - prosty przypadek', () => {
    const container = document.createElement('div');
    const component = new TestComponent();
    const template = '<ng-container *ngIf="device(); let dev"><span>{{ dev.name }}</span></ng-container>';

    const fragment = new TemplateFragment(container, component, template);
    fragment.render();

    const span = container.querySelector('span');
    return span !== null && span.getAttribute('[innerText]') === 'dev.name';
});

test('Runtime: @if z aliasem - wartość null nie renderuje', () => {
    const container = document.createElement('div');
    const component = new TestComponent();
    const template = '<ng-container *ngIf="nullValue(); let val"><span>Content</span></ng-container>';

    const fragment = new TemplateFragment(container, component, template);
    fragment.render();

    const span = container.querySelector('span');
    return span === null;
});

test('Runtime: @if z aliasem - wartość undefined nie renderuje', () => {
    const container = document.createElement('div');
    const component = new TestComponent();
    const template = '<ng-container *ngIf="undefinedValue(); let val"><span>Content</span></ng-container>';

    const fragment = new TemplateFragment(container, component, template);
    fragment.render();

    const span = container.querySelector('span');
    return span === null;
});

test('Runtime: @if z aliasem - wartość false nie renderuje', () => {
    const container = document.createElement('div');
    const component = new TestComponent();
    const template = '<ng-container *ngIf="falseValue(); let val"><span>Content</span></ng-container>';

    const fragment = new TemplateFragment(container, component, template);
    fragment.render();

    const span = container.querySelector('span');
    return span === null;
});

test('Runtime: @if z aliasem - zagnieżdżone elementy mają dostęp do aliasu', () => {
    const container = document.createElement('div');
    const component = new TestComponent();
    const template = '<ng-container *ngIf="getUser(); let user"><div><span>{{ user.name }}</span></div></ng-container>';

    const fragment = new TemplateFragment(container, component, template);
    fragment.render();

    const div = container.querySelector('div');
    const span = container.querySelector('span');
    return div !== null && span !== null && div.__quarcContext?.user !== undefined;
});

test('Runtime: @if bez aliasu - działa normalnie', () => {
    const container = document.createElement('div');
    const component = new TestComponent();
    const template = '<ng-container *ngIf="device()"><span>Content</span></ng-container>';

    const fragment = new TemplateFragment(container, component, template);
    fragment.render();

    const span = container.querySelector('span');
    return span !== null;
});

test('Runtime: parseNgIfExpression - parsuje warunek z aliasem', () => {
    const container = document.createElement('div');
    const component = new TestComponent();
    const fragment = new TemplateFragment(container, component, '');

    const result = (fragment as any).parseNgIfExpression('device(); let dev');
    return result.condition === 'device()' && result.aliasVariable === 'dev';
});

test('Runtime: parseNgIfExpression - parsuje warunek bez aliasu', () => {
    const container = document.createElement('div');
    const component = new TestComponent();
    const fragment = new TemplateFragment(container, component, '');

    const result = (fragment as any).parseNgIfExpression('device()');
    return result.condition === 'device()' && result.aliasVariable === undefined;
});

test('Runtime: parseNgIfExpression - obsługuje białe znaki', () => {
    const container = document.createElement('div');
    const component = new TestComponent();
    const fragment = new TemplateFragment(container, component, '');

    const result = (fragment as any).parseNgIfExpression('  device()  ;  let   dev  ');
    return result.condition === 'device()' && result.aliasVariable === 'dev';
});

test('Runtime: @if z aliasem - kontekst propagowany do dzieci', () => {
    const container = document.createElement('div');
    const component = new TestComponent();
    const template = '<ng-container *ngIf="getUser(); let user"><div><p><span>Test</span></p></div></ng-container>';

    const fragment = new TemplateFragment(container, component, template);
    fragment.render();

    const div = container.querySelector('div');
    const p = container.querySelector('p');
    const span = container.querySelector('span');

    return div?.__quarcContext?.user !== undefined &&
           p?.__quarcContext?.user !== undefined &&
           span?.__quarcContext?.user !== undefined;
});

setTimeout(() => {
    console.log('\n=== PODSUMOWANIE ===');
    console.log(`✅ Testy zaliczone: ${passedTests}`);
    console.log(`❌ Testy niezaliczone: ${failedTests}`);
    console.log(`📊 Procent sukcesu: ${((passedTests / (passedTests + failedTests)) * 100).toFixed(1)}%`);

    if (failedTests === 0) {
        console.log('\n🎉 Wszystkie testy przeszły pomyślnie!');
    } else {
        console.log('\n⚠️  Niektóre testy nie przeszły. Sprawdź implementację.');
    }
}, 100);
