

export interface OnInit {
    ngOnInit(): void;
}

export interface OnDestroy {
    ngOnDestroy(): void;
}

export interface AfterViewInit {
    ngAfterViewInit(): void;
}

export interface AfterViewChecked {
    ngAfterViewChecked(): void;
}

export interface AfterContentInit {
    ngAfterContentInit(): void;
}

export interface AfterContentChecked {
    ngAfterContentChecked(): void;
}

export interface SimpleChanges {
    [key: string]: {
        currentValue: any;
        previousValue: any;
        isFirstChange: boolean;
    };
}

export interface OnChanges {
    ngOnChanges(changes: SimpleChanges): void;
}

export interface DoCheck {
    ngDoCheck(): void;
}
