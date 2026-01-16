export type Subscription = {
    unsubscribe: () => void;
};

export type Observer<T> = (value: T) => void;

export class Subject<T> {
    private observers: Set<Observer<T>> = new Set();

    next(value: T): void {
        for (const observer of this.observers) {
            observer(value);
        }
    }

    subscribe(observer: Observer<T>): Subscription {
        this.observers.add(observer);
        return {
            unsubscribe: () => {
                this.observers.delete(observer);
            },
        };
    }

    complete(): void {
        this.observers.clear();
    }
}

export class BehaviorSubject<T> extends Subject<T> {
    constructor(private currentValue: T) {
        super();
    }

    override next(value: T): void {
        this.currentValue = value;
        super.next(value);
    }

    subscribe(observer: Observer<T>): Subscription {
        observer(this.currentValue);
        return super.subscribe(observer);
    }

    getValue(): T {
        return this.currentValue;
    }
}
