/**
 * Wspólny rejestr ID komponentów używany przez wszystkie procesory.
 * Używa hasza ze ścieżki pliku, aby ID było deterministyczne niezależnie od kolejności przetwarzania.
 */
export class ComponentIdRegistry {
    private static instance: ComponentIdRegistry;
    private componentIdMap = new Map<string, string>();

    private constructor() {}

    static getInstance(): ComponentIdRegistry {
        if (!ComponentIdRegistry.instance) {
            ComponentIdRegistry.instance = new ComponentIdRegistry();
        }
        return ComponentIdRegistry.instance;
    }

    getComponentId(filePath: string): string {
        if (!this.componentIdMap.has(filePath)) {
            const id = this.generateHashId(filePath);
            this.componentIdMap.set(filePath, id);
        }
        return this.componentIdMap.get(filePath)!;
    }

    private generateHashId(filePath: string): string {
        let hash = 0;
        for (let i = 0; i < filePath.length; i++) {
            const char = filePath.charCodeAt(i);
            hash = ((hash << 5) - hash) + char;
            hash = hash & hash;
        }
        return `c${Math.abs(hash).toString(36)}`;
    }

    reset(): void {
        this.componentIdMap.clear();
    }
}
