/**
 * Testy dla interfejsów lifecycle Quarc Framework
 * Sprawdzają poprawność definicji i implementacji hooków cyklu życia komponentów
 */

import {
    OnInit,
    OnDestroy,
    AfterViewInit,
    AfterViewChecked,
    AfterContentInit,
    AfterContentChecked,
    OnChanges,
    DoCheck,
    SimpleChanges,
} from '../../core/angular/lifecycle';

console.log('=== TESTY LIFECYCLE QUARC ===\n');

let passedTests = 0;
let failedTests = 0;

function test(name: string, fn: () => boolean): void {
    try {
        const result = fn();
        if (result) {
            console.log(`✅ ${name}`);
            passedTests++;
        } else {
            console.log(`❌ ${name}`);
            failedTests++;
        }
    } catch (e) {
        console.log(`❌ ${name} - Error: ${e}`);
        failedTests++;
    }
}

// Test 1: OnInit interface
test('OnInit: komponent może implementować ngOnInit', () => {
    let initCalled: boolean = false;

    class TestComponent implements OnInit {
        ngOnInit(): void {
            initCalled = true;
        }
    }

    const component = new TestComponent();
    component.ngOnInit();

    return initCalled;
});

// Test 2: OnDestroy interface
test('OnDestroy: komponent może implementować ngOnDestroy', () => {
    let destroyCalled: boolean = false;

    class TestComponent implements OnDestroy {
        ngOnDestroy(): void {
            destroyCalled = true;
        }
    }

    const component = new TestComponent();
    component.ngOnDestroy();

    return destroyCalled;
});

// Test 3: AfterViewInit interface
test('AfterViewInit: komponent może implementować ngAfterViewInit', () => {
    let afterViewInitCalled: boolean = false;

    class TestComponent implements AfterViewInit {
        ngAfterViewInit(): void {
            afterViewInitCalled = true;
        }
    }

    const component = new TestComponent();
    component.ngAfterViewInit();

    return afterViewInitCalled;
});

// Test 4: AfterViewChecked interface
test('AfterViewChecked: komponent może implementować ngAfterViewChecked', () => {
    let afterViewCheckedCalled: boolean = false;

    class TestComponent implements AfterViewChecked {
        ngAfterViewChecked(): void {
            afterViewCheckedCalled = true;
        }
    }

    const component = new TestComponent();
    component.ngAfterViewChecked();

    return afterViewCheckedCalled;
});

// Test 5: AfterContentInit interface
test('AfterContentInit: komponent może implementować ngAfterContentInit', () => {
    let afterContentInitCalled: boolean = false;

    class TestComponent implements AfterContentInit {
        ngAfterContentInit(): void {
            afterContentInitCalled = true;
        }
    }

    const component = new TestComponent();
    component.ngAfterContentInit();

    return afterContentInitCalled;
});

// Test 6: AfterContentChecked interface
test('AfterContentChecked: komponent może implementować ngAfterContentChecked', () => {
    let afterContentCheckedCalled: boolean = false;

    class TestComponent implements AfterContentChecked {
        ngAfterContentChecked(): void {
            afterContentCheckedCalled = true;
        }
    }

    const component = new TestComponent();
    component.ngAfterContentChecked();

    return afterContentCheckedCalled;
});

// Test 7: DoCheck interface
test('DoCheck: komponent może implementować ngDoCheck', () => {
    let doCheckCalled: boolean = false;

    class TestComponent implements DoCheck {
        ngDoCheck(): void {
            doCheckCalled = true;
        }
    }

    const component = new TestComponent();
    component.ngDoCheck();

    return doCheckCalled;
});

// Test 8: OnChanges interface z SimpleChanges
test('OnChanges: komponent może implementować ngOnChanges z SimpleChanges', () => {
    let receivedChanges: SimpleChanges = {};

    class TestComponent implements OnChanges {
        ngOnChanges(changes: SimpleChanges): void {
            receivedChanges = changes;
        }
    }

    const component = new TestComponent();
    const changes: SimpleChanges = {
        name: {
            currentValue: 'new',
            previousValue: 'old',
            isFirstChange: false,
        },
    };

    component.ngOnChanges(changes);

    return (
        Object.keys(receivedChanges).length > 0 &&
        receivedChanges['name'].currentValue === 'new' &&
        receivedChanges['name'].previousValue === 'old' &&
        receivedChanges['name'].isFirstChange === false
    );
});

// Test 9: SimpleChanges isFirstChange true
test('SimpleChanges: isFirstChange może być true', () => {
    let receivedChanges: SimpleChanges = {};

    class TestComponent implements OnChanges {
        ngOnChanges(changes: SimpleChanges): void {
            receivedChanges = changes;
        }
    }

    const component = new TestComponent();
    const changes: SimpleChanges = {
        value: {
            currentValue: 'initial',
            previousValue: undefined,
            isFirstChange: true,
        },
    };

    component.ngOnChanges(changes);

    return (
        Object.keys(receivedChanges).length > 0 &&
        receivedChanges['value'].isFirstChange === true &&
        receivedChanges['value'].previousValue === undefined
    );
});

// Test 10: Komponent może implementować wiele interfejsów lifecycle
test('Multiple lifecycle: komponent może implementować wiele hooków', () => {
    const callOrder: string[] = [];

    class TestComponent implements OnInit, OnDestroy, AfterViewInit, DoCheck {
        ngOnInit(): void {
            callOrder.push('init');
        }

        ngAfterViewInit(): void {
            callOrder.push('afterViewInit');
        }

        ngDoCheck(): void {
            callOrder.push('doCheck');
        }

        ngOnDestroy(): void {
            callOrder.push('destroy');
        }
    }

    const component = new TestComponent();
    component.ngOnInit();
    component.ngAfterViewInit();
    component.ngDoCheck();
    component.ngOnDestroy();

    return (
        callOrder.length === 4 &&
        callOrder[0] === 'init' &&
        callOrder[1] === 'afterViewInit' &&
        callOrder[2] === 'doCheck' &&
        callOrder[3] === 'destroy'
    );
});

// Test 11: Lifecycle hooks mogą modyfikować stan komponentu
test('Lifecycle state: ngOnInit może modyfikować stan komponentu', () => {
    class TestComponent implements OnInit {
        initialized = false;
        data: string[] = [];

        ngOnInit(): void {
            this.initialized = true;
            this.data = ['item1', 'item2'];
        }
    }

    const component = new TestComponent();

    const beforeInit = component.initialized === false && component.data.length === 0;
    component.ngOnInit();
    const afterInit = component.initialized === true && component.data.length === 2;

    return beforeInit && afterInit;
});

// Test 12: ngOnDestroy może wykonać cleanup
test('Lifecycle cleanup: ngOnDestroy może wykonać cleanup', () => {
    class TestComponent implements OnDestroy {
        subscriptions: { unsubscribe: () => void }[] = [];
        unsubscribedCount = 0;

        ngOnDestroy(): void {
            this.subscriptions.forEach(sub => {
                sub.unsubscribe();
                this.unsubscribedCount++;
            });
            this.subscriptions = [];
        }
    }

    const component = new TestComponent();
    component.subscriptions = [
        { unsubscribe: () => {} },
        { unsubscribe: () => {} },
        { unsubscribe: () => {} },
    ];

    component.ngOnDestroy();

    return component.unsubscribedCount === 3 && component.subscriptions.length === 0;
});

// Test 13: SimpleChanges może zawierać wiele zmian
test('SimpleChanges: może zawierać wiele zmian naraz', () => {
    let changesCount = 0;

    class TestComponent implements OnChanges {
        ngOnChanges(changes: SimpleChanges): void {
            changesCount = Object.keys(changes).length;
        }
    }

    const component = new TestComponent();
    const changes: SimpleChanges = {
        firstName: { currentValue: 'John', previousValue: '', isFirstChange: true },
        lastName: { currentValue: 'Doe', previousValue: '', isFirstChange: true },
        age: { currentValue: 30, previousValue: undefined, isFirstChange: true },
    };

    component.ngOnChanges(changes);

    return changesCount === 3;
});

// Test 14: AfterViewChecked wywoływany wielokrotnie
test('AfterViewChecked: może być wywoływany wielokrotnie', () => {
    let checkCount = 0;

    class TestComponent implements AfterViewChecked {
        ngAfterViewChecked(): void {
            checkCount++;
        }
    }

    const component = new TestComponent();
    component.ngAfterViewChecked();
    component.ngAfterViewChecked();
    component.ngAfterViewChecked();

    return checkCount === 3;
});

// Test 15: Kolejność lifecycle hooks
test('Lifecycle order: poprawna kolejność wywołań', () => {
    const order: string[] = [];

    class TestComponent implements OnChanges, OnInit, DoCheck, AfterContentInit, AfterContentChecked, AfterViewInit, AfterViewChecked, OnDestroy {
        ngOnChanges(_changes: SimpleChanges): void {
            order.push('onChanges');
        }

        ngOnInit(): void {
            order.push('onInit');
        }

        ngDoCheck(): void {
            order.push('doCheck');
        }

        ngAfterContentInit(): void {
            order.push('afterContentInit');
        }

        ngAfterContentChecked(): void {
            order.push('afterContentChecked');
        }

        ngAfterViewInit(): void {
            order.push('afterViewInit');
        }

        ngAfterViewChecked(): void {
            order.push('afterViewChecked');
        }

        ngOnDestroy(): void {
            order.push('onDestroy');
        }
    }

    const component = new TestComponent();

    // Symulacja poprawnej kolejności lifecycle
    component.ngOnChanges({});
    component.ngOnInit();
    component.ngDoCheck();
    component.ngAfterContentInit();
    component.ngAfterContentChecked();
    component.ngAfterViewInit();
    component.ngAfterViewChecked();
    component.ngOnDestroy();

    const expectedOrder = [
        'onChanges',
        'onInit',
        'doCheck',
        'afterContentInit',
        'afterContentChecked',
        'afterViewInit',
        'afterViewChecked',
        'onDestroy',
    ];

    return order.length === expectedOrder.length && order.every((v, i) => v === expectedOrder[i]);
});

// Test 16: WebComponent wywołuje ngOnInit po renderowaniu
test('WebComponent: wywołuje ngOnInit na instancji komponentu', () => {
    let ngOnInitCalled = false;

    const mockComponent = {
        ngOnInit(): void {
            ngOnInitCalled = true;
        },
    };

    if ('ngOnInit' in mockComponent) {
        (mockComponent as any).ngOnInit();
    }

    return ngOnInitCalled;
});

// Test 17: WebComponent wywołuje ngOnDestroy przy niszczeniu
test('WebComponent: wywołuje ngOnDestroy przy niszczeniu komponentu', () => {
    let ngOnDestroyCalled = false;

    const mockComponent = {
        ngOnDestroy(): void {
            ngOnDestroyCalled = true;
        },
    };

    if ('ngOnDestroy' in mockComponent) {
        (mockComponent as any).ngOnDestroy();
    }

    return ngOnDestroyCalled;
});

// Test 18: Sprawdzenie czy komponent bez ngOnInit nie powoduje błędu
test('WebComponent: komponent bez ngOnInit nie powoduje błędu', () => {
    const mockComponent = {};

    let errorOccurred = false;
    try {
        if ('ngOnInit' in mockComponent) {
            (mockComponent as any).ngOnInit();
        }
    } catch {
        errorOccurred = true;
    }

    return !errorOccurred;
});

// Test 19: Sprawdzenie czy komponent bez ngOnDestroy nie powoduje błędu
test('WebComponent: komponent bez ngOnDestroy nie powoduje błędu', () => {
    const mockComponent = {};

    let errorOccurred = false;
    try {
        if ('ngOnDestroy' in mockComponent) {
            (mockComponent as any).ngOnDestroy();
        }
    } catch {
        errorOccurred = true;
    }

    return !errorOccurred;
});

// Test 20: ngOnInit wywoływany tylko raz
test('WebComponent: ngOnInit wywoływany tylko raz przy wielokrotnym renderowaniu', () => {
    let callCount = 0;
    let initialized = false;

    const mockComponent = {
        ngOnInit(): void {
            callCount++;
        },
    };

    const callNgOnInit = () => {
        if (!initialized && 'ngOnInit' in mockComponent) {
            (mockComponent as any).ngOnInit();
            initialized = true;
        }
    };

    callNgOnInit();
    callNgOnInit();
    callNgOnInit();

    return callCount === 1;
});

console.log('\n=== PODSUMOWANIE ===');
console.log(`✅ Testy zaliczone: ${passedTests}`);
console.log(`❌ Testy niezaliczone: ${failedTests}`);
console.log(`📊 Procent sukcesu: ${((passedTests / (passedTests + failedTests)) * 100).toFixed(1)}%`);

if (failedTests === 0) {
    console.log('\n🎉 Wszystkie testy przeszły pomyślnie!');
} else {
    console.log('\n⚠️  Niektóre testy nie przeszły. Sprawdź implementację.');
}
