const config = require('./.eslintrc.js')

module.exports = {
  ...config,
  rules: {
    ...config.rules,
    'no-console': ['error', { allow: ['info', 'warn', 'error'] }],
    'no-debugger': ['error'],
  },
}
