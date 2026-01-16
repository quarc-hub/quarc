import { BaseProcessor, ProcessorContext, ProcessorResult } from './base-processor';

const SIGNAL_FUNCTIONS = ['input', 'output'];

export class SignalTransformerError extends Error {
    constructor(
        message: string,
        public filePath: string,
        public propertyName?: string,
    ) {
        super(message);
        this.name = 'SignalTransformerError';
    }
}

export class SignalTransformerProcessor extends BaseProcessor {
    get name(): string {
        return 'signal-transformer-processor';
    }

    async process(context: ProcessorContext): Promise<ProcessorResult> {
        const hasSignal = SIGNAL_FUNCTIONS.some(fn =>
            context.source.includes(`${fn}(`) || context.source.includes(`${fn}<`),
        );

        if (!hasSignal) {
            return this.noChange(context.source);
        }

        let source = context.source;
        let modified = false;

        const classRegex = /export\s+class\s+(\w+)(?:\s+(?:extends\s+\w+\s*)?(?:implements\s+[\w,\s]+)?)?\s*\{/g;
        const matches = [...source.matchAll(classRegex)];

        for (const match of matches.reverse()) {
            const className = match[1];
            const bodyStart = match.index! + match[0].length;
            const classBody = this.extractClassBody(source, bodyStart);

            if (!classBody) continue;

            const hasSignalInClass = SIGNAL_FUNCTIONS.some(fn =>
                classBody.includes(`${fn}(`) || classBody.includes(`${fn}<`),
            );

            if (!hasSignalInClass) continue;

            let newBody = this.transformSignals(classBody, className, context.filePath);
            newBody = this.ensureNativeElement(newBody);

            if (newBody !== classBody) {
                source = source.slice(0, bodyStart) + newBody + source.slice(bodyStart + classBody.length);
                modified = true;
            }
        }

        return modified ? this.changed(source) : this.noChange(source);
    }

    private extractClassBody(source: string, startIndex: number): string | null {
        let depth = 1;
        let i = startIndex;

        while (i < source.length && depth > 0) {
            if (source[i] === '{') depth++;
            else if (source[i] === '}') depth--;
            i++;
        }

        return depth === 0 ? source.slice(startIndex, i - 1) : null;
    }

    private transformSignals(classBody: string, className: string, filePath: string): string {
        let result = classBody;

        for (const fn of SIGNAL_FUNCTIONS) {
            const pattern = new RegExp(
                `((?:public|private|protected|readonly)\\s+)?(\\w+)(\\s*=\\s*)(${fn})(<[^>]+>)?\\(([^)]*)\\)`,
                'g',
            );

            result = result.replace(pattern, (_, modifier = '', propName, assignment, fnName, generic = '', args) => {
                if (!propName || propName.trim() === '') {
                    throw new SignalTransformerError(
                        `Cannot determine property name for ${fn}() in ${className}`,
                        filePath,
                    );
                }

                const trimmedArgs = args.trim();
                const newArgs = trimmedArgs
                    ? `"${propName}", this, ${trimmedArgs}`
                    : `"${propName}", this`;

                return `${modifier}${propName}${assignment}${fnName}${generic}(${newArgs})`;
            });
        }

        return result;
    }

    private ensureNativeElement(classBody: string): string {
        const constructorMatch = classBody.match(/constructor\s*\(([^)]*)\)\s*\{/);

        if (!constructorMatch) {
            const insertIndex = classBody.match(/^\s*\n/)?.index ?? 0;
            return classBody.slice(0, insertIndex) +
                '\n    constructor(public _nativeElement: HTMLElement) {}\n' +
                classBody.slice(insertIndex);
        }

        const params = constructorMatch[1].trim();

        if (params.includes('_nativeElement')) {
            return classBody;
        }

        const htmlElementParamMatch = params.match(/(public|private|protected)?\s*(\w+)\s*:\s*HTMLElement/);
        if (htmlElementParamMatch) {
            const modifier = htmlElementParamMatch[1] || 'public';
            const existingParamName = htmlElementParamMatch[2];
            const newParams = params.replace(
                new RegExp(`(${modifier})?\\s*${existingParamName}\\s*:\\s*HTMLElement`),
                `${modifier} _nativeElement: HTMLElement`,
            );
            return classBody
                .replace(/constructor\s*\([^)]*\)\s*\{/, `constructor(${newParams}) {`)
                .replace(new RegExp(`this\\.${existingParamName}`, 'g'), 'this._nativeElement');
        }

        const nativeParam = 'public _nativeElement: HTMLElement';
        const newParams = params ? `${nativeParam}, ${params}` : nativeParam;

        return classBody
            .replace(/constructor\s*\([^)]*\)\s*\{/, `constructor(${newParams}) { void this._nativeElement;`);
    }
}
