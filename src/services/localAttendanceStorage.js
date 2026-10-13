import {withLocalDatabase} from './localDatabase';

export const getLocalAttendance = (companyId, {limit = 100, offset = 0} = {}) => withLocalDatabase(async db => {
  if (!Number.isInteger(limit) || limit < 1 || limit > 1000 || !Number.isInteger(offset) || offset < 0) {
    throw new Error('Invalid attendance page.');
  }
  const {rows} = await db.execute('SELECT payload_json FROM attendance WHERE company_id = ? ORDER BY log_date DESC, employee_id ASC LIMIT ? OFFSET ?', [String(companyId).trim(), limit, offset]);
  return rows.map(row => JSON.parse(row.payload_json));
});

export const saveLocalAttendance = (companyId, payload) => withLocalDatabase(async db => {
  if (!companyId || !payload.EmployeeId || !payload.LogDate || !payload.Direction) throw new Error('Check-in identity or date is missing.');
  const record = {...payload, companyId: String(companyId).trim()};
  const identity = [record.companyId, String(record.EmployeeId), record.LogDate, record.Direction];
  let response;
  await db.transaction(async tx => {
    const existing = await tx.execute('SELECT payload_json FROM attendance WHERE company_id = ? AND employee_id = ? AND log_date = ? AND direction = ?', identity);
    if (existing.rows.length) {
      response = {isSuccess: true, alreadyCheckedIn: true, record: JSON.parse(existing.rows[0].payload_json)};
    } else {
      await tx.execute('INSERT INTO attendance VALUES (?, ?, ?, ?, ?)', [...identity, JSON.stringify(record)]);
      response = {isSuccess: true, record};
    }
  });
  return response;
});
