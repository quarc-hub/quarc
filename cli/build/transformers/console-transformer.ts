import { Plugin } from 'esbuild';
import { EnvironmentConfig } from '../../types';

export function consoleTransformer(envConfig?: EnvironmentConfig): Plugin {
    return {
        name: 'console-transformer',
        setup(build) {
            build.onLoad({ filter: /\.ts$/ }, async (args) => {
                const fs = await import('fs');
                const contents = fs.readFileSync(args.path, 'utf8');

                if (envConfig?.removeConsole) {
                    const transformed = contents
                        .replace(/console\.log\([^)]*\);?/g, '/* removed */')
                        .replace(/console\.error\([^)]*\);?/g, '/* removed */')
                        .replace(/console\.warn\([^)]*\);?/g, '/* removed */')
                        .replace(/console\.info\([^)]*\);?/g, '/* removed */')
                        .replace(/console\.debug\([^)]*\);?/g, '/* removed */');

                    return {
                        contents: transformed,
                        loader: 'ts'
                    };
                }

                let transformed = contents
                    .replace(/console\.log/g, '_log')
                    .replace(/console\.error/g, '_error')
                    .replace(/console\.warn/g, '_warn')
                    .replace(/console\.info/g, '_info')
                    .replace(/console\.debug/g, '_debug');

                if (transformed !== contents) {
                    const declarations = `
const _log = console.log;
const _error = console.error;
const _warn = console.warn;
const _info = console.info;
const _debug = console.debug;
`;
                    transformed = declarations + transformed;
                }

                return {
                    contents: transformed,
                    loader: 'ts'
                };
            });
        }
    };
}
