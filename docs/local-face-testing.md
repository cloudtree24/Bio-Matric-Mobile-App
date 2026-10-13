# Local face registration and matching

The registration and Face Check-In Test screens now use encrypted SQLite (SQLCipher) on this device, without registration, activation, or company-face API calls. The separate attendance integration still uses its backend.

Only embeddings and employee/company details are saved, not photos. Face embeddings and attendance records use encrypted SQLite via @op-engineering/op-sqlite. The random 256-bit database key is protected by react-native-keychain. Existing Keychain face and attendance arrays migrate together in a transaction; source records are removed only after commit. The former unencrypted AsyncStorage records are deleted on first use; register those employees again. Records are scoped to this app and device; platform backup/uninstall behavior depends on the operating system. Re-registering the same Employee ID in the same company replaces its samples.

1. Rebuild the Android app after adding the native SQLite and secure random dependencies: `npm run android` (use Node 22.13 or a compatible newer version).
2. Log in as admin and open Register User > Face Register.
3. Enter Employee ID `E1`, a name, and Company ID `C1`. Complete the three camera samples.
4. Return to registration and register a different person with Employee ID `E2`, their name, and the same Company ID `C1`.
5. Open Face Check-In Test, enter `C1`, and tap Start face test. Present either person; confirm their name and ID appear and Check-In Successful is shown after attendance is saved securely. No location check is performed. Tap Test again to match the other person.
6. Restart the app and repeat matching to verify persistence. Try a third, unregistered person and confirm no successful match appears.

A physical camera device is required. Local matching identifies a person and saves attendance on this device, without calling the attendance API. A second check-in for the same employee/company/date is reported as already checked in. Different employees have separate records. The existing iOS ONNX compatibility blocker described in the device checklist remains.

The server API modules remain separate: registration currently posts one employee object containing three faceImage/faceEmbedding samples; company-face fetching expects an array of employees matching the provided JSON. They are not called by this local flow, and live server compatibility has not been verified.

## Database layout and larger datasets

- `employees`: composite company/employee primary key, employee name, and three embedding samples. Re-registration updates only that employee.
- `attendance`: company/employee/date/direction primary key prevents duplicate daily check-ins. A company/date index supports history queries.
- `getLocalAttendance(companyId, {limit: 100, offset: 0})` reads a page; maximum page size is 1000.
- SQLCipher must be enabled in package.json (`op-sqlite.sqlcipher: true`). Initialization verifies cipher support and refuses an unencrypted build.
- Matching still compares the camera embedding against all employee embeddings in the selected company. SQLite reduces persistence overhead; identification cost remains linear in company size.
- iOS requires `bundle exec pod install` in `ios` and a native rebuild, after resolving the existing ONNX compatibility blocker.
- Automated database tests run real SQLite SQL through sql.js, with the mobile driver, Keychain, and cipher-version check mocked. They verify SQL semantics and migration, not native SQLCipher encryption.

## Manual registration fallback

On the face camera screen, tap **Use manual capture**, center one person, then tap **Capture face 1 of 3**, **2 of 3**, and **3 of 3**. This skips live blink/head-turn checks. Each still photo must still contain exactly one detected face, and all three embeddings must pass the same-person consistency check. Captures are processed serially; registration is saved only after three valid samples. Manual mode cannot bypass a disabled camera or a failing still-image detector.

The Android still-image detector patch unwraps Nitro's generated InputImage variant before passing its URI to ML Kit. This native fix requires rebuilding and installing the APK; Metro reload alone cannot apply it.
