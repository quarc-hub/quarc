import * as fs from 'fs';
import * as path from 'path';
import { BaseProcessor, ProcessorContext, ProcessorResult } from './base-processor';
import { TemplateTransformer } from './template/template-transformer';
import { TemplateMinifier } from '../helpers/template-minifier';

export class TemplateProcessor extends BaseProcessor {
    private transformer = new TemplateTransformer();
    private minifier = new TemplateMinifier();

    get name(): string {
        return 'template-processor';
    }

    async process(context: ProcessorContext): Promise<ProcessorResult> {
        if (!context.source.includes('template')) {
            return this.noChange(context.source);
        }

        let source = context.source;
        let modified = false;

        source = await this.processTemplateUrls(source, context);
        if (source !== context.source) modified = true;

        const inlineResult = this.processInlineTemplates(source, context);
        if (inlineResult.modified) {
            source = inlineResult.source;
            modified = true;
        }

        return modified ? this.changed(source) : this.noChange(source);
    }

    private async processTemplateUrls(source: string, context: ProcessorContext): Promise<string> {
        const patterns = [
            /templateUrl\s*[=:]\s*['"`]([^'"`]+)['"`]/g,
        ];

        let result = source;

        for (const pattern of patterns) {
            const matches = [...source.matchAll(pattern)];

            for (const match of matches.reverse()) {
                const templatePath = match[1];
                const fullPath = path.resolve(context.fileDir, templatePath);

                if (!fs.existsSync(fullPath)) {
                    throw new Error(`Template not found: ${fullPath}`);
                }

                let content = await fs.promises.readFile(fullPath, 'utf8');
                content = this.transformer.transformAll(content);

                if (this.shouldMinifyTemplate(context)) {
                    content = this.minifier.minify(content);
                }

                content = this.escapeTemplate(content);

                result = result.replace(match[0], `template: \`${content}\``);
            }
        }

        return result;
    }

    private processInlineTemplates(source: string, context?: ProcessorContext): { source: string; modified: boolean } {
        const patterns = [
            { regex: /template\s*:\s*`([^`]*)`/g, quote: '`' },
            { regex: /template\s*:\s*'([^']*)'/g, quote: "'" },
            { regex: /template\s*:\s*"([^"]*)"/g, quote: '"' },
        ];

        let result = source;
        let modified = false;

        for (const { regex } of patterns) {
            const matches = [...result.matchAll(regex)];

            for (const match of matches.reverse()) {
                let content = this.unescapeTemplate(match[1]);
                content = this.transformer.transformAll(content);

                if (this.shouldMinifyTemplate(context)) {
                    content = this.minifier.minify(content);
                }

                content = this.escapeTemplate(content);

                const newTemplate = `template: \`${content}\``;
                if (match[0] !== newTemplate) {
                    result = result.slice(0, match.index!) + newTemplate + result.slice(match.index! + match[0].length);
                    modified = true;
                }
            }
        }

        return { source: result, modified };
    }

    private escapeTemplate(content: string): string {
        return content
            .replace(/\\/g, '\\\\')
            .replace(/`/g, '\\`')
            .replace(/\$/g, '\\$');
    }

    private unescapeTemplate(content: string): string {
        return content
            .replace(/\\`/g, '`')
            .replace(/\\\$/g, '$')
            .replace(/\\\\/g, '\\');
    }

    private shouldMinifyTemplate(context?: ProcessorContext): boolean {
        if (!context?.config) return false;

        const envConfig = context.config.environments[context.config.environment];
        return envConfig?.minifyTemplate ?? false;
    }
}
