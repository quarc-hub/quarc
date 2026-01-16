import * as esbuild from 'esbuild';
import * as fs from 'fs';
import * as path from 'path';

export function templatePlugin(): esbuild.Plugin {
    return {
        name: 'template-inliner',
        setup(build) {
            build.onLoad({ filter: /\.(ts)$/ }, async (args) => {
                if (args.path.includes('node_modules')) {
                    return { contents: await fs.promises.readFile(args.path, 'utf8'), loader: 'ts' };
                }

                let source = await fs.promises.readFile(args.path, 'utf8');

                if (source.includes('import type') || source.includes('export interface')) {
                    return { contents: source, loader: 'ts' };
                }

                const fileDir = path.dirname(args.path);
                let modified = false;

                const templateUrlRegex = /templateUrl\s*[:=]\s*['"`]([^'"`]+)['"`]/g;
                let match;

                console.log(`[template-plugin] Processing: ${args.path}`);

                while ((match = templateUrlRegex.exec(source)) !== null) {
                    console.log(`[template-plugin] Found templateUrl: ${match[1]}`);
                    const templatePath = match[1];
                    const fullPath = path.resolve(fileDir, templatePath);

                    if (!fs.existsSync(fullPath)) {
                        throw new Error(`Template file not found: ${fullPath} (referenced in ${args.path})`);
                    }

                    const templateContent = await fs.promises.readFile(fullPath, 'utf8');
                    const escapedContent = templateContent
                        .replace(/\\/g, '\\\\')
                        .replace(/`/g, '\\`')
                        .replace(/\$/g, '\\$');

                    const replacement = `template = \`${escapedContent}\``;
                    console.log(`[template-plugin] Replacing "${match[0]}" with "${replacement}"`);
                    source = source.replace(match[0], `template = \`${escapedContent}\``);
                    modified = true;
                }

                const styleUrlRegex = /styleUrl\s*[:=]\s*['"`]([^'"`]+)['"`]/g;

                while ((match = styleUrlRegex.exec(source)) !== null) {
                    const stylePath = match[1];
                    const fullPath = path.resolve(fileDir, stylePath);

                    if (!fs.existsSync(fullPath)) {
                        throw new Error(`Style file not found: ${fullPath} (referenced in ${args.path})`);
                    }

                    const styleContent = await fs.promises.readFile(fullPath, 'utf8');
                    const escapedContent = styleContent
                        .replace(/\\/g, '\\\\')
                        .replace(/`/g, '\\`')
                        .replace(/\$/g, '\\$');

                    source = source.replace(match[0], `style = \`${escapedContent}\``);
                    modified = true;
                }

                const styleUrlsRegex = /styleUrls\s*[:=]\s*\[([\s\S]*?)\]/g;

                while ((match = styleUrlsRegex.exec(source)) !== null) {
                    const urlsContent = match[1];
                    const urlMatches = urlsContent.match(/['"`]([^'"`]+)['"`]/g);

                    if (urlMatches) {
                        const styles: string[] = [];

                        for (const urlMatch of urlMatches) {
                            const stylePath = urlMatch.replace(/['"`]/g, '');
                            const fullPath = path.resolve(fileDir, stylePath);

                            if (!fs.existsSync(fullPath)) {
                                throw new Error(`Style file not found: ${fullPath} (referenced in ${args.path})`);
                            }

                            const styleContent = await fs.promises.readFile(fullPath, 'utf8');
                            styles.push(styleContent);
                        }

                        const combinedStyles = styles.join('\n');
                        const escapedContent = combinedStyles
                            .replace(/\\/g, '\\\\')
                            .replace(/`/g, '\\`')
                            .replace(/\$/g, '\\$');

                        source = source.replace(match[0], `style = \`${escapedContent}\``);
                        modified = true;
                    }
                }

                if (modified) {
                    return {
                        contents: source,
                        loader: 'ts',
                    };
                }

                return { contents: source, loader: 'ts' };
            });
        },
    };
}
