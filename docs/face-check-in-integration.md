# Face identification → attendance integration

`src/components/FaceCheckIn.js` is a separate production integration component. `FaceCheckInTestScreen.js` remains identification-only. Mount the component from the authenticated attendance host:

```jsx
<FaceCheckIn
  key={`${companyId}-${cameraSessionId}`}
  companyId={companyId}
  checkLocation={checkMatchedEmployeeLocation}
  onCancel={closeCamera}
/>
```

Supply a stable callback `checkMatchedEmployeeLocation(employeeId, companyId)` returning the existing location result `{inside, message}`. It must check the matched employee's geofence, not the logged-in employee's. Missing company/location context fails closed. Configure this app's existing `apiClient` token before opening the component. This repository has no production attendance host, authentication login implementation, or location service; these dependencies cannot be silently substituted with test IDs or skipped checks.

The inspected local reference implementation is `/Users/rajsubudhi/Desktop/ESSMobileApp/src/constants/ApiService.js` (`ApiService.saveAttendance`) and `/Users/rajsubudhi/Desktop/ESSMobileApp/src/screens/HomeScreen.js` (`buildAttendancePayload`, `handleCheckInWithBiometric`). `attendanceApi.saveAttendance` ports that confirmed endpoint and success handling to this app's existing client. It posts `/BiomatricAttendance/SaveAttenance` using `EmployeeId` and `EmployeeCode` from the current match, local date/time, direction `In`, and the reference device fields. The source module cannot be imported directly across the separate React Native projects.

`createFaceCheckInController.identify` accepts only a successful threshold/gap result, freezes that identity, and invokes its internal `submit` function automatically. `submit` checks matched-employee location and calls `saveAttendance`. An in-flight promise and retained verified identity block duplicates. Frames never retry a failed submission; the explicit retry button resubmits the same employee and payload. Backend failures, including already-checked-in responses, are displayed without reclassifying face verification as failed. No automatic network retry is performed. A timeout can mean the backend committed the first request; the backend must enforce its existing duplicate check-in rules on explicit retries.

Success pauses recognition and shows employee name, ID, score, and `Check-In Successful`. Failure also pauses recognition, preserves identity, and offers attendance-only retry. Remount for a new camera session after closing; never remount the component during an in-flight submission.

Device validation still required: authenticated request headers, actual attendance responses, matched-employee geofence callback, photo/ONNX performance, successful and failed check-in UI, already-checked-in handling, and uncertain timeout retries. Existing shift/background-service/local-state side effects from ESSMobileApp are not present in this repository and are not recreated here.
