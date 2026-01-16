export enum ViewEncapsulation {
    None,
    ShadowDom,
    Emulated,
}

export interface IComponent {
    _nativeElement?: HTMLElement;
}
