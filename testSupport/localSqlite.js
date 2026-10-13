/* eslint-env jest */
const fs = require('fs');
const initSqlJs = require('sql.js');

export const setupLocalSqlite = async () => {
  jest.resetModules();
  const SQL = await initSqlJs({wasmBinary: fs.readFileSync(require.resolve('sql.js/dist/sql-wasm.wasm'))});
  const database = new SQL.Database();
  const credentials = new Map();
  const keychain = {
    ACCESSIBLE: {WHEN_UNLOCKED_THIS_DEVICE_ONLY: 'device-only'},
    getGenericPassword: jest.fn(async ({service}) => credentials.get(service) || false),
    setGenericPassword: jest.fn(async (username, password, {service}) => { credentials.set(service, {username, password}); return true; }),
    resetGenericPassword: jest.fn(async ({service}) => { credentials.delete(service); return true; }),
  };
  const execute = jest.fn(async (sql, params = []) => {
    if (sql === 'PRAGMA cipher_version') return {rows: [{cipher_version: 'test-only'}]};
    const statement = database.prepare(sql);
    try {
      statement.bind(params);
      const rows = [];
      while (statement.step()) rows.push(statement.getAsObject());
      return {rows};
    } finally { statement.free(); }
  });
  const driver = {
    execute,
    close: jest.fn(),
    transaction: async callback => {
      database.run('BEGIN');
      try { await callback({execute}); database.run('COMMIT'); }
      catch (error) { database.run('ROLLBACK'); throw error; }
    },
  };
  const open = jest.fn(() => driver);
  jest.doMock('@op-engineering/op-sqlite', () => ({open}));
  jest.doMock('react-native-keychain', () => keychain);
  jest.doMock('react-native-get-random-values', () => ({}));
  jest.doMock('@react-native-async-storage/async-storage', () => ({__esModule: true, default: {removeItem: jest.fn(async () => {})}}));
  global.crypto = {getRandomValues: array => { array.set(require('crypto').randomBytes(array.length)); return array; }};
  return {database, credentials, keychain, execute, open};
};
