import { Type, IComponent } from '../index';

export class ComponentUtils {
    static selectorToTagName(selector: string): string {
        return selector.toLowerCase().replace(/[^a-z0-9-]/g, '-');
    }

    static isComponentType(item: any): boolean {
        if (typeof item === 'function' && item._quarcComponent) {
            return true;
        }
        if (item && typeof item === 'object' && item._quarcComponent) {
            return true;
        }
        return false;
    }

    static getSelector(componentType: Type<IComponent>): string {
        return componentType._quarcComponent?.[0]?.selector || '';
    }
}
