import 'react-native-get-random-values';
import {open} from '@op-engineering/op-sqlite';
import * as Keychain from 'react-native-keychain';
import AsyncStorage from '@react-native-async-storage/async-storage';
import {Buffer} from 'buffer';

const KEY_SERVICE = 'com.hrms.local-database.key.v1';
const FACE_SERVICE = 'com.hrms.local-face-records.v2';
const ATTENDANCE_SERVICE = 'com.hrms.local-attendance.v1';
let connection;
let queue = Promise.resolve();

const parseLegacy = stored => {
  const records = stored ? JSON.parse(stored.password) : [];
  if (!Array.isArray(records)) throw new Error('Legacy local records are invalid.');
  return records;
};

const initialize = async () => {
  const credential = await Keychain.getGenericPassword({service: KEY_SERVICE});
  let key = credential?.password;
  if (!key) {
    key = Buffer.from(global.crypto.getRandomValues(new Uint8Array(32))).toString('hex');
    const saved = await Keychain.setGenericPassword('database-key', key, {
      service: KEY_SERVICE,
      accessible: Keychain.ACCESSIBLE.WHEN_UNLOCKED_THIS_DEVICE_ONLY,
    });
    if (!saved) throw new Error('Could not protect the local database key.');
  }
  const db = open({name: 'hems-local-v1.sqlite', encryptionKey: key});
  try {
    const cipher = await db.execute('PRAGMA cipher_version');
    if (!cipher.rows?.length) throw new Error('Encrypted SQLite is unavailable. Rebuild with SQLCipher enabled.');
    await db.execute('PRAGMA journal_mode = WAL');
    await db.transaction(async tx => {
      await tx.execute('CREATE TABLE IF NOT EXISTS metadata (key TEXT PRIMARY KEY, value TEXT NOT NULL)');
      await tx.execute('CREATE TABLE IF NOT EXISTS employees (company_id TEXT NOT NULL, employee_id TEXT NOT NULL, employee_name TEXT NOT NULL, faces_json TEXT NOT NULL, PRIMARY KEY (company_id, employee_id))');
      await tx.execute('CREATE TABLE IF NOT EXISTS attendance (company_id TEXT NOT NULL, employee_id TEXT NOT NULL, log_date TEXT NOT NULL, direction TEXT NOT NULL, payload_json TEXT NOT NULL, PRIMARY KEY (company_id, employee_id, log_date, direction))');
      await tx.execute('CREATE INDEX IF NOT EXISTS attendance_company_date ON attendance (company_id, log_date DESC)');
      const migrated = await tx.execute("SELECT value FROM metadata WHERE key = 'keychain_migrated'");
      if (!migrated.rows.length) {
        const faces = parseLegacy(await Keychain.getGenericPassword({service: FACE_SERVICE}));
        const attendance = parseLegacy(await Keychain.getGenericPassword({service: ATTENDANCE_SERVICE}));
        for (const record of faces) {
          const samples = record.faces.map(face => ({faceEmbedding: face.faceEmbedding}));
          await tx.execute('INSERT OR IGNORE INTO employees VALUES (?, ?, ?, ?)', [String(record.companyId), String(record.employeeId), record.employeeName || '', JSON.stringify(samples)]);
        }
        for (const record of attendance) {
          await tx.execute('INSERT OR IGNORE INTO attendance VALUES (?, ?, ?, ?, ?)', [String(record.companyId), String(record.EmployeeId), record.LogDate, record.Direction, JSON.stringify(record)]);
        }
        await tx.execute("INSERT INTO metadata VALUES ('keychain_migrated', '1')");
      }
    });
    // Only remove legacy secure records after their migration commits.
    await Keychain.resetGenericPassword({service: FACE_SERVICE});
    await Keychain.resetGenericPassword({service: ATTENDANCE_SERVICE});
    await AsyncStorage.removeItem('@hems/local-faces/v1');
    return db;
  } catch (error) {
    db.close();
    throw error;
  }
};

// One connection and one queue prevent reads from observing partially updated records.
export const withLocalDatabase = operation => {
  const request = queue.then(async () => {
    if (!connection) {
      connection = initialize().catch(error => { connection = null; throw error; });
    }
    return operation(await connection);
  });
  queue = request.catch(() => {});
  return request;
};
