import {base64ToFloat32} from '../utils/base64';
import {FACE_CONFIG} from '../config/faceConfig';

export const cosineSimilarity = (a, b) => {
  if (!a?.length || a.length !== b?.length) return -1;
  let dot = 0;
  let normA = 0;
  let normB = 0;
  for (let i = 0; i < a.length; i += 1) {
    if (!Number.isFinite(a[i]) || !Number.isFinite(b[i])) return -1;
    dot += a[i] * b[i];
    normA += a[i] * a[i];
    normB += b[i] * b[i];
  }
  return normA && normB ? Math.max(-1, Math.min(1, dot / Math.sqrt(normA * normB))) : -1;
};

export const prepareEmployees = employees => employees.map(employee => ({
  ...employee,
  faces: (employee.faces || []).map(face => {
    try {
      return {...face, embedding: base64ToFloat32(face.faceEmbedding || face.faceEmbeding)};
    } catch {
      return {...face, embedding: null};
    }
  }),
}));

export const findBestEmployeeMatch = (liveEmbedding, employees, threshold = FACE_CONFIG.matchThreshold, minScoreGap = FACE_CONFIG.minScoreGap) => {
  let bestEmployee = null;
  let score = -1;
  let secondBestScore = -1;
  let secondBestEmployee = null;
  for (const employee of employees) {
    let employeeScore = -1;
    for (const face of employee.faces || []) {
      let embedding = face.embedding;
      if (embedding === undefined) {
        try { embedding = base64ToFloat32(face.faceEmbedding || face.faceEmbeding); } catch { embedding = null; }
      }
      const faceScore = cosineSimilarity(liveEmbedding, embedding);
      if (__DEV__) console.info('[face-match] Face score', {employeeId: employee.employeeId, score: faceScore});
      employeeScore = Math.max(employeeScore, faceScore);
    }
    if (__DEV__) console.info('[face-match] Employee best score', {employeeId: employee.employeeId, score: employeeScore});
    if (employeeScore > score) {
      secondBestScore = score;
      secondBestEmployee = bestEmployee;
      score = employeeScore;
      bestEmployee = employee;
    } else if (employeeScore > secondBestScore) {
      secondBestScore = employeeScore;
      secondBestEmployee = employee;
    }
  }
  const scoreGap = score - secondBestScore;
  const matched = !!bestEmployee && score >= threshold && scoreGap >= minScoreGap;
  const reason = matched ? 'matched' : !bestEmployee ? 'no_valid_candidates' : score < threshold ? 'below_threshold' : 'ambiguous';
  if (__DEV__) console.info('[face-match] Best match', {employeeId: bestEmployee?.employeeId, score, secondBestEmployeeId: secondBestEmployee?.employeeId, secondBestScore, scoreGap, matched, reason});
  return {matched, companyId: matched ? bestEmployee.companyId : null, employeeId: matched ? bestEmployee.employeeId : null, employeeName: matched ? bestEmployee.employeeName : null, score, scoreGap, reason, secondBestScore, secondBestEmployeeId: secondBestEmployee?.employeeId ?? null};
};
