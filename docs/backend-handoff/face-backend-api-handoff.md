# Face registration and check-in | Backend handoff

HEMS mobile app • 13 October 2026 • Contract proposal for backend review

## What the backend team needs to provide

Provide APIs to save three face embeddings per employee, download registered employee embeddings for authorized companies, and save attendance for the identified employee. Face detection, liveness, embedding generation and matching currently run on the phone; a server face-matching API is not required for this architecture.

## Current implementation and scope

The working registration screen stores embeddings in encrypted local SQLite. Face Check-In Test opens the camera automatically, matches all locally registered employees, shows the identified employee/company and saves attendance locally. These screens currently do not upload registrations, download server registrations or submit server attendance. Existing network adapters are available separately and need to be connected.

The user should not type Company ID at check-in. Obtain authorized company scope from the authenticated session or assigned kiosk/device context. For multiple companies, fetch each authorized company and keep companyId on every employee record. Do not expose an unrestricted all-companies endpoint.

| API | Contract status |
| --- | --- |
| POST /EmployeeBiomatricRegister/SaveEmployeeImageStringFormat | Route in adapter; three-sample body requires backend confirmation. |
| GET /api/EmployeeFace/GetByCompany/{companyId} | Default route in adapter; backend availability not verified. |
| POST /BiomatricAttendance/SaveAttenance | Route and body in attendance adapter; verify in staging. |
| Access, activation and deletion APIs | Supporting contracts in section 4. |

## Shared request rules

Use HTTPS, Authorization: Bearer <access-token>, Accept: application/json and Content-Type: application/json. The app timeout is 30 seconds. Treat employeeId and companyId as strings and preserve leading zeros. The server must validate the token’s access to the employee, company and operation. Example IDs and placeholder embeddings in this document are illustrative.

# 1. Register or replace an employee’s face

POST /EmployeeBiomatricRegister/SaveEmployeeImageStringFormat

Proposed three-sample contract, aligned with saveEmployeeFaces(). This extends the existing route and must be confirmed by the backend. Do not silently reuse the legacy single-face PascalCase body.

| Parameter | Type / requirement |
| --- | --- |
| employeeId | string, required; existing employee ID |
| companyId | string, required; authorized company |
| employeeName | string, optional; server should use authoritative employee data |
| faces | array, required; exactly 3 objects |
| faces[].faceEmbedding | string, required; Base64 of 128 Float32 values |
| faces[].faceImage | string, optional proposed; Base64 JPEG, no data-URI prefix |

```json
{
  "employeeId": "32",
  "companyId": "C1",
  "employeeName": "Example Employee",
  "faces": [
    {
      "faceEmbedding": "<BASE64_512_BYTES_SAMPLE_1>"
    },
    {
      "faceEmbedding": "<BASE64_512_BYTES_SAMPLE_2>"
    },
    {
      "faceEmbedding": "<BASE64_512_BYTES_SAMPLE_3>"
    }
  ]
}
```

The camera currently produces both faceImage and faceEmbedding. Local persistence retains embeddings only. Prefer an embeddings-only server contract; strip faceImage before upload when adopting this proposal. Confirm any image requirement explicitly.

## Expected HTTP 200 response

```json
{
  "isSuccess": true,
  "message": "Face registration saved."
}
```

## Storage and validation

Decode each embedding: exactly 512 bytes (128 × 4), finite nonzero Float32 values, little-endian representation; normalize or validate the L2 norm. Atomically replace all three samples for (companyId, employeeId). Re-registration must not append stale samples or overwrite an employee in another company. Reject partial writes and unknown employees. Restrict registration to authorized roles.

Recommended extension, requiring frontend changes: persist embeddingVersion / model hash on enrollment and return it on download. Reject mixed model or preprocessing versions. No version field is sent by the current app. If preprocessing changes, existing embeddings cannot be regenerated without the original images; re-enroll affected employees.

# 2. Download registered employees for matching

GET /api/EmployeeFace/GetByCompany/{companyId}

companyId: required string path parameter. No request body. Return only active, face-enabled employees within the caller’s authorized scope. FACE_EMPLOYEES_ROUTE can override this default route.

## Expected HTTP 200 response

```json
{
  "data": [
    {
      "employeeId": "32",
      "employeeName": "Example Employee",
      "companyId": "C1",
      "faces": [
        {
          "faceEmbedding": "<BASE64_512_BYTES_SAMPLE_1>"
        },
        {
          "faceEmbedding": "<BASE64_512_BYTES_SAMPLE_2>"
        },
        {
          "faceEmbedding": "<BASE64_512_BYTES_SAMPLE_3>"
        }
      ]
    }
  ]
}
```

Use these exact camelCase employee fields. companyId is required: getCompanyFaces() filters records by it. A bare array is also supported, but the example envelope is the preferred agreed format. No enrolled employees: HTTP 200 with {"data": []}. Never return a single legacy faceImage instead of the faces array.

## Embedding contract

The bundled MobileFaceNet model takes [1, 3, 112, 112] RGB/NCHW input and returns 128 values. The app normalizes pixels using pixel / 127.5 − 1, then L2-normalizes the output. Base64 represents raw Float32 bytes, not a JSON array, JPEG bytes or decimal text. Preserve the bytes during storage and retrieval. Exactly 512 bytes normally produce 684 Base64 characters including padding.

## How the phone identifies the employee

The app compares the live embedding with every registered sample and takes each employee’s highest cosine similarity. A match currently requires similarity ≥ 0.75 and a gap of ≥ 0.08 from the runner-up employee. An ambiguous or below-threshold result must not save attendance. The single-candidate runner-up score of −1 is an internal sentinel, not a second person.

## Refresh behavior

The network adapter caches by company for the process lifetime and invalidates after registration through that adapter. Add a refresh or version-based sync for enrollments changed on other devices and for revocation. Pagination, incremental sync and multi-company bulk fetch are future contract extensions; the current adapter expects a complete array.

# 3. Save attendance after a successful match

POST /BiomatricAttendance/SaveAttenance

Preserve the route spelling “Biomatric” and “SaveAttenance” unless both teams agree to update the adapter. The current network payload uses PascalCase field names.

```json
{
  "EmployeeId": "32",
  "EmployeeCode": "32",
  "LogDateTime": "2026-10-13T09:30:00",
  "LogDate": "2026-10-13",
  "LogTime": "09:30:00",
  "Direction": "In",
  "DeviceName": "Mobile App",
  "SerialNo": "1",
  "VerificationCode": "1"
}
```

| Parameter | Type / current meaning |
| --- | --- |
| EmployeeId / EmployeeCode | strings; both currently set to matched employeeId |
| LogDateTime | string; local YYYY-MM-DDTHH:mm:ss, no offset |
| LogDate / LogTime | strings; YYYY-MM-DD / HH:mm:ss |
| Direction | string; current check-in sends In |
| DeviceName | string; currently Mobile App |
| SerialNo / VerificationCode | strings; current constants are 1 / 1 |

Confirm whether EmployeeCode differs from EmployeeId in the actual employee master. The frontend needs the real code returned with employee data if they differ. Confirm attendance timezone (for an India deployment, Asia/Kolkata) and device-field semantics. The sample timestamp is illustrative; the app uses the phone’s local clock.

## Expected HTTP 200 response

```json
{
  "isSuccess": true,
  "message": "Check-in saved.",
  "alreadyCheckedIn": false
}
```

The current attendance adapter requires top-level isSuccess: true. For an already recorded check-in, proposed response: HTTP 200, isSuccess: true, alreadyCheckedIn: true, with a clear message. Confirm this behavior with existing attendance rules.

## Company context and retry rules

The current network body has no CompanyId. The server must resolve company from authenticated context and employee identity. If IDs repeat across companies, agree on an explicit CompanyId field or company-scoped route and update the frontend before multi-company server check-in. Never infer tenant from an ambiguous employee ID.

Make retries idempotent under the existing shift/check-in policy. A timeout can occur after a server commit. A proposed Idempotency-Key header requires app changes; it is not sent today. Do not assume one check-in per calendar day if shifts can cross midnight or allow multiple sessions.

# 4. Supporting APIs and response handling

## Face permission lookup — existing adapter contract

GET /BiometricAccess/GetAllBiometricAccessDetailsByEmployeeId/{companyId}/{employeeId}. Both path parameters are strings. Expected JSON: {"isFaceEnable": 1}; the adapter also accepts an array and reads the first record. Values 1 or "1" enable face access. The current local registration flow bypasses this lookup; wire it in for server-controlled eligibility.

## Face activation — existing adapter contract

POST /EmployeeBiomatricRegister/UpdateBiomatricEnableStatus. Existing adapter sends the following legacy fields; keep the typo alias until the contract is standardized.

```json
{
  "EmployeeId": "32",
  "IsFaceAuthunticateEnable": "true",
  "IsFaceAuthenticateEnable": "true",
  "IsFingerAuthenticateEnable": "false",
  "CreatedDate": "2026-10-13T04:00:00.000Z",
  "CreatedBy": "32",
  "ModifiedDate": "2026-10-13T04:00:00.000Z",
  "ModifiedBy": "32"
}
```

IDs and boolean-like flags above are strings; timestamps are UTC ISO 8601 strings. Expected response: {"isSuccess": true}. Server audit actor should come from the authenticated caller. Confirm company scoping and avoid changing finger authentication accidentally. Recommended alternative: atomically enable face attendance during successful registration, eliminating a second activation request.

## Revocation / deletion — proposed new contract

DELETE /api/EmployeeFace/{companyId}/{employeeId}; string path parameters, no body; response HTTP 200 {"isSuccess": true}. Delete or deactivate all three templates for that identity and invalidate client caches. This endpoint is proposed and has no current app adapter. Agree on sync so offline devices stop using revoked registrations.

## Location validation — integration dependency

The production FaceCheckIn component requires checkLocation(employeeId, companyId) returning {inside: boolean, message?: string}. This repository has no location API implementation. If geofencing is required, agree its route and coordinate/device parameters separately and enforce attendance policy server-side. The working local test intentionally performs no location check.

## Errors

Use JSON {"isSuccess": false, "code": "VALIDATION_ERROR", "message": "Exactly 3 valid embeddings are required."}. Recommended HTTP statuses: 400 invalid payload, 401 invalid/expired token, 403 forbidden company/operation, 404 unknown employee, 409 incompatible version or business conflict, 500 server failure. The current client displays message but does not expose a typed error code.

# 5. Integration plan and backend acceptance checks

## Frontend connection work after contracts are agreed

Registration: replace or supplement saveLocalEmployeeFaces() with saveEmployeeFaces(), using the agreed three-sample body and server-confirmed identity. Mark local sync state so a local-only save is not shown as a completed server enrollment.

Check-in: resolve authorized companies without an input field, fetch getCompanyFaces() for that scope, and retain (companyId, employeeId) as the identity. Keep face detection, liveness, frontal-pose validation and matching on the device. Replace local attendance submission with saveAttendance() after company/location requirements are resolved.

Configure API_BASE_URL, setApiAccessToken() and any route overrides. Preserve the verified identity through attendance retries. Refresh registrations after enrollment, activation, deletion or a remote change. Add logout/session expiry handling and clear authorized cached data when the session changes.

## Acceptance checks for backend and mobile teams

Registration: submit exactly three valid embeddings; verify byte-for-byte retrieval. Reject corrupt Base64, wrong vector length, NaN/Infinity, zero vectors and partial sample sets. Re-register employee 32 and confirm old samples are replaced.

Identification: fetch multiple employees, match the correct identity, reject unknown/ambiguous faces, and test duplicate employee IDs in different companies. Validate denied company access and disabled/deleted employees. Keep the existing threshold until measured genuine/impostor tests justify a change.

Attendance: confirm the matched employee is used, check timezone/shift rules, retry after an uncertain timeout without creating a duplicate, and show backend business failures separately from face recognition failures.

Deployment: test authentication, access control, payload casing, network errors, cross-device refresh and geofence policy in staging. Current device matching proves the local flow; it does not prove these endpoints are deployed or compatible.

## Decisions requested from the backend team

Confirm: base URL and authentication; three-sample route/body; embedding-only versus image storage; active employee response; company scoping for attendance; EmployeeCode mapping; activation policy; timezone and duplicate policy; deletion/sync; whether location validation is mandatory. Provide OpenAPI or Postman examples plus staging credentials through the team’s normal secure channel.

## Code used to prepare this handoff

src/services/FaceApiService.js; attendanceApi.js; biometricApi.js; faceRecognitionService.js; faceMatchingService.js; localFaceStorage.js; localAttendanceStorage.js; src/utils/biometricPayload.js; src/hooks/useFaceRegistration.js; src/components/FaceCheckIn.js; src/screens/FaceRegistration/FaceCheckInTestScreen.js.

The older docs/face-check-in-integration.md description of the test as identification-only is stale; the screen now also saves local attendance. This handoff describes the inspected implementation on 13 October 2026.
