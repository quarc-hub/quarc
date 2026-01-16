import * as esbuild from 'esbuild';
import * as fs from 'fs';

export function diPlugin(): esbuild.Plugin {
    return {
        name: 'di-metadata',
        setup(build) {
            build.onLoad({ filter: /\.(ts)$/ }, async (args) => {
                if (args.path.includes('node_modules')) {
                    return { contents: await fs.promises.readFile(args.path, 'utf8'), loader: 'ts' };
                }

                let source = await fs.promises.readFile(args.path, 'utf8');

                // Nie modyfikuj plików z import type lub interface
                if (source.includes('import type') || source.includes('export interface')) {
                    return { contents: source, loader: 'ts' };
                }

                const classRegex = /export\s+class\s+(\w+)(?:\s+implements\s+[\w,\s]+)?\s*\{/g;
                const constructorRegex = /constructor\s*\([^)]*\)/;

                let match;
                const modifications: Array<{ index: number; className: string; params: string[] }> = [];

                while ((match = classRegex.exec(source)) !== null) {
                    const className = match[1];
                    const classStart = match.index;
                    const openBraceIndex = match.index + match[0].length;

                    const afterClass = source.substring(openBraceIndex);
                    const constructorMatch = afterClass.match(constructorRegex);

                    if (constructorMatch) {
                        const constructorStr = constructorMatch[0];
                        const paramsMatch = constructorStr.match(/constructor\s*\(([^)]*)\)/);

                        if (paramsMatch && paramsMatch[1].trim()) {
                            const paramsStr = paramsMatch[1];
                            const params = paramsStr
                                .split(',')
                                .map(p => {
                                    const typeMatch = p.match(/:\s*(\w+)/);
                                    return typeMatch ? typeMatch[1] : null;
                                })
                                .filter(Boolean) as string[];

                            if (params.length > 0) {
                                modifications.push({
                                    index: openBraceIndex,
                                    className,
                                    params
                                });
                            }
                        }
                    }
                }

                if (modifications.length > 0) {
                    modifications.reverse().forEach(mod => {
                        const metadata = `\n    static __di_params__ = ['${mod.params.join("', '")}'];`;
                        source = source.slice(0, mod.index) + metadata + source.slice(mod.index);
                    });

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
