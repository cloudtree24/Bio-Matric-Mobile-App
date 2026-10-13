# Face Registration V1: Physical Device Checklist

Face detection and ONNX inference require a real Android or iOS device. The JavaScript and Android native build checks do not validate a camera sensor, ML Kit classification values, or the iOS resource bundle.

## Before testing

1. Copy `.env.example` to `.env` and set `API_BASE_URL` to an API endpoint reachable from the device. Do not commit `.env`.
2. Confirm the API enables face access for the Employee ID and Company ID used for testing.
3. Use portrait orientation and the front camera. The installed detector is limited to this V1 scenario.
4. Start Metro with `npx react-native start --reset-cache` from the repository root.

## Android

1. Connect a phone with USB debugging enabled, then run `npx react-native run-android`.
2. Open Register > Face Register, enter valid IDs, and approve the camera permission.
3. Confirm the guide rejects no face and multiple faces.
4. Complete the randomized blink, left-turn, and right-turn prompts. Confirm capture remains disabled by the flow until all prompts are complete.
5. Confirm a valid capture reaches the success screen and that the backend receives the existing Save and Enable requests.
6. Disable camera permission in Android settings and verify the preparation screen explains that permission is required.
7. Simulate an Enable API failure after a successful Save request. Confirm the activation-pending screen retries only the Enable API.

## iOS status: build blocker

The current iOS app does not compile with React Native 0.87 and the latest published `onnxruntime-react-native` (1.24.3). Xcode reports:

```text
OnnxruntimeModule.mm:30:5: error: unknown type name 'RCTCxxBridge'
OnnxruntimeModule.mm:35:58: error: property 'runtime' not found on object of type 'RCTBridge *'
```

The published ONNX bridge still uses the legacy `RCTCxxBridge` runtime installation API, which React Native 0.87 has removed. This must be resolved by either migrating the ONNX bridge to the React Native 0.87 TurboModule JSI API or changing the React Native/ONNX Runtime compatibility baseline. Do not attempt iOS physical enrollment until one of those scoped changes is made.

## iOS verification after the blocker is resolved

1. In `ios`, run `pod install` after pulling native dependency changes, then open `hrms.xcworkspace` in Xcode.
2. Build and run on a physical iPhone. Confirm the system displays the camera-usage description.
3. Repeat the Android functional checks, including denied permission, no/multiple faces, liveness, success, and activation retry.
4. If model loading fails, verify `mobilefacenet.onnx` appears under the hrms target's Copy Bundle Resources and rebuild the app.

## Privacy verification

1. Do not capture screenshots or logs containing the face image, embedding, API authorization, or complete biometric payload.
2. Inspect Android Logcat and Xcode logs during enrollment. There must be no base64 image, embedding, token, or payload logging from this feature.
3. After an enrollment, confirm only the non-biometric registration flags are stored in Keychain; images and embeddings must not remain in cache or storage.

## Known V1 boundary

This build enrolls a face only. Multi-user face identification/login and attendance Check-In/Check-Out remain deferred until their backend contracts are available.

## Three-sample registration and company identification

- JavaScript client sends exactly three cropped JPEG images and three raw Float32 Base64 embeddings in one request. Optional employee name comes from enrollment.
- `src/services/FaceApiService.js` owns routes. Set `FACE_REGISTRATION_ROUTE` and `FACE_EMPLOYEES_ROUTE` in the native environment configuration and rebuild. Defaults are `/EmployeeBiomatricRegister/SaveEmployeeImageStringFormat` and `/api/EmployeeFace/GetByCompany/{companyId}`.
- The old backend does not support this payload. Deploy backend support before end-to-end registration testing; the client deliberately does not discard two samples or silently fall back to single-face saving.
- Successful registration invalidates the company cache and uses the existing attendance activation endpoint. Identification is a test screen and does not submit attendance automatically.
- Company faces are fetched once, decoded once, and retained in memory. Call `invalidateFaceCache(companyId)` to refresh after external enrollment changes.
- Both paths detect again on the orientation-normalized still photo, require exactly one face, crop its bounds, then use the existing 112×112 RGB/NCHW `pixel / 127.5 - 1` pipeline and L2-normalized MobileFaceNet output. Both use the same bounds crop with no separate landmark alignment.
- Tune `FACE_CONFIG.matchThreshold` (default 0.75), registration consistency threshold, and processing interval (400 ms). Inference is serialized; actual cadence depends on device capture and inference speed.
- On Android and iOS, verify photo orientation and crop location, zero/multiple-face rejection during capture, three-sample progress, same-person rejection, one save request, activation retry, company isolation, best of three matching, no per-frame network calls, and matching stops after success until Test again.
