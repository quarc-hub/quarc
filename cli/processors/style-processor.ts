import * as fs from 'fs';
import * as path from 'path';
import * as sass from 'sass';
import { BaseProcessor, ProcessorContext, ProcessorResult } from './base-processor';
import { ComponentIdRegistry } from './component-id-registry';

export class StyleProcessor extends BaseProcessor {
    private componentIdRegistry = ComponentIdRegistry.getInstance();

    get name(): string {
        return 'style-processor';
    }

    async process(context: ProcessorContext): Promise<ProcessorResult> {
        if (!context.source.includes('style')) {
            return this.noChange(context.source);
        }

        const componentId = this.componentIdRegistry.getComponentId(context.filePath);
        let source = context.source;
        let modified = false;

        const singleResult = await this.processStyleUrl(source, context, componentId);
        if (singleResult.modified) {
            source = singleResult.source;
            modified = true;
        }

        const multiResult = await this.processStyleUrls(source, context, componentId);
        if (multiResult.modified) {
            source = multiResult.source;
            modified = true;
        }

        return modified ? this.changed(source) : this.noChange(source);
    }

    private async processStyleUrl(
        source: string,
        context: ProcessorContext,
        componentId: string,
    ): Promise<{ source: string; modified: boolean }> {
        const regex = /styleUrl\s*[=:]\s*['"`]([^'"`]+)['"`]/g;
        const matches = [...source.matchAll(regex)];

        if (matches.length === 0) {
            return { source, modified: false };
        }

        let result = source;

        for (const match of matches.reverse()) {
            const stylePath = match[1];
            const fullPath = path.resolve(context.fileDir, stylePath);

            if (!fs.existsSync(fullPath)) {
                throw new Error(`Style not found: ${fullPath}`);
            }

            const content = await this.loadAndCompileStyle(fullPath);
            const scoped = this.scopeStyles(content, componentId);
            const escaped = this.escapeTemplate(scoped);

            result = result.slice(0, match.index!) +
                `style: \`${escaped}\`` +
                result.slice(match.index! + match[0].length);
        }

        return { source: result, modified: true };
    }

    private async processStyleUrls(
        source: string,
        context: ProcessorContext,
        componentId: string,
    ): Promise<{ source: string; modified: boolean }> {
        const regex = /styleUrls\s*[=:]\s*\[([\s\S]*?)\]/g;
        const matches = [...source.matchAll(regex)];

        if (matches.length === 0) {
            return { source, modified: false };
        }

        let result = source;

        for (const match of matches.reverse()) {
            const urlsContent = match[1];
            const urlMatches = urlsContent.match(/['"`]([^'"`]+)['"`]/g);

            if (!urlMatches) continue;

            const styles: string[] = [];

            for (const urlMatch of urlMatches) {
                const stylePath = urlMatch.replace(/['"`]/g, '');
                const fullPath = path.resolve(context.fileDir, stylePath);

                if (!fs.existsSync(fullPath)) {
                    throw new Error(`Style not found: ${fullPath}`);
                }

                styles.push(await this.loadAndCompileStyle(fullPath));
            }

            const combined = styles.join('\n');
            const scoped = this.scopeStyles(combined, componentId);
            const escaped = this.escapeTemplate(scoped);

            result = result.slice(0, match.index!) +
                `style: \`${escaped}\`` +
                result.slice(match.index! + match[0].length);
        }

        return { source: result, modified: true };
    }

    private async loadAndCompileStyle(filePath: string): Promise<string> {
        const ext = path.extname(filePath).toLowerCase();
        const content = await fs.promises.readFile(filePath, 'utf8');

        if (ext === '.scss' || ext === '.sass') {
            const result = sass.compileString(content, {
                style: 'compressed',
                sourceMap: false,
                loadPaths: [path.dirname(filePath)],
            });
            return result.css;
        }

        return content;
    }

    private scopeStyles(css: string, componentId: string): string {
        const attr = `[_ngcontent-${componentId}]`;
        const hostAttr = `[_nghost-${componentId}]`;

        let result = css;

        result = result.replace(/:host\s*\(([^)]+)\)/g, (_, selector) => `${hostAttr}${selector}`);
        result = result.replace(/:host/g, hostAttr);

        result = result.replace(/([^{}]+)\{/g, (match, selector) => {
            if (selector.includes(hostAttr)) return match;

            const selectors = selector.split(',').map((s: string) => {
                s = s.trim();
                if (!s || s.startsWith('@') || s.startsWith('from') || s.startsWith('to')) {
                    return s;
                }

                return s.split(/\s+/)
                    .map((part: string) => {
                        if (['>', '+', '~'].includes(part) || part.includes(hostAttr)) {
                            return part;
                        }
                        const pseudoMatch = part.match(/^([^:]+)(::?.+)$/);
                        if (pseudoMatch) {
                            return `${pseudoMatch[1]}${attr}${pseudoMatch[2]}`;
                        }
                        return `${part}${attr}`;
                    })
                    .join(' ');
            });

            return selectors.join(', ') + ' {';
        });

        return result;
    }

    private escapeTemplate(content: string): string {
        return content
            .replace(/\\/g, '\\\\')
            .replace(/`/g, '\\`')
            .replace(/\$/g, '\\$');
    }
}
