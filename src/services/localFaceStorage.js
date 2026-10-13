import {FACE_CONFIG} from '../config/faceConfig';
import {base64ToFloat32} from '../utils/base64';
import {prepareEmployees} from './faceMatchingService';
import {withLocalDatabase} from './localDatabase';

export const getAllLocalFaces = () => withLocalDatabase(async db => {
  const {rows} = await db.execute('SELECT company_id, employee_id, employee_name, faces_json FROM employees ORDER BY company_id, employee_id');
  return prepareEmployees(rows.map(row => ({companyId: row.company_id, employeeId: row.employee_id, employeeName: row.employee_name, faces: JSON.parse(row.faces_json)})));
});

export const getLocalCompanyFaces = companyId => withLocalDatabase(async db => {
  const {rows} = await db.execute('SELECT employee_id, employee_name, faces_json FROM employees WHERE company_id = ? ORDER BY employee_id', [String(companyId).trim()]);
  return prepareEmployees(rows.map(row => ({employeeId: row.employee_id, employeeName: row.employee_name, companyId: String(companyId).trim(), faces: JSON.parse(row.faces_json)})));
});

export const saveLocalEmployeeFaces = payload => {
  return withLocalDatabase(async db => {
    const employeeId = String(payload.employeeId ?? '').trim();
    const companyId = String(payload.companyId ?? '').trim();
    if (!employeeId || !companyId) throw new Error('Enter both Employee ID and Company ID.');
    if (payload.faces?.length !== FACE_CONFIG.registrationSampleCount) {
      throw new Error(`Exactly ${FACE_CONFIG.registrationSampleCount} face samples are required.`);
    }
    const faces = payload.faces.map(face => {
      const embedding = base64ToFloat32(face.faceEmbedding);
      if (!embedding.every(Number.isFinite) || !embedding.some(value => value !== 0)) {
        throw new Error('Invalid face embedding. Register again.');
      }
      // Matching only needs embeddings; never persist the captured photographs.
      return {faceEmbedding: face.faceEmbedding};
    });
    await db.transaction(async tx => {
      await tx.execute('INSERT INTO employees (company_id, employee_id, employee_name, faces_json) VALUES (?, ?, ?, ?) ON CONFLICT(company_id, employee_id) DO UPDATE SET employee_name = excluded.employee_name, faces_json = excluded.faces_json', [companyId, employeeId, payload.employeeName?.trim() || '', JSON.stringify(faces)]);
    });
    return {isSuccess: true};
  });
};
