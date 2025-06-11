 module.exports = {
   preset: 'ts-jest',
   testEnvironment: 'node',
   roots: ['<rootDir>/src'],
   testMatch: ['**/__tests__/**/*.ts', '**/?(*.)+(spec|test).ts'],
   transform: {
     '^.+\\.ts$': 'ts-jest',
   },
   collectCoverageFrom: [
     'src/**/*.ts',
     '!src/**/*.d.ts',
     '!src/**/*.test.ts',
     '!src/**/*.spec.ts',
     '!src/index.ts',
   ],
   coverageDirectory: 'coverage',
   coverageReporters: ['text', 'lcov', 'html'],
   moduleNameMapper: {
     '^@/(.*)$': '<rootDir>/src/$1',
     '^@config/(.*)$': '<rootDir>/src/config/$1',
     '^@controllers/(.*)$': '<rootDir>/src/controllers/$1',
     '^@models/(.*)$': '<rootDir>/src/models/$1',
     '^@routes/(.*)$': '<rootDir>/src/routes/$1',
     '^@services/(.*)$': '<rootDir>/src/services/$1',
     '^@middlewares/(.*)$': '<rootDir>/src/middlewares/$1',
     '^@utils/(.*)$': '<rootDir>/src/utils/$1',
     '^@types/(.*)$': '<rootDir>/src/types/$1',
   },
   globals: {
     'ts-jest': {
       tsconfig: {
         // Jest용 TypeScript 설정 (테스트에서는 덜 엄격하게)
         strict: true,
         esModuleInterop: true,
         skipLibCheck: true,
       },
     },
   },
   setupFilesAfterEnv: ['<rootDir>/src/tests/setup.ts'],
   testTimeout: 10000,
 };
