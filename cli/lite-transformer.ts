import * as esbuild from 'esbuild';
import * as fs from 'fs';
import * as path from 'path';
import { BaseProcessor } from './processors/base-processor';
import { TemplateProcessor } from './processors/template-processor';
import { StyleProcessor } from './processors/style-processor';
import { DIProcessor } from './processors/di-processor';
import { ClassDecoratorProcessor } from './processors/class-decorator-processor';
import { SignalTransformerProcessor, SignalTransformerError } from './processors/signal-transformer-processor';
import { DirectiveCollectorProcessor } from './processors/directive-collector-processor';
import { InjectProcessor } from './processors/inject-processor';

export class BuildError extends Error {
    constructor(
        message: string,
        public filePath: string,
        public processorName: string,
        public originalError?: Error,
    ) {
        super(message);
        this.name = 'BuildError';
    }
}

export class LiteTransformer {
    private processors: BaseProcessor[];

    constructor(processors?: BaseProcessor[]) {
        this.processors = processors || [
            new ClassDecoratorProcessor(),
            new SignalTransformerProcessor(),
            new TemplateProcessor(),
            new StyleProcessor(),
            new InjectProcessor(),
            new DIProcessor(),
            new DirectiveCollectorProcessor(),
        ];
    }

    createPlugin(): esbuild.Plugin {
        return {
            name: 'lite-transformer',
            setup: (build) => {
                build.onLoad({ filter: /\.(ts)$/ }, async (args) => {
                    if (args.path.includes('node_modules')) {
                        return {
                            contents: await fs.promises.readFile(args.path, 'utf8'),
                            loader: 'ts',
                        };
                    }

                    const source = await fs.promises.readFile(args.path, 'utf8');
                    const fileDir = path.dirname(args.path);

                    const skipPaths = [
                        '/quarc/core/module/',
                        '/quarc/core/angular/',
                        '/quarc/router/angular/',
                    ];
                    if (skipPaths.some(p => args.path.includes(p))) {
                        return {
                            contents: source,
                            loader: 'ts',
                        };
                    }

                    let currentSource = source;

                    for (const processor of this.processors) {
                        try {
                            const result = await processor.process({
                                filePath: args.path,
                                fileDir,
                                source: currentSource,
                            });

                            if (result.modified) {
                                currentSource = result.source;
                            }
                        } catch (error) {
                            if (error instanceof SignalTransformerError) {
                                return {
                                    errors: [{
                                        text: error.message,
                                        location: {
                                            file: args.path,
                                            namespace: 'file',
                                        },
                                    }],
                                };
                            }

                            const buildError = new BuildError(
                                error instanceof Error ? error.message : String(error),
                                args.path,
                                processor.name,
                                error instanceof Error ? error : undefined,
                            );

                            return {
                                errors: [{
                                    text: `[${processor.name}] ${buildError.message}`,
                                    location: {
                                        file: args.path,
                                        namespace: 'file',
                                    },
                                }],
                            };
                        }
                    }

                    return {
                        contents: currentSource,
                        loader: 'ts',
                    };
                });
            },
        };
    }
}

export function liteTransformer(processors?: BaseProcessor[]): esbuild.Plugin {
    const transformer = new LiteTransformer(processors);
    return transformer.createPlugin();
}
