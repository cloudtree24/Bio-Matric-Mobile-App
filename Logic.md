Haan—yeh detailed implementation plan rahega jisme complete logic aur file-wise code included hoga.

# Face Attendance App – Detailed Code Plan

## 1. App Structure

```text
face-attendance-app/
  src/
    config/
      env.js
      faceConfig.js
    services/
      apiClient.js
      biometricApi.js
      faceRecognitionService.js
      secureStorage.js
      livenessService.js
    hooks/
      useCameraPermission.js
      useFaceRegistration.js
      useFaceVerification.js
    components/
      FaceCamera.js
      LivenessChallenge.js
      FaceGuideOverlay.js
      FaceStatusCard.js
    screens/
      RegisterFaceScreen.js
      AttendanceScreen.js
      FaceResultScreen.js
    utils/
      base64.js
      faceValidation.js
      biometricPayload.js
    navigation/
      AppNavigator.js
  android/
  ios/
```

## 2. Required Packages

```bash
npm install axios buffer jpeg-js react-native-fs \
  @bam.tech/react-native-image-resizer \
  onnxruntime-react-native \
  react-native-vision-camera \
  react-native-keychain \
  react-native-config
```

Liveness/face landmark detection ke liye Vision Camera compatible face-detector package add hoga. Iska use sirf live camera frames mein face count, head direction aur blink validation ke liye hoga.

## 3. Configuration

`src/config/faceConfig.js`

```js
export const FACE_CONFIG = {
  inputSize: 112,
  resizeWidth: 500,
  resizeHeight: 500,
  imageQuality: 70,

  cosineThreshold: 0.72,
  euclideanThreshold: 0.60,

  cameraTimeoutMs: 30000,
  processingTimeoutMs: 30000,

  requiredLivenessSteps: ['blink', 'turnLeft', 'turnRight'],
};
```

`src/config/env.js`

```js
import Config from 'react-native-config';

export const API_BASE_URL = Config.API_BASE_URL;
```

`.env`

```env
API_BASE_URL=https://hcmapiv2.anantatek.com/api
```

## 4. API Logic

Existing APIs same rahengi:

```js
GET /BiometricAccess/GetAllBiometricAccessDetailsByEmployeeId/{companyId}/{employeeId}

GET /EmployeeBiomatricRegister/getEmployeeBiomatricDetailsByString/{employeeId}/{companyId}

POST /EmployeeBiomatricRegister/SaveEmployeeImageStringFormat

POST /EmployeeBiomatricRegister/UpdateBiomatricEnableStatus
```

`src/services/biometricApi.js`

```js
export const saveFaceRegistration = payload =>
  apiClient.post(
    '/EmployeeBiomatricRegister/SaveEmployeeImageStringFormat',
    payload,
  );

export const enableFaceAttendance = payload =>
  apiClient.post(
    '/EmployeeBiomatricRegister/UpdateBiomatricEnableStatus',
    payload,
  );

export const getBiometricDetails = (employeeId, companyId) =>
  apiClient.get(
    `/EmployeeBiomatricRegister/getEmployeeBiomatricDetailsByString/${employeeId}/${companyId}`,
  );

export const getFaceAccess = (employeeId, companyId) =>
  apiClient.get(
    `/BiometricAccess/GetAllBiometricAccessDetailsByEmployeeId/${companyId}/${employeeId}`,
  );
```

## 5. Face Registration Logic

```text
Open Register Face screen
→ Check admin face access
→ Request camera permission
→ Load ONNX model
→ Start front camera
→ Detect exactly one face
→ Run blink + head-left + head-right liveness challenge
→ Capture photo
→ Resize image
→ Generate face embedding
→ Build POST payload
→ Save face API
→ Enable Face Attendance API
→ Securely save non-biometric status
→ Show success
```

Registration payload:

```js
const registrationPayload = {
  EmployeeId: employeeId,
  FaceImage: rawImageBase64,
  FaceEmbeding: embeddingBase64,
  FingerImage: null,
  FingerEmbeding: null,
  RetinaImage: null,
  RetinaEmbeding: null,
  VoiceRecord: null,
  VoiceRecordEmbeding: null,
  CreatedDate: new Date().toISOString(),
  ModifiedBy: employeeId,
  IsDelete: 0,
  CompanyId: companyId,
};
```

Enable payload:

```js
const enablePayload = {
  EmployeeId: employeeId,
  IsFaceAuthunticateEnable: 'true',
  IsFingerAuthenticateEnable: 'false',
  CreatedDate: new Date().toISOString(),
  CreatedBy: employeeId,
  ModifiedDate: new Date().toISOString(),
  ModifiedBy: employeeId,
};
```

## 6. ONNX Face Recognition Service

`FaceRecognitionService` mein yeh methods honge:

```js
loadModel()
preprocessImage(base64Image)
getEmbedding(base64Image)
normalize(vector)
cosineSimilarity(vectorA, vectorB)
euclideanDistance(vectorA, vectorB)
matchFaces(registeredImage, capturedImage)
```

Match rule:

```js
const isMatch =
  similarity >= FACE_CONFIG.cosineThreshold &&
  distance <= FACE_CONFIG.euclideanThreshold;
```

Return result:

```js
{
  isMatch: true,
  similarity: 0.82,
  distance: 0.41,
  confidence: 'HIGH'
}
```

## 7. Liveness Logic

Liveness screen random challenge dikhayegi:

```text
1. Blink karein
2. Face left turn karein
3. Face right turn karein
```

Rules:

- Ek se zyada face hone par reject.
- Face frame ke guide circle ke andar hona chahiye.
- Face too dark, too blurry, ya too far hone par capture disable.
- Challenge complete hone ke baad hi capture button active.
- Timeout par user ko retry milega.

Important: Challenge liveness basic photo replay ko reduce karegi, but bank-level anti-spoofing nahi hogi. Future mein vendor liveness SDK replace kiya ja sakega.

## 8. Attendance Verification Logic

```text
User taps Check In / Check Out
→ Fetch registered face from API
→ Validate FaceImage exists
→ Start liveness camera
→ Capture live image
→ Generate embeddings for registered + live image
→ Compare similarity and distance
→ If match: call attendance API
→ If not match: show retry/error
```

## 9. Security Rules

- Raw face image aur embedding `console.log` mein kabhi print nahi honge.
- Raw face image AsyncStorage mein save nahi hogi.
- Token/status ke liye `react-native-keychain` use hoga.
- API timeout, cancel, permission deny aur partial API failure properly handle honge.
- Face save successful but enable API fail ho to “Registration saved, activation pending” retry state show hogi.
- Same ONNX model Android aur iOS dono mein use hoga—platform mismatch avoid hoga.

## 10. Screens

- `RegisterFaceScreen`
  - Register button
  - Camera permission state
  - Liveness camera
  - Progress/loading/error
  - Registration result

- `AttendanceScreen`
  - Face status
  - Check In button
  - Check Out button
  - Face verification status
  - Match result

- `FaceCamera`
  - Front camera preview
  - Face guide overlay
  - Liveness instruction
  - Countdown
  - Retry/cancel actions

## 11. Test Cases

- Camera permission allow/deny
- Admin face access enabled/disabled
- No registered face
- Face registration success
- Registration API fail
- Enable-status API fail
- Model asset missing
- No face / multiple faces
- Liveness challenge failure
- Face match success
- Wrong person face rejection
- API timeout/network failure
- Android and iOS model loading/camera behavior

android/app/src/main/
├── assets/        # Android ONNX model file
└── AndroidManifest.xml  # Camera permission

ios/
├── YourApp/
│   └── models/    # iOS ONNX model bundle resource
└── YourApp/Info.plist   # Camera permission text

Is plan ke next implementation phase mein main har file ka complete runnable code, package commands, Android permission setup, iOS `Info.plist` setup, ONNX model placement, API client aur screen UI prepare karunga.