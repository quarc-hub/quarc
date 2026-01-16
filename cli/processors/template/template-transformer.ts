import * as fs from 'fs';
import * as path from 'path';

export interface TransformResult {
    content: string;
    modified: boolean;
}

export class TemplateTransformer {
    transformInterpolation(content: string): string {
        let result = content;

        result = this.transformAttributeInterpolation(result);
        result = this.transformContentInterpolation(result);

        return result;
    }

    private transformAttributeInterpolation(content: string): string {
        const tagRegex = /<([a-zA-Z][a-zA-Z0-9-]*)((?:\s+[^>]*?)?)>/g;

        return content.replace(tagRegex, (fullMatch, tagName, attributesPart) => {
            if (!attributesPart || !attributesPart.includes('{{')) {
                return fullMatch;
            }

            const interpolationRegex = /([a-zA-Z][a-zA-Z0-9-]*)\s*=\s*"([^"]*\{\{[^"]*\}\}[^"]*)"/g;
            const bindings: { attr: string; expr: string }[] = [];
            let newAttributes = attributesPart;

            newAttributes = attributesPart.replace(interpolationRegex, (_attrMatch: string, attrName: string, attrValue: string) => {
                const hasInterpolation = /\{\{.*?\}\}/.test(attrValue);
                if (!hasInterpolation) {
                    return _attrMatch;
                }

                const parts: string[] = [];
                let lastIndex = 0;
                const exprRegex = /\{\{\s*([^}]+?)\s*\}\}/g;
                let match;

                while ((match = exprRegex.exec(attrValue)) !== null) {
                    if (match.index > lastIndex) {
                        const literal = attrValue.substring(lastIndex, match.index);
                        if (literal) {
                            parts.push(`'${literal}'`);
                        }
                    }
                    parts.push(`(${match[1].trim()})`);
                    lastIndex = exprRegex.lastIndex;
                }

                if (lastIndex < attrValue.length) {
                    const literal = attrValue.substring(lastIndex);
                    if (literal) {
                        parts.push(`'${literal}'`);
                    }
                }

                const expression = parts.length === 1 ? parts[0] : parts.join(' + ');
                bindings.push({ attr: attrName, expr: expression });

                return '';
            });

            if (bindings.length === 0) {
                return fullMatch;
            }

            const bindingsJson = JSON.stringify(bindings).replace(/"/g, "'");
            const dataAttr = ` data-quarc-attr-bindings="${bindingsJson.replace(/'/g, '&apos;')}"`;

            newAttributes = newAttributes.trim();
            return `<${tagName}${newAttributes ? ' ' + newAttributes : ''}${dataAttr}>`;
        });
    }

    private transformContentInterpolation(content: string): string {
        return content.replace(
            /\{\{\s*([^}]+?)\s*\}\}/g,
            (_, expr) => `<span [innerText]="${expr.trim()}"></span>`,
        );
    }

    transformControlFlowIf(content: string): string {
        let result = content;
        let modified = true;

        while (modified) {
            modified = false;
            result = result.replace(
                /@if\s*\(([^)]+)\)\s*\{([\s\S]*?)\}(?:\s*@else\s+if\s*\(([^)]+)\)\s*\{([\s\S]*?)\})*(?:\s*@else\s*\{([\s\S]*?)\})?/,
                (match) => {
                    modified = true;
                    return this.parseIfBlock(match);
                },
            );
        }

        return result;
    }

    transformControlFlowFor(content: string): string {
        let result = content;
        let startIndex = 0;

        while (startIndex < result.length) {
            const forIndex = result.indexOf('@for', startIndex);
            if (forIndex === -1) break;

            const block = this.extractForBlock(result, forIndex);
            if (!block) {
                startIndex = forIndex + 4;
                continue;
            }

            const replacement = this.buildForDirective(block.header, block.body);
            result = result.substring(0, forIndex) + replacement + result.substring(block.endIndex);
            startIndex = forIndex + replacement.length;
        }

        return result;
    }

    transformNgIfDirective(content: string): string {
        // Keep *ngIf as is - runtime handles it
        return content;
    }

    transformNgForDirective(content: string): string {
        // Keep *ngFor as is - runtime handles it
        return content;
    }

    transformInputBindings(content: string): string {
        return content.replace(/\[([a-zA-Z][a-zA-Z0-9]*)\]="/g, (match, propName) => {
            const kebabName = this.camelToKebab(propName);
            return `[${kebabName}]="`;
        });
    }

    private camelToKebab(str: string): string {
        return str.replace(/([a-z])([A-Z])/g, '$1-$2').toLowerCase();
    }

    transformOutputBindings(content: string): string {
        // Keep (event) as is - runtime handles it
        return content;
    }

    transformTwoWayBindings(content: string): string {
        // Keep [(model)] as is - runtime handles it
        return content;
    }

    transformAll(content: string): string {
        let result = content;

        result = this.transformInterpolation(result);
        result = this.transformControlFlowFor(result);
        result = this.transformControlFlowIf(result);
        result = this.transformSelectNgFor(result);
        result = this.transformNgIfDirective(result);
        result = this.transformNgForDirective(result);
        result = this.transformInputBindings(result);
        result = this.transformOutputBindings(result);
        result = this.transformTwoWayBindings(result);

        return result;
    }

    async loadExternalTemplate(templatePath: string, fileDir: string): Promise<string> {
        const fullPath = path.resolve(fileDir, templatePath);

        if (!fs.existsSync(fullPath)) {
            throw new Error(`Template file not found: ${fullPath}`);
        }

        return fs.promises.readFile(fullPath, 'utf8');
    }

    private parseIfBlock(match: string): string {
        const blocks: Array<{ condition: string | null; content: string }> = [];
        let remaining = match;

        const ifMatch = remaining.match(/@if\s*\(([^)]+)\)\s*\{([\s\S]*?)\}/);
        if (ifMatch) {
            blocks.push({ condition: ifMatch[1].trim(), content: ifMatch[2] });
            remaining = remaining.substring(ifMatch[0].length);
        }

        let elseIfMatch;
        const elseIfRegex = /@else\s+if\s*\(([^)]+)\)\s*\{([\s\S]*?)\}/g;
        while ((elseIfMatch = elseIfRegex.exec(remaining)) !== null) {
            blocks.push({ condition: elseIfMatch[1].trim(), content: elseIfMatch[2] });
        }

        const elseMatch = remaining.match(/@else\s*\{([\s\S]*?)\}$/);
        if (elseMatch) {
            blocks.push({ condition: null, content: elseMatch[1] });
        }

        return this.buildIfDirectives(blocks);
    }

    private buildIfDirectives(blocks: Array<{ condition: string | null; content: string }>): string {
        const negated: string[] = [];
        let result = '';

        for (let i = 0; i < blocks.length; i++) {
            const block = blocks[i];
            let condition: string;

            if (block.condition === null) {
                condition = negated.map(c => `!(${c})`).join(' && ');
            } else if (negated.length > 0) {
                condition = negated.map(c => `!(${c})`).join(' && ') + ` && ${block.condition}`;
            } else {
                condition = block.condition;
            }

            result += `<ng-container *ngIf="${condition}">${block.content}</ng-container>`;
            if (i < blocks.length - 1) result += '\n';

            if (block.condition) {
                negated.push(block.condition);
            }
        }

        return result;
    }

    private extractForBlock(content: string, startIndex: number): { header: string; body: string; endIndex: number } | null {
        const openParenIndex = content.indexOf('(', startIndex);
        if (openParenIndex === -1) return null;

        const closeParenIndex = this.findMatchingParen(content, openParenIndex);
        if (closeParenIndex === -1) return null;

        const openBraceIndex = content.indexOf('{', closeParenIndex);
        if (openBraceIndex === -1) return null;

        const closeBraceIndex = this.findMatchingBrace(content, openBraceIndex);
        if (closeBraceIndex === -1) return null;

        return {
            header: content.substring(openParenIndex + 1, closeParenIndex).trim(),
            body: content.substring(openBraceIndex + 1, closeBraceIndex),
            endIndex: closeBraceIndex + 1,
        };
    }

    private buildForDirective(header: string, body: string): string {
        const parts = header.split(';');
        const forPart = parts[0].trim();
        const trackPart = parts[1]?.trim();

        const forMatch = forPart.match(/^\s*(\w+)\s+of\s+(.+)\s*$/);
        if (!forMatch) return `<!-- Invalid @for syntax: ${header} -->`;

        const variable = forMatch[1];
        const iterable = forMatch[2].trim();

        let ngForExpr = `let ${variable} of ${iterable}`;
        if (trackPart) {
            const trackMatch = trackPart.match(/^track\s+(.+)$/);
            if (trackMatch) {
                ngForExpr += `; trackBy: ${trackMatch[1].trim()}`;
            }
        }

        return `<ng-container *ngFor="${ngForExpr}">${body}</ng-container>`;
    }

    transformSelectNgFor(content: string): string {
        // Transform ng-container *ngFor inside <select> to use comment markers
        // This is needed because browser removes ng-container from inside select during parsing
        const selectRegex = /<(select|optgroup)([^>]*)>([\s\S]*?)<\/\1>/gi;

        return content.replace(selectRegex, (_, tag, attrs, innerContent) => {
            const ngForRegex = /<ng-container\s+\*ngFor\s*=\s*"let\s+(\w+)\s+of\s+([^"]+)"[^>]*>([\s\S]*?)<\/ng-container>/gi;

            const processed = innerContent.replace(ngForRegex, (_m: string, varName: string, iterableExpr: string, tmpl: string) => {
                return `<!--F:${varName}:${iterableExpr}-->${tmpl.trim()}<!--/F-->`;
            });

            return `<${tag}${attrs}>${processed}</${tag}>`;
        });
    }

    private findMatchingParen(content: string, startIndex: number): number {
        let depth = 1;
        let i = startIndex + 1;

        while (i < content.length && depth > 0) {
            if (content[i] === '(') depth++;
            else if (content[i] === ')') depth--;
            i++;
        }

        return depth === 0 ? i - 1 : -1;
    }

    private findMatchingBrace(content: string, startIndex: number): number {
        let depth = 1;
        let i = startIndex + 1;

        while (i < content.length && depth > 0) {
            if (content[i] === '{') depth++;
            else if (content[i] === '}') depth--;
            i++;
        }

        return depth === 0 ? i - 1 : -1;
    }
}
