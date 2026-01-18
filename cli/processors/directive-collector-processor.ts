import { BaseProcessor, ProcessorContext, ProcessorResult } from './base-processor';

export class DirectiveCollectorProcessor extends BaseProcessor {
    get name(): string {
        return 'directive-collector-processor';
    }

    async process(context: ProcessorContext): Promise<ProcessorResult> {
        if (!context.source.includes('_quarcComponent')) {
            return this.noChange(context.source);
        }

        if (!context.source.includes('imports:')) {
            return this.noChange(context.source);
        }

        let source = context.source;
        let modified = false;

        const scopeIdPattern = /static\s+_scopeId\s*=\s*'[^']*';/g;

        let match;
        const replacements: { position: number; insert: string }[] = [];

        while ((match = scopeIdPattern.exec(source)) !== null) {
            const scopeIdEnd = match.index + match[0].length;

            const beforeScopeId = source.substring(0, match.index);
            const quarcComponentMatch = beforeScopeId.match(/static\s+_quarcComponent\s*=\s*\[([^\]]*(?:\[[^\]]*\][^\]]*)*)\];[^]*$/);

            if (!quarcComponentMatch) {
                continue;
            }

            const componentOptions = quarcComponentMatch[1];

            const importsMatch = componentOptions.match(/imports\s*:\s*\[([^\]]*)\]/);
            if (!importsMatch) {
                continue;
            }

            const importsContent = importsMatch[1];
            const { directives, pipes } = this.categorizeImports(importsContent, source);

            let insert = '';

            if (directives.length > 0) {
                insert += `\n    static _quarcDirectives = [${directives.join(', ')}];`;
            }

            if (pipes.length > 0) {
                insert += `\n    static _quarcPipes = [${pipes.join(', ')}];`;
            }

            if (insert) {
                replacements.push({
                    position: scopeIdEnd,
                    insert,
                });
            }
        }

        for (let i = replacements.length - 1; i >= 0; i--) {
            const r = replacements[i];
            source = source.slice(0, r.position) + r.insert + source.slice(r.position);
            modified = true;
        }

        return modified ? this.changed(source) : this.noChange(source);
    }

    private categorizeImports(importsContent: string, source: string): { directives: string[]; pipes: string[] } {
        const importNames = this.parseImportNames(importsContent);
        const directives: string[] = [];
        const pipes: string[] = [];

        for (const name of importNames) {
            if (this.isPipe(name, source)) {
                pipes.push(name);
            } else {
                directives.push(name);
            }
        }

        return { directives, pipes };
    }

    private isPipe(className: string, source: string): boolean {
        const classPattern = new RegExp(`class\\s+${className}\\s*(?:extends|implements|\\{)`);
        const classMatch = source.match(classPattern);

        if (!classMatch) {
            return false;
        }

        const beforeClass = source.substring(0, classMatch.index!);
        const pipeDecoratorPattern = new RegExp(`static\\s+_quarcPipe\\s*=.*?${className}`, 's');

        return pipeDecoratorPattern.test(source);
    }

    private parseImportNames(importsContent: string): string[] {
        return importsContent
            .split(',')
            .map(s => s.trim())
            .filter(s => s.length > 0 && /^[A-Z]/.test(s));
    }
}
