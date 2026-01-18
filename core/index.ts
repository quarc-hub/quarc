// Core types and classes
export { Core } from "./core";
export type { Type, ComponentType, DirectiveType } from "./module/type";
export { Injector } from "./module/injector";

// Component system
export { IComponent, ViewEncapsulation } from "./module/component";

// Web Components
export { WebComponent } from "./module/web-component";
export { WebComponentFactory } from "./module/web-component-factory";
export { DirectiveRegistry } from "./module/directive-registry";
export { DirectiveRunner, DirectiveInstance } from "./module/directive-runner";
export { PipeRegistry } from "./module/pipe-registry";

// Decorators
export { Component, ComponentOptions } from "./angular/component";
export { Directive, DirectiveOptions, IDirective } from "./angular/directive";
export { Pipe, PipeOptions, PipeTransform } from "./angular/pipe";
export { Injectable, InjectableOptions } from "./angular/injectable";
export { Input, input, createInput, createRequiredInput } from "./angular/input";
export type { InputSignal, InputOptions } from "./angular/input";
export { Output, output, createOutput } from "./angular/output";
export type { OutputEmitterRef, OutputOptions } from "./angular/output";
export { HostBinding } from "./angular/host-binding";
export { HostListener } from "./angular/host-listener";
export { OnInit, OnDestroy } from "./angular/lifecycle";
export { ChangeDetectorRef } from "./angular/change-detector-ref";
export { signal, computed, effect } from "./angular/signals";
export type { Signal, WritableSignal, EffectRef, CreateSignalOptions, CreateEffectOptions } from "./angular/signals";
export { inject, setCurrentInjector } from "./angular/inject";

// types
export type { ApplicationConfig, EnvironmentProviders, PluginConfig, PluginRoutingMode, Provider } from "./angular/app-config";
export { ComponentUtils } from "./utils/component-utils";
export { TemplateFragment } from "./module/template-renderer";