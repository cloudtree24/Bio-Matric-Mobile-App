# Cross-platform Face Attendance App

## Summary

Create a new isolated React Native TypeScript app folder in this workspace for Android and iOS. It will support face registration, challenge-based liveness, face check-in/check-out, and use the existing HCM biometric APIs without changing their payloads or endpoints.

## Implementation Changes

- Bootstrap `face-attendance-app/` with a clean React Native structure:
  - `screens/`: Register Face, Face Attendance, Result/Error states
  - `services/`: API client, biometric API service, face embedding/matching service, secure storage
  - `components/`: live camera, face guide, liveness challenge UI, loading/error views
  - `config/`: environment-based API URL, thresholds, timeouts, image dimensions
  - `types/`: biometric API request/response types

- Add and configure packages:
  - `react-native-vision-camera` for front-camera preview/capture
  - Vision Camera face-detection/frame-processor dependency for live face/landmark validation
  - `onnxruntime-react-native`, `jpeg-js`, `react-native-fs`, image resizer, and `buffer` for local ONNX embedding generation
  - `axios` for API calls
  - `react-native-keychain` for sensitive local flags/tokens
  - `react-native-config` for API base URL and environment configuration

- Use one consistent face-recognition pipeline across Android and iOS:
  - Bundle the same compatible ONNX embedding model on both platforms.
  - Capture JPEG from the front camera, normalize/resize it to the model’s input dimensions, generate a normalized `Float32Array` embedding, then Base64-encode the embedding for the existing API.
  - Use cosine similarity and Euclidean distance together for a match; expose thresholds through configuration instead of hardcoding them in screens.

- Implement registration flow:
  - Request camera permission and validate employee/company identity.
  - Require a visible, single, front-facing face before capture.
  - Run challenge liveness: random sequence of actions such as “turn left,” “turn right,” and “blink”; only enable capture after all required actions pass.
  - Capture, generate embedding, strip the Base64 data URI prefix, and post this compatible payload:

```json
{
  "EmployeeId": 123,
  "FaceImage": "<jpeg-base64-without-prefix>",
  "FaceEmbeding": "<float32-embedding-base64>",
  "FingerImage": null,
  "FingerEmbeding": null,
  "RetinaImage": null,
  "RetinaEmbeding": null,
  "VoiceRecord": null,
  "VoiceRecordEmbeding": null,
  "CreatedDate": "ISO-8601",
  "ModifiedBy": 123,
  "IsDelete": 0,
  "CompanyId": 10
}
```

  - POST to `EmployeeBiomatricRegister/SaveEmployeeImageStringFormat`.
  - Only after save success, POST the existing enable-status payload to `EmployeeBiomatricRegister/UpdateBiomatricEnableStatus`.
  - Persist only non-biometric local state securely; do not cache raw face photos or print Base64 images/embeddings in logs.

- Implement attendance verification:
  - Fetch existing registration through `getEmployeeBiomatricDetailsByString/{employeeId}/{companyId}`.
  - Reject unavailable/invalid registrations before opening camera.
  - Repeat the liveness challenge, capture a new image, calculate embeddings locally for registered and captured images, and permit check-in/out only if both match thresholds pass.
  - Return clear UI states for permission denial, camera failure, model failure, liveness failure, no face/multiple faces, API timeout, failed match, and successful attendance.

- Retain existing admin availability check:
  - GET `BiometricAccess/GetAllBiometricAccessDetailsByEmployeeId/{companyId}/{employeeId}`.
  - Show registration/attendance only when `isFaceEnable` is enabled.
  - Keep the existing field spelling `IsFaceAuthunticateEnable` for backend compatibility, while normalizing both known spellings inside the client.

## API and Security Rules

- API base URL and authorization token will be loaded from environment configuration; no secrets or production URLs will be hardcoded.
- Axios will use a centralized timeout, auth interceptor, normalized error handling, and no biometric payload logging.
- Registration save and enable-status update will be handled as two explicit steps. If enabling fails after successful registration, the UI will tell the user that registration exists but attendance is not activated, with a safe retry action.
- Challenge liveness reduces basic photo replay risk but is not equivalent to certified anti-spoofing. The liveness implementation will remain behind an interface so a vendor SDK can replace it later without changing registration or API logic.

## Test Plan

- Unit-test Base64 conversion, image validation, embedding normalization, similarity/distance threshold decisions, API payload shape, and API response normalization.
- Test registration success, user cancellation, camera denial, model missing/loading failure, no/multiple face, liveness challenge failure, image capture failure, save API failure, and enable-status failure.
- Test attendance for match success, similarity failure, distance failure, expired/invalid registration, API timeout, and check-in/check-out success.
- Verify Android and iOS native camera permissions, model asset bundling, front-camera operation, and that no raw biometric value appears in logs or unencrypted local storage.

## Assumptions

- The existing HCM APIs, authentication method, employee ID, and company ID remain available and unchanged.
- The backend continues accepting Base64 JPEG images and Base64-encoded face embeddings in the current payload fields.
- The new app is created in a separate folder and does not modify the current HRMS application.
- V1 uses challenge-based liveness with face landmarks; a paid anti-spoofing vendor SDK is out of scope unless added later.
