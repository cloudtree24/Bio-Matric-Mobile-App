## HRMS React Native CLI — Figma UI Implementation Prompt

I have an existing **React Native CLI project** named `hrms`.

The project is already created and running successfully on Android.

### Current project status

* React Native CLI project already exists.
* Android build is working.
* Do **not** create a new React Native project.
* Do **not** add API logic.
* Do **not** add biometric/camera/fingerprint functionality yet.
* For now, implement **only UI design + simple screen-to-screen navigation**.
* Navigation should only move between screens when buttons are pressed.
* Use the provided Figma screenshot as the main visual reference.

The goal of this phase is to first build the complete **Figma UI prototype**. Real API, face recognition, fingerprint authentication, attendance logic, database, and backend integration will be implemented later.

---

# 1. First inspect the existing project

Before making changes:

* Check `package.json`
* Check React Native version
* Check existing `App.js`
* Check existing `android` configuration
* Check existing `ios` configuration
* Check which packages are already installed
* Reuse existing packages wherever possible
* Do not remove existing working dependencies
* Do not upgrade React Native unnecessarily
* Do not change Gradle/Android configuration unless absolutely required

The project should use:

```text
Node.js 20.20.2
```

---

# 2. Required packages

Check whether these packages are already installed:

```text
react-native-vector-icons: ^10.2.0
react-native-reanimated: ^3.17.4
react-native-safe-area-context: ^5.8.0
react-native-picker-select: ^9.3.1
@react-navigation/native
@react-navigation/native-stack
```

If any required package is missing, install it.

Do **not** reinstall packages that are already correctly installed.

After installation, verify that the project still builds.

---

# 3. Important scope for this phase

### Implement ONLY:

* UI
* Figma design
* Screen layouts
* Images/icons
* Buttons
* Text
* Cards
* Colors
* Spacing
* Simple navigation
* Basic temporary UI states

### Do NOT implement yet:

* Face recognition
* Camera processing
* Fingerprint authentication
* Biometric matching
* Employee API
* Attendance API
* Login API
* Database
* Backend
* Redux/business logic
* Authentication
* Real employee verification
* Real attendance submission

If a biometric or API screen is shown in Figma, create the **visual UI only**.

For example:

```text
Fingerprint Scan
```

should visually show the fingerprint screen, but it should **not actually scan a fingerprint**.

---

# 4. Brand colors

Use these exact brand colors throughout the application:

```text
Dark Green:  #224F2B
Primary Green: #06C168
White:       #FFFFFF
Light Green: #F2FFF0
```

Use:

```text
#224F2B
```

for major branding/text elements.

Use:

```text
#06C168
```

for primary buttons, active states, icons, success indicators, and important actions.

Use:

```text
#FFFFFF
```

for cards and clean backgrounds where required.

Use:

```text
#F2FFF0
```

as the main light-green screen/background color where it matches the Figma design.

Do not introduce random colors unless required for an error/warning state.

---

# 5. Create a clean folder structure

Use a simple and maintainable structure:

```text
hrms/
│
├── android/
├── ios/
│
├── src/
│   │
│   ├── assets/
│   │   ├── images/
│   │   ├── icons/
│   │   └── fonts/
│   │
│   ├── components/
│   │   ├── PrimaryButton.js
│   │   ├── SecondaryButton.js
│   │   ├── Header.js
│   │   └── BiometricCard.js
│   │
│   ├── constants/
│   │   ├── colors.js
│   │   └── routes.js
│   │
│   ├── navigation/
│   │   └── AppNavigator.js
│   │
│   └── screens/
│       ├── Splash/
│       │   └── SplashScreen.js
│       │
│       ├── Employee/
│       │   └── EmployeeSubmitScreen.js
│       │
│       ├── Face/
│       │   ├── FaceRegisterScreen.js
│       │   ├── FaceRegisterSuccessScreen.js
│       │   └── FaceLoginScreen.js
│       │
│       ├── Fingerprint/
│       │   ├── FingerprintSelectScreen.js
│       │   ├── FingerprintRegisterScreen.js
│       │   └── FingerprintSuccessScreen.js
│       │
│       └── Admin/
│           ├── AdminSubmitScreen.js
│           ├── AdminDashboardScreen.js
│           └── AttendanceScreen.js
│
└── App.js
```

Keep the structure simple.

Do not create unnecessary folders or architecture for this UI-only phase.

---

# 6. Navigation flow based on Figma

Create simple navigation matching the Figma prototype.

Main employee flow:

```text
Splash
   ↓
Employee Submit
   ↓
Register
   ↓
Face Register
   ↓
Face Register Success
   ↓
Fingerprint Select
   ↓
Fingerprint Register
   ↓
Fingerprint Success
```

Face login flow:

```text
Face Login
   ↓
Face Verification UI
   ↓
Success / Retry UI
```

Admin flow:

```text
Admin Submit
   ↓
Admin Dashboard
   ↓
Attendance
```

At this stage, navigation can use buttons with dummy actions.

Example:

```text
Register
```

button navigates to the next screen.

No actual registration logic is required.

---

# 7. Phase 1 — Splash Screen

Implement the **Splash Screen first**.

This is the first screen that should appear when the app starts.

### Design requirement

Based on the provided Figma:

* Use the light-green background.
* Show the **THECLOUDTREE.AI logo/image in the exact center of the screen**.
* Use the actual logo asset if it is available.
* Do not recreate the logo using text if an image asset is available.
* Keep the logo proportionally correct.
* Do not stretch or distort the logo.
* The logo should be vertically and horizontally centered.
* Keep the screen clean with no unnecessary buttons or text.

Background:

```text
#F2FFF0
```

Logo should be centered:

```text
┌──────────────────────────┐
│                          │
│                          │
│      THECLOUDTREE.AI     │
│          LOGO            │
│                          │
│                          │
└──────────────────────────┘
```

### Splash navigation

For now, after a short delay such as 1–2 seconds:

```text
Splash
   ↓
Employee Submit
```

Use simple React Native navigation.

Do not implement authentication or API checks.

---

# 8. Logo asset

If the logo file already exists in the project:

* Reuse it.
* Do not duplicate it.
* Do not modify the original asset.

If the logo is not available:

* Create the required `src/assets/images/` folder.
* Use a placeholder image only temporarily.
* Clearly structure the code so the real Figma logo can be replaced easily.

Do not generate a fake logo using random text.

---

# 9. Splash Screen implementation requirements

Use:

```text
SafeAreaView
Image
View
```

and responsive styling.

Do not use fixed absolute screen coordinates.

Use:

```text
flex: 1
justifyContent: 'center'
alignItems: 'center'
```

for the main logo container.

The splash screen must work correctly on different Android screen sizes.

---

# 10. Create centralized colors

Create:

```text
src/constants/colors.js
```

Use:

```js
export const COLORS = {
  darkGreen: '#224F2B',
  primary: '#06C168',
  white: '#FFFFFF',
  lightGreen: '#F2FFF0',
};
```

All screens should import colors from this file instead of repeatedly writing hex values.

---

# 11. Navigation setup

Create:

```text
src/navigation/AppNavigator.js
```

Use:

```text
@react-navigation/native
@react-navigation/native-stack
```

Create route names in:

```text
src/constants/routes.js
```

Example:

```text
SPLASH
EMPLOYEE_SUBMIT
FACE_REGISTER
FACE_REGISTER_SUCCESS
FINGERPRINT_SELECT
FINGERPRINT_REGISTER
FINGERPRINT_SUCCESS
FACE_LOGIN
ADMIN_SUBMIT
ADMIN_DASHBOARD
ATTENDANCE
```

Do not hardcode route strings throughout the application.

---

# 12. App.js

Keep `App.js` very simple.

It should only load the navigation:

```text
App.js
   ↓
AppNavigator
   ↓
SplashScreen
```

Do not put UI code or business logic into `App.js`.

---

# 13. Figma design rules

Use the uploaded Figma screenshot as the visual reference.

Match the Figma as closely as possible:

* Overall layout
* Screen proportions
* Background color
* Logo placement
* Green branding
* Button shape
* Button height
* Border radius
* Typography
* Icon placement
* Card layout
* Padding
* Margins
* Alignment
* Illustration placement

Do not redesign the application.

The goal is:

```text
Figma Design
      ↓
React Native UI
      ↓
As close as possible visually
```

---

# 14. Reusable components

Create reusable components only when they are actually needed.

For example:

```text
PrimaryButton
SecondaryButton
Header
BiometricCard
```

Do not duplicate the same button styles across every screen.

Primary button should use:

```text
Background: #06C168
Text: #FFFFFF
```

---

# 15. No business logic

This is extremely important.

For this phase:

```text
Button Press
     ↓
Navigation
```

Only.

For example:

```text
Register Face
```

should simply navigate to:

```text
Face Register Screen
```

It should not:

* Open the camera
* Detect a face
* Call an API
* Save employee data
* Save biometric data

Those features will be added in a later phase.

---

# 16. Build and test after Phase 1

After implementing the Splash Screen and navigation:

```bash
npm install
```

Then:

```bash
cd android
./gradlew clean
cd ..
```

Start Metro:

```bash
npx react-native start --reset-cache
```

In another terminal:

```bash
adb reverse tcp:8081 tcp:8081
```

Then:

```bash
npx react-native run-android
```

Verify:

```text
App Launch
    ↓
Splash Screen
    ↓
THECLOUDTREE.AI logo centered
    ↓
Employee Submit Screen
```

---

# 17. Do not implement the remaining Figma screens yet

For the first step, **only implement the Splash Screen + basic navigation foundation**.

Do not jump directly into:

* Face registration
* Fingerprint
* Admin dashboard
* Attendance
* APIs
* Camera
* Biometric logic

After the Splash Screen is correctly matched with Figma and navigation works, continue screen-by-screen.

### First milestone

The final result of this task should be:

```text
hrms
│
├── App.js
│
├── src/
│   ├── assets/
│   │   └── images/
│   │       └── cloudtree-logo
│   │
│   ├── constants/
│   │   ├── colors.js
│   │   └── routes.js
│   │
│   ├── navigation/
│   │   └── AppNavigator.js
│   │
│   └── screens/
│       └── Splash/
│           └── SplashScreen.js
│
└── android/
```

And the app should show:

```text
┌──────────────────────────┐
│                          │
│                          │
│                          │
│     THECLOUDTREE.AI      │
│          LOGO            │
│                          │
│                          │
│                          │
└──────────────────────────┘
```

with:

```text
Background = #F2FFF0
Logo = centered
```

**Start with this Phase 1 only. Once it is working, implement the next Figma screen.**

If any package required for the implementation is missing, **install only that package and continue**. Do not unnecessarily modify the existing React Native/Android setup.
