import {cosineSimilarity, findBestEmployeeMatch, prepareEmployees} from '../src/services/faceMatchingService';
import {float32ToBase64, base64ToFloat32} from '../src/utils/base64';

const face = vector => ({faceEmbedding: float32ToBase64(vector)});

test('uses actual cosine similarity for unnormalized vectors and rejects invalid vectors', () => {
  expect(cosineSimilarity([2, 0], [3, 0])).toBe(1);
  expect(cosineSimilarity([0, 0], [1, 0])).toBe(-1);
  expect(cosineSimilarity([NaN], [1])).toBe(-1);
  expect(cosineSimilarity([1], [1, 0])).toBe(-1);
});

test('compares all 300 cached embeddings and selects the highest employee sample', () => {
  const employees = Array.from({length: 100}, (_, employeeId) => ({
    employeeId, employeeName: `Employee ${employeeId}`, faces: [face([0, 1]), face([0, 1]), face(employeeId === 99 ? [1, 0] : [0, 1])],
  }));
  expect(findBestEmployeeMatch([1, 0], prepareEmployees(employees))).toMatchObject({matched: true, employeeId: 99, employeeName: 'Employee 99', score: 1, secondBestScore: 0});
});

test('returns the best score without identity below threshold and skips corrupt samples', () => {
  const employees = prepareEmployees([{employeeId: 1, faces: [{faceEmbedding: 'x'}, face([0.6, 0.8])]}]);
  expect(findBestEmployeeMatch([1, 0], employees, 0.75)).toMatchObject({matched: false, employeeId: null, employeeName: null, score: expect.closeTo(0.6)});
  expect(findBestEmployeeMatch([1, 0], [], 0.75).score).toBe(-1);
});

test('preserves Float32 embedding bytes used by the existing backend', () => {
  const vector = new Float32Array([0.25, -0.5, 1]);
  expect(base64ToFloat32(float32ToBase64(vector))).toEqual(vector);
});


test('keeps the runner-up employee rather than the winner’s second sample', () => {
  const vector = score => [score, Math.sqrt(1 - score * score)];
  const employees = prepareEmployees([
    {employeeId: 44, faces: [face(vector(0.70)), face(vector(0.86)), face(vector(0.78))]},
    {employeeId: 45, faces: [face(vector(0.49)), face(vector(0.55)), face(vector(0.44))]},
    {employeeId: 46, faces: [face(vector(0.61)), face(vector(0.50)), face(vector(0.40))]},
  ]);
  const result = findBestEmployeeMatch([1, 0], employees);
  expect(result.employeeId).toBe(44);
  expect(result.score).toBeCloseTo(0.86);
  expect(result.secondBestEmployeeId).toBe(46);
  expect(result.secondBestScore).toBeCloseTo(0.61);
});

test('retains equal employee scores and handles a single candidate', () => {
  const employees = prepareEmployees([{employeeId: 1, faces: [face([1, 0])]}, {employeeId: 2, faces: [face([1, 0])]}]);
  expect(findBestEmployeeMatch([1, 0], employees)).toMatchObject({matched: false, employeeId: null, reason: 'ambiguous', score: 1, secondBestEmployeeId: 2, secondBestScore: 1});
  expect(findBestEmployeeMatch([1, 0], employees.slice(0, 1))).toMatchObject({secondBestEmployeeId: null, secondBestScore: -1});
});


test.each([
  [0.88, 0.61, true, 'matched'],
  [0.79, 0.77, false, 'ambiguous'],
  [0.63, 0.51, false, 'below_threshold'],
])('best %s and second %s produce matched=%s', (best, second, matched, reason) => {
  const vector = score => [score, Math.sqrt(1 - score * score)];
  const employees = prepareEmployees([
    {employeeId: 44, faces: [face(vector(best)), face(vector(0.3)), face(vector(0.2))]},
    {employeeId: 45, faces: [face(vector(second)), face(vector(0.3)), face(vector(0.2))]},
  ]);
  const result = findBestEmployeeMatch([1, 0], employees);
  expect(result).toMatchObject({matched, reason, employeeId: matched ? 44 : null});
  expect(result.scoreGap).toBeCloseTo(best - second);
  expect(findBestEmployeeMatch([1, 0], employees, 0.5, 0)).toMatchObject({matched: true});
});

test('decodes known little-endian Float32 bytes rather than merely round-tripping', () => {
  expect(base64ToFloat32('AACAPwAAAL8AAIA+')).toEqual(new Float32Array([1, -0.5, 0.25]));
});
