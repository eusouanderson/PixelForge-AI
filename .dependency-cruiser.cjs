/** @type {import('dependency-cruiser').IConfiguration} */
module.exports = {
  forbidden: [
    {
      name: 'no-circular',
      severity: 'error',
      comment: 'Circular dependencies are forbidden across the project.',
      from: {},
      to: {
        circular: true
      }
    },
    {
      name: 'game-engine-must-not-import-persistence',
      severity: 'error',
      comment: 'Babylon.js rendering layer must not control or import game persistence.',
      from: {
        path: '^src/game-engine/'
      },
      to: {
        path: '^src/domains/persistence/'
      }
    },
    {
      name: 'core-domain-must-not-import-ui-or-engine',
      severity: 'error',
      comment: 'Core domain must remain pure TypeScript without Vue or Babylon dependencies.',
      from: {
        path: '^src/core/domain/'
      },
      to: {
        path: '^(src/features|src/game-engine|src/app)/'
      }
    }
  ],
  options: {
    doNotFollow: {
      path: 'node_modules'
    },
    tsPreCompilationDeps: true,
    tsConfig: {
      fileName: 'tsconfig.json'
    }
  }
};

