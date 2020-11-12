module.exports = {
  out: './docs',

  readme: 'none',
  includes: './',
  exclude: ['**/*test*', '**/example/**/*', '**/*.d.ts'],

  mode: 'file',
  excludeExternals: true,
  excludeNotExported: true,
  excludePrivate: true
}
