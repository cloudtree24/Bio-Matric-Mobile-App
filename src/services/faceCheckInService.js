import {FACE_CONFIG} from '../config/faceConfig';
import {buildAttendancePayload, saveAttendance} from './attendanceApi';

// One controller per camera session. Failures retain the verified identity;
// only an explicit retry can submit it again.
export const createFaceCheckInController = ({companyId, checkLocation, requireLocation = true, submitAttendance = saveAttendance, onState = () => {}}) => {
  let verifiedMatch = null;
  let request = null;
  let status = 'identifying';
  let payload = null;
  let response = null;
  const publish = (nextStatus, error = null) => {
    status = nextStatus;
    onState({status, match: verifiedMatch, error, response});
  };
  const submit = () => {
    if (request) return request;
    if (status === 'success') return Promise.resolve(response);
    publish('submitting');
    // Assign the promise before invoking any async dependency.
    request = Promise.resolve().then(async () => {
      if (!companyId) throw new Error('Check-in company context is unavailable.');
      if (requireLocation) {
        if (typeof checkLocation !== 'function') throw new Error('Check-in location context is unavailable.');
        const location = await checkLocation(verifiedMatch.employeeId, companyId);
        if (!location?.inside) throw new Error(location?.message || 'Outside allowed area.');
      }
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
      if (!match?.matched || match.employeeId === null || match.employeeId === undefined || match.employeeId === '' ||
          !Number.isFinite(match.score) || !Number.isFinite(match.scoreGap) ||
          match.score < FACE_CONFIG.matchThreshold || match.scoreGap < FACE_CONFIG.minScoreGap) return match;
      verifiedMatch = {...match};
      if (__DEV__) console.info('[FaceCheckIn] Matched employee', {employeeId: match.employeeId, score: match.score, scoreGap: match.scoreGap});
      await submit();
      return verifiedMatch;
    },
    retry: () => status === 'failed' && verifiedMatch ? submit() : request || Promise.resolve(response),
  };
};
