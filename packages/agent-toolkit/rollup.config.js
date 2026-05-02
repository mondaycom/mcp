import { createRequire } from 'module';
import resolve from '@rollup/plugin-node-resolve';
import commonjs from '@rollup/plugin-commonjs';
import typescript from '@rollup/plugin-typescript';
import terser from '@rollup/plugin-terser';
import json from '@rollup/plugin-json';
import del from 'rollup-plugin-delete';
import dts from 'rollup-plugin-dts';

const require = createRequire(import.meta.url);
const pkg = require('./package.json');

const external = [
  ...Object.keys(pkg.dependencies || {}),
  ...Object.keys(pkg.peerDependencies || {}),
];

const subPaths = ['mcp', 'core', 'openai'];

const subpathConfigs = subPaths.map((dir) => ({
  input: `src/${dir}/index.ts`,
  output: [
    {
      file: `dist/cjs/${dir}/index.js`,
      format: 'cjs',
      sourcemap: true,
    },
    {
      file: `dist/esm/${dir}/index.js`,
      format: 'es',
      sourcemap: true,
    },
  ],
  plugins: [
    del({ targets: [`dist/cjs/${dir}/*`, `dist/esm/${dir}/*`] }),
    resolve({
      preferBuiltins: true,
    }),
    commonjs(),
    typescript({
      tsconfig: './tsconfig.json',
      declaration: true,
      declarationDir: `dist/temp/${dir}`,
      rootDir: 'src',
    }),
    json(),
    terser(),
  ].filter(Boolean),
  external,
}));

// Subpath types
const subpathTypesConfigs = subPaths.map((dir) => ({
  input: `src/${dir}/index.ts`,
  output: [
    { file: `dist/cjs/${dir}/index.d.ts`, format: 'es' },
    { file: `dist/esm/${dir}/index.d.ts`, format: 'es' },
  ],
  plugins: [dts(), del({ targets: [`dist/cjs/${dir}/temp`, `dist/esm/${dir}/temp`] })],
}));

export default [...subpathConfigs, ...subpathTypesConfigs];
