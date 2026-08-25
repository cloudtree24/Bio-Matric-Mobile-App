## HRMS React Native audit

No files, packages, or configuration were changed. I also left the existing dirty worktree untouched.

### 1. Structure and application flow

- Entry point: [index.js](/Users/rajsubudhi/Desktop/ESSMobileApp/index.js) registers `hrms`; [App.js](/Users/rajsubudhi/Desktop/ESSMobileApp/App.js) composes Redux, auth, profile-image, notification, language, safe-area, navigation, error boundary, toast, and FCM listeners.
- Navigation:
  - [AppNavigator.js](/Users/rajsubudhi/Desktop/ESSMobileApp/src/navigation/AppNavigator.js), `AppNavigator`: splash screens → Login → Drawer/Main plus standalone HR screens.
  - [DrawerNavigator.js](/Users/rajsubudhi/Desktop/ESSMobileApp/src/navigation/DrawerNavigator.js), `DrawerNavigator`: `Tabs` and `Notifications`; it also fetches profile and notification data.
  - [BottomTabNavigator.js](/Users/rajsubudhi/Desktop/ESSMobileApp/src/navigation/BottomTabNavigator.js): Dashboard (`HomeScreen`), Leave, Action modal, Attendance, Payslip.
- Main business screen: [HomeScreen.js](/Users/rajsubudhi/Desktop/ESSMobileApp/src/screens/HomeScreen.js). It owns face/fingerprint registration, biometric check-in, check-out, geofencing, shifts, OT, auto-checkout, timers, and background-service startup.
- Screens cover login/password reset, profile, attendance, leave/leave approval/revoke, OT, comp-off, payroll, expenses/advance requests, exits, notifications, and reports.
- Reusable UI is in `src/component/`; styling is primarily in `src/Stylesheet/`; Redux only contains `ExitSlice` and `payslipSlice`.
- Services/helpers:
  - API transport: [axiosInstance.js](/Users/rajsubudhi/Desktop/ESSMobileApp/src/utils/axiosInstance.js), `setAuthToken`, `setUserIdHeader`.
  - API facade: [ApiService.js](/Users/rajsubudhi/Desktop/ESSMobileApp/src/constants/ApiService.js).
  - Face processing: [FaceRecognitionService.js](/Users/rajsubudhi/Desktop/ESSMobileApp/src/constants/FaceRecognitionService.js).
  - Device biometric prompt/key management: [BiomatricServices.js](/Users/rajsubudhi/Desktop/ESSMobileApp/src/utils/BiomatricServices.js).
  - iOS variants: `useIOSFaceRecognition`, `useIOSLocation`, and `useIOSBackgroundService`.

### 2. Packages and platform support

[package.json](/Users/rajsubudhi/Desktop/ESSMobileApp/package.json) declares React Native **0.79.0**, React **19.0.0**, and Node **>=18**.

| Area | Current package(s) |
|---|---|
| ONNX / face ML | `onnxruntime-react-native@1.23.0`, `jpeg-js`, image resizer, `react-native-fs` |
| Camera/image capture | `react-native-vision-camera`, `react-native-image-picker` |
| Device biometrics | `react-native-biometrics`, `react-native-keychain` |
| Storage | AsyncStorage, `react-native-mmkv`; no SQLite package/use found |
| Location | community geolocation, `react-native-permissions`, `geolib` |
| Background | `react-native-background-actions`, `react-native-background-fetch` |
| Notifications | Firebase App/Messaging and Notifee |
| Navigation | React Navigation native stack, tabs, drawer |
| State | Redux Toolkit / React Redux |
| Files/PDF | RNFS, document picker, print, PDF, HTML-to-PDF |

Risks found from the repository:

- [package.json](/Users/rajsubudhi/Desktop/ESSMobileApp/package.json) has a `resolutions` entry for `react-native-document-picker`, while dependencies declare `@react-native-documents/picker`; this may be a stale/inert override.
- The project relies on custom patches for `onnxruntime-react-native` and `react-native-background-actions`; compatibility therefore depends on those patches remaining applicable.
- The iOS app disables Fabric/New Architecture in [Podfile](/Users/rajsubudhi/Desktop/ESSMobileApp/ios/Podfile), while Android uses the generated React Native architecture flag.
- [android/app/build.gradle](/Users/rajsubudhi/Desktop/ESSMobileApp/android/app/build.gradle) contains release-signing material and [AndroidManifest.xml](/Users/rajsubudhi/Desktop/ESSMobileApp/android/app/src/main/AndroidManifest.xml) contains a Maps API key. Both are sensitive and should not be committed as plaintext.
- [authService.js](/Users/rajsubudhi/Desktop/ESSMobileApp/src/utils/authService.js) and [LoginScreen.js](/Users/rajsubudhi/Desktop/ESSMobileApp/src/screens/LoginScreen.js), `handleLogin`, contain a hard-coded bearer token.

### 3. API inventory

Base API URL is configured in [apiConfig.js](/Users/rajsubudhi/Desktop/ESSMobileApp/src/constants/apiConfig.js): `https://hcmapiv2.anantatek.com/api`. `axiosInstance` sends JSON, has a 30-second default timeout, and conditionally adds Bearer/UserId headers.

The application does not define backend response schemas. Each API response below is therefore the actual client handling: generally `response.data`, an array, or an `isSuccess/message` envelope.

| API / method | File and function | Request / purpose | Response handling |
|---|---|---|---|
| `POST EmpRegistration/FetchCompanyUserId` | `LoginScreen.handleLogin`; `authService.fetchUserId` | `{UserName, Password, descriptor:null}`; login identity lookup | User ID scalar |
| `POST EmpRegistration/GetAuthUser` | `LoginScreen.handleLogin` | `{UserName, Password, UserType:0}` | Employee/user object |
| `POST FCMDeviceTokenRegister/RegisterDeviceToken` | `LoginScreen.handleLogin` | `{EmployeeId, DeviceToken, DeviceType}` | Not consumed |
| `GET CompOffManagement/IsCompoffPolicyEnabled/:companyId` | `LoginScreen.handleLogin` | Company route parameter | Reads `data.isExist` |
| `POST BiomatricAttendance/SaveAttenance` | `ApiService.saveAttendance`; HomeScreen check-in/out handlers | Attendance payload below | Requires `data.isSuccess` |
| `GET EmployeeBiomatricRegister/getEmployeeBiomatricDetailsByString/:employee/:company` | `ApiService.fetchBiometricDetails` | Route parameters | Normalizes `faceImage`, `fingerEmbeding` |
| `POST EmployeeBiomatricRegister/SaveEmployeeImageStringFormat` | `ApiService.saveBiometricRegistration`; HomeScreen registration handlers | Biometric registration payload below | Normalizes several success-envelope shapes |
| `POST EmployeeBiomatricRegister/UpdateBiomatricEnableStatus` | `ApiService.updateBiometricEnableStatus`; face registration | Enable-status payload | Requires `data.isSuccess` |
| `GET BiometricAccess/GetAllBiometricAccessDetailsByEmployeeId/:company/:employee` | `ApiService.fetchBiometricEnableStatus`; HomeScreen | Route parameters | First array record → boolean access flags |
| `GET GeoFencing/getGeoLocationDetailsByEmployeeId/:employee/:company` | `ApiService.fetchGeofences`; `useIOSLocation.checkLocation` | Route parameters | Geofence array |
| `POST Shift/GetAttendanceDataForSingleEmployeebyshiftwiseForeachDay` | `ApiService.fetchShiftDetails`; HomeScreen shift effect | Employee/date/filter object | Shift array |
| `GET OtPolicyMaster/GetAllOtPolicy/:company` | `ApiService.fetchOTPolicy` | Company ID | Extracts `MinOverTime`, `MinEarlyGoing` |
| `POST BiomatricAttendance/SaveOverTimeReasonFromAndroid` | `ApiService.saveOTReason`; `ApplyOverTime` | OT-reason object | `isSuccess` envelope |
| `POST BiomatricAttendance/GetAllOverTimeRequestByEmployeeId` | `ApiService.getOTRequestStatus` | OT status object | Filters returned array for current date |
| `POST Notification/sendNotificationForLogoutInAndroid` | `ApiService.sendLogoutNotification`; HomeScreen | check-in notification object | `response.data` |
| `GET LeavePolicy/GetPendingLeaveDetails/:company/:employee` | `ApiService.fetchEmployeeLeaveDetailsForDashboard`; leave screens | Route parameters | Pending leave array |
| `GET LeavePolicy/GetAllLeavePolicy/:company` | same | Company route parameter | Leave-policy array |
| `GET CommonDashboard/GetEmployeeLeaveDetails/:company/:employee` | `ApiService.fetchEmployeeLeaveDetails`; leave screens | Route parameters | Leave-detail array |
| `GET CommonDashboard/GetLeaveApprovalDetails/:company/:branch/:dept/:employee` | `ApiService`; `WhoLeave` | Route parameters | Approval data |
| `GET/POST ApplyLeave/*` | `ApplyLeave`, `MyApplyLeave`, `LeaveRequstStatus`, `LeaveRequestDetails` | leave lists/details, save/update, deletion, approval queues | Direct `response.data` |
| `POST LeaveApproval/*` | `LeaveRequestDetails`, `LeaveReport`, `OverTimeRequest` | approval/final approval/report/OT approval objects | Direct `response.data` |
| `GET/POST LeaveRevoke/*` | `LeaveCancelRequest`, `LeaveCancelEmployee` | revoke request/list/detail/approval | Direct `response.data` |
| `GET/POST PaymentAdvanceRequest/*` | payment, expense, and approval screens | expense/advance reports, details, save/update, approval payloads | Direct `response.data` |
| `GET/POST EmployeeExit/*` | exit screens | employee exit records/application/withdrawal payloads | Direct `response.data` |
| `GET/POST CompOffManagement/*` | `CompOffRequest` | policy, request lists, eligible staff, save request | Direct `response.data` |
| `GET/POST Notification/*`, `Email/*` | notifications and most request screens | notification recipient lookup/send/read actions | Arrays or direct response |
| `GET/POST EmpRegistration/*`, `ChildCompany/*` | Profile, drawer, payroll | profile/company fetch and profile update | employee/company data or save envelope |
| `GET/POST PayRollRun/*` | `payslipSlice`, expense approval | payslip list/detail and payroll checks | direct response |
| `POST Translate` | `translateService.translateText` | text/language payload | translated string cached in MMKV |
| `GET ServerDateTime/GetServerDateTime` | `serverTimeApi`; `useServerTimeValidation` | none | server time |
| `POST UploadDocument/UploadDocument`; `GET UploadDocument/FetchFile` | Profile/leave screens | base64 document/image / filename | upload response or `base64File` |

There are also direct external requests to `worldtimeapi.org`, static image URLs, and the upload host. These bypass the configured base URL.

### 4. Face recognition

Android uses [FaceRecognitionService.js](/Users/rajsubudhi/Desktop/ESSMobileApp/src/constants/FaceRecognitionService.js):

1. `loadModel` copies `android/app/src/main/assets/mobilefacenet.onnx` to `DocumentDirectoryPath/mobilefacenet.onnx`, then creates a CPU ONNX session.
2. `preprocessImage` strips the data URI, writes a temporary JPEG, resizes it to **112×112**, reads base64, and deletes the temporary files.
3. `getEmbedding` JPEG-decodes RGB pixels, normalizes each channel with mean/std `[0.5,0.5,0.5]`, produces tensor `[1,3,112,112]`, runs the model, then L2-normalizes its output.
4. `matchFaces` gets two embeddings in parallel, computes cosine similarity and Euclidean distance, and succeeds only when both pass:
   - cosine `>= 0.65`
   - distance `<= 0.60`
   - processing timeout: 30 seconds.

iOS does **not** use `mobilefacenet.onnx` in the active HomeScreen path. [useIOSFaceRecognition.js](/Users/rajsubudhi/Desktop/ESSMobileApp/src/hooks/useIOSFaceRecognition.js) loads the bundled `tiny_model.onnx`, uses **224×224** input, and requires cosine `>= 0.85` and Euclidean `<= 0.55`. The Xcode project adds `tiny_model.onnx` to Copy Bundle Resources; `mobilefacenet.onnx` is referenced but not added as a resource.

Actual intended flow in [HomeScreen.js](/Users/rajsubudhi/Desktop/ESSMobileApp/src/screens/HomeScreen.js):

`front camera → JPEG base64 → resize/decode/tensor → ONNX embedding → local face-to-face comparison → SaveEmployeeImageStringFormat / SaveAttenance → UI result`.

There is no face-detection model or face-landmark/detection stage in the active code. It compares whole captured images after resize.

Important blocking defect: `handleRegisterFace` logs `pureBase64` before `const pureBase64 = ...` is declared. This is a JavaScript temporal-dead-zone `ReferenceError`, caught by the handler, so current face registration will fail before its registration API call.

### 5. Fingerprint / biometric capability

`handleRegisterFingerprint` is [HomeScreen.js](/Users/rajsubudhi/Desktop/ESSMobileApp/src/screens/HomeScreen.js), `handleRegisterFingerprint`.

It:

1. Rejects non-Android platforms.
2. Calls `BiometricService.isBiometricAvailable`.
3. Uses `react-native-biometrics.simplePrompt` through `BiometricService.authenticate`.
4. Creates an asymmetric biometric public key using `BiometricService.createKeys`.
5. Stores that public key in Keychain and sends it as `FingerEmbeding`.
6. Persists the local selected biometric state.

This is device-biometric authentication, not fingerprint identification.

- Device biometric authentication: the OS proves that an enrolled biometric/device credential passed a prompt. The app receives a success boolean.
- Fingerprint identification: would require fingerprint minutiae/template capture and matching against employee templates. No such native module, raw fingerprint capture, template extraction, employee lookup, or server signature verification is present.

Therefore, the project cannot identify which employee’s fingerprint was scanned. It authenticates whichever biometric is enrolled on the current device after the employee is already known.

### 6. Current biometric registration payload

Defined by `buildBiometricRegistrationPayload` in [HomeScreen.js](/Users/rajsubudhi/Desktop/ESSMobileApp/src/screens/HomeScreen.js):

```js
{
  EmployeeId: employeeDetails.id,
  FaceImage: faceImage,
  FaceEmbeding: faceEmbedding,
  FingerImage: null,
  FingerEmbeding: fingerprintKey,
  RetinaImage: null,
  RetinaEmbeding: null,
  VoiceRecord: null,
  VoiceRecordEmbeding: null,
  CreatedDate: new Date().toISOString(),
  ModifiedBy: employeeDetails.id,
  IsDelete: 0,
  CompanyId: employeeDetails.childCompanyId,
}
```

It has no device-information fields, biometric-type field, `serverFingerprintEnabled`, or `serverFaceEnabled` fields.

- Face registration passes stripped JPEG base64 as `FaceImage` and a base64-encoded float embedding as `FaceEmbeding`; fingerprint fields are null.
- Fingerprint registration passes `null` face fields and the generated public key as `FingerEmbeding`.
- Face registration separately posts `{EmployeeId, IsFaceAuthunticateEnable:'true', IsFingerAuthenticateEnable:'false', CreatedDate, CreatedBy, ModifiedDate, ModifiedBy}` to update enablement.

### 7. Current check-in payload

Defined by `buildAttendancePayload` in [HomeScreen.js](/Users/rajsubudhi/Desktop/ESSMobileApp/src/screens/HomeScreen.js):

```js
{
  EmployeeId: String(employeeId),
  EmployeeCode: String(employeeId),
  LogDateTime: logDateTime,
  LogDate: logDate,
  LogTime: logTime,
  Direction: 'In', // 'Out' for foreground/Android checkout
  DeviceName: APP_CONFIG.DEVICE.NAME,
  SerialNo: APP_CONFIG.DEVICE.SERIAL,
  VerificationCode: APP_CONFIG.DEVICE.VERIFICATION_CODE,
}
```

It contains no device ID, coordinates, location object, captured face, fingerprint/public key, biometric result, server flags, or shift details. Location and biometric verification are local gates before sending attendance.

Note: [useIOSBackgroundService.js](/Users/rajsubudhi/Desktop/ESSMobileApp/src/hooks/useIOSBackgroundService.js), `performBackgroundAutoCheckout`, builds an auto-checkout attendance payload with `Direction: 'In'`, unlike foreground/Android auto-checkout which uses `'Out'`.

### 8. Server flags

The implemented server flags originate from `ApiService.fetchBiometricEnableStatus`, which converts the first API record’s numeric `isFaceEnable === 1` and `isFingerEnable === 1` to booleans.

- `serverFaceEnabled` / `serverFingerprintEnabled` are local variables, not API payload fields.
- They are used in [HomeScreen.js](/Users/rajsubudhi/Desktop/ESSMobileApp/src/screens/HomeScreen.js), `checkAdminAccess`, biometric-detail initialization, and `handleCheckInWithBiometric`.
- They are persisted as `biometric_face_enabled` and `biometric_fingerprint_enabled` through `SecureStorage`, which is actually AsyncStorage.
- `resolveBiometricType` selects face/fingerprint/none. On iOS it always resolves to face or none; iOS fingerprint is explicitly disabled.
- `biometricEnabled` is an AsyncStorage local-state key used by [BiomatricServices.js](/Users/rajsubudhi/Desktop/ESSMobileApp/src/utils/BiomatricServices.js) and `BiometricsSection`.
- No `biometricRequired` occurrence was found in the active source.

### 9. Storage and security

| Storage | Current data | Security assessment |
|---|---|---|
| AsyncStorage | Auth user, bearer token, user ID, Comp-Off flag, biometric state, attendance/check-in state, face image, employee data, OT state, notification prompt, profile URI | Plain app storage; unsuitable for tokens, employee records, face image, or public-key copies requiring confidentiality |
| `SecureStorage` wrapper | `CHECK_IN`, `CAPTURED_FACE`, `REGISTERED_FACE`, checkout timing, employee details, biometric flags | Not secure: [SecureStorage.js](/Users/rajsubudhi/Desktop/ESSMobileApp/src/constants/SecureStorage.js) only JSON-serializes into AsyncStorage |
| MMKV | Current language and translation cache | Faster local storage; no encryption configuration found |
| Keychain / Android Keystore | `BiometricService.enableBiometric` writes `{userId, publicKey}` with service `com.ess.biometric` and `WHEN_UNLOCKED_THIS_DEVICE_ONLY` | Secure credential-store use; Android maps to Keystore-backed storage via the library |
| File system | temporary face JPEGs; downloaded logos/PDF-related assets; upload base64 reads | Face preprocessing cleanup is attempted, but temporary plaintext files exist during processing |
| SQLite | None found | APP_CONFIG comments reference SQLite, but no SQLite package/API/database exists |

`APP_CONFIG.STORAGE` definitions are in [APP_CONFIG.js](/Users/rajsubudhi/Desktop/ESSMobileApp/src/constants/APP_CONFIG.js). `CHECK_IN`, dates/timers, and background counters are operational and appropriately local; employee details and captured/registered face data are sensitive and should not be in the current AsyncStorage wrapper.

### 10. APP_CONFIG assessment

- `FACE`: input/thresholds/timeouts are used by Android `FaceRecognitionService`. Thresholds are security policy and should be server-controlled or remotely versioned; they are not secret.
- `STORAGE`: used by SecureStorage/HomeScreen/background code. Names are not secret; values may be sensitive.
- `TIMEOUTS`: local UX/reliability controls; non-sensitive and local.
- `SHIFT`: defaults used for shift/OT fallback; policy values should be server-controlled. The actual OT policy is fetched from server when possible.
- `BACKGROUND_SERVICE`: local Android notification/task cadence. Non-sensitive; local.
- `DEVICE`: hard-coded `Mobile App`, serial `1`, verification code `1`; these are not actual device identity and should not be trusted as server security controls.
- `IMAGE`: local capture/resize limits. Non-sensitive and local; the SQLite rationale is obsolete because SQLite is not present.

### 11. Android

- [AndroidManifest.xml](/Users/rajsubudhi/Desktop/ESSMobileApp/android/app/src/main/AndroidManifest.xml) declares internet, camera, coarse/fine location, foreground/data-sync service, notifications, biometric/fingerprint, exact alarms, wake lock, boot, and battery-optimization permissions. It removes broad media permissions and uses system picker support.
- It registers `RNBackgroundActionsTask` as `location|dataSync`.
- [MainActivity.kt](/Users/rajsubudhi/Desktop/ESSMobileApp/android/app/src/main/java/com/hrms/MainActivity.kt) is a standard ReactActivity only; no custom fingerprint/face native implementation exists.
- [MainApplication.kt](/Users/rajsubudhi/Desktop/ESSMobileApp/android/app/src/main/java/com/hrms/MainApplication.kt) uses package autolinking and optional new architecture.
- [android/app/build.gradle](/Users/rajsubudhi/Desktop/ESSMobileApp/android/app/build.gradle): min SDK 26, compile/target SDK 35, AndroidX biometric dependency, Firebase Google Services, 16-KB page-size packaging handling, and no release minification.

### 12. iOS

- [Info.plist](/Users/rajsubudhi/Desktop/ESSMobileApp/ios/hrms/Info.plist) declares Face ID, camera, location-when-in-use, microphone, and photo-library purposes; background modes are remote notification and fetch. Location background mode is commented out.
- [AppDelegate.swift](/Users/rajsubudhi/Desktop/ESSMobileApp/ios/hrms/AppDelegate.swift) configures Firebase, APNS registration, foreground notification presentation, and React Native startup. It contains no LocalAuthentication implementation.
- [Podfile](/Users/rajsubudhi/Desktop/ESSMobileApp/ios/Podfile) enables Camera, FaceID, location-when-in-use, microphone, and photo-library permission pods. It disables Fabric/New Architecture.
- Face ID/Touch ID availability comes from `react-native-biometrics`/Keychain native libraries, but HomeScreen intentionally blocks fingerprint registration on iOS.