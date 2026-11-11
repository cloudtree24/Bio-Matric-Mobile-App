import {FACE_CONFIG} from '../config/faceConfig';
import {buildAttendancePayload, saveAttendance} from './attendanceApi';

// One controller per camera session. Failures retain the verified identity;
// only an explicit retry can submit it again.
export const createFaceCheckInController = ({companyId, expectedEmployeeId = null, isActive = () => true, checkLocation, requireLocation = true, submitAttendance = saveAttendance, onState = () => {}}) => {
  let verifiedMatch = null;
  let request = null;
  let status = 'identifying';
  let payload = null;
  let response = null;
  const publish = (nextStatus, error = null) => {
    status = nextStatus;
    if (isActive()) onState({status, match: verifiedMatch, error, response});
  };
  const submit = () => {
    if (request) return request;
    if (status === 'success') return Promise.resolve(response);
    publish('submitting');
    // Assign the promise before invoking any async dependency.
    request = Promise.resolve().then(async () => {
      if (!isActive()) throw new Error('The check-in session has ended.');
      if (!companyId) throw new Error('Check-in company context is unavailable.');
      if (requireLocation) {
        if (typeof checkLocation !== 'function') throw new Error('Check-in location context is unavailable.');
        const location = await checkLocation(verifiedMatch.employeeId, companyId);
        if (!location?.inside) throw new Error(location?.message || 'Outside allowed area.');
      }
      if (!isActive()) throw new Error('The check-in session has ended.');
      payload = payload || buildAttendancePayload(verifiedMatch.employeeId);
      response = await submitAttendance(payload);
      publish('success');
      return response;
    }).catch(error => {
      publish('failed', error.message);
      return null;
    }).finally(() => { request = null; });
    return request;
  };
  return {
    identify: async match => {
      if (verifiedMatch) return verifiedMatch;
      if (!isActive() || !match?.matched || match.employeeId == null || match.employeeId === '') return match;
      if (expectedEmployeeId != null) {
        if (String(match.employeeId) !== String(expectedEmployeeId) || String(match.companyId) !== String(companyId) ||
          !Number.isFinite(match.score) || match.score < FACE_CONFIG.cosineThreshold ||
          !Number.isFinite(match.distance) || match.distance < 0 || match.distance > FACE_CONFIG.euclideanThreshold) return match;
      } else if (!Number.isFinite(match.score) || !Number.isFinite(match.scoreGap) ||
        match.score < FACE_CONFIG.matchThreshold || match.scoreGap < FACE_CONFIG.minScoreGap) return match;
      verifiedMatch = {...match};
      if (__DEV__) console.info('[FaceCheckIn] Matched employee', {employeeId: match.employeeId, score: match.score, scoreGap: match.scoreGap});
      await submit();
      return verifiedMatch;
    },
    retry: () => status === 'failed' && verifiedMatch ? submit() : request || Promise.resolve(response),
  };
};
