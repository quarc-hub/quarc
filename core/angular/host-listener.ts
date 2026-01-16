export function HostListener(
  eventName: string,
  args?: string[]
): MethodDecorator {
  return (target: any, propertyKey: string | symbol, descriptor: PropertyDescriptor) => {
    return descriptor;
  };
}
