Build the attached web app (zip) into an installable Android APK. Follow this spec exactly; it is based on a previous build where these issues came up and were fixed.

## Environment
- The Android SDK downloads from dl.google.com. If that host is blocked by the network policy, set up a cloud environment that allows `dl.google.com` before doing anything else (package registries, maven.google.com, Maven Central and services.gradle.org must also be reachable).
- Install the command-line tools to /opt/android-sdk, accept licenses, then install `platforms;android-35` and `build-tools;35.0.0`. Use the Gradle wrapper (8.14.3) with AGP 8.13.x, Java source/target 17, plain Java (no Kotlin).

## Project
- Native Android project in the repo root. Package / applicationId: `com.xarchive.app` (keep this unchanged so new builds install as updates over the old app). App label: taken from the web manifest `name`. minSdk 24, targetSdk 35, compileSdk 35.
- If I attach `xarchive-release.keystore` + `keystore.properties`, sign the release build with them (read via keystore.properties, both gitignored, never committed). Otherwise create a new keystore, give it to me and warn me to keep it. Set `versionCode` higher than any build I have installed (ask me if unsure; use a high number like 10 if I don't know).
- Put all web files in `docs/` at the repo root (served by GitHub Pages from the /docs folder) and add `assets.srcDirs += [rootProject.file('docs')]` in app/build.gradle so the same files are the APK assets; load `https://appassets.androidplatform.net/index.html`. Add an empty `docs/.nojekyll`.
- Dependency: `androidx.webkit:webkit`. Single `MainActivity extends Activity` with a WebView.
- Serve the assets via `WebViewAssetLoader` at `https://appassets.androidplatform.net/index.html` (NOT file://), so localStorage/IndexedDB work and persist. Enable JavaScript, DOM storage and database storage.
- Launcher icon: adaptive icon using the maskable PNG as foreground wrapped in an `<inset android:inset="8%">`, background = the icon's edge colour; legacy mipmaps resized from the 512 icon. Theme: `Theme.Material.Light.NoActionBar` with window/status/nav bar colour = the manifest background_color (put windowLightNavigationBar in values-v27).

## Native bridge (inject a bridge.js with WebViewCompat.addDocumentStartJavaScript, fall back to evaluateJavascript in onPageStarted/onPageFinished)
- Downloads: override `HTMLAnchorElement.prototype.click` so `<a download>` with a blob:/data: href is read as base64 and passed to a `@JavascriptInterface saveFile(name, mime, base64)` that opens `ACTION_CREATE_DOCUMENT` and writes the bytes (toast on success).
- Clipboard: replace `navigator.clipboard.writeText` with a native `copyText()` via ClipboardManager.
- Service worker: stub `navigator.serviceWorker.register` to resolve (files are bundled).
- File inputs: implement `onShowFileChooser` with `params.createIntent()` + `onActivityResult`/`parseResult`.
- Links to other hosts (including target=_blank, with setSupportMultipleWindows(false)) open in the external browser via `shouldOverrideUrlLoading`.
- Back button: `webView.goBack()` if possible, else finish.

## System bars (this caused several broken builds, so do ALL of these)
1. Always lay out edge-to-edge on every Android version: `getWindow().setDecorFitsSystemWindows(false)` on API 30+, and `SYSTEM_UI_FLAG_LAYOUT_STABLE | LAYOUT_FULLSCREEN | LAYOUT_HIDE_NAVIGATION` below that.
2. Put the WebView inside a FrameLayout and apply the system bar + display cutout + IME insets as **padding on the FrameLayout** (padding on the WebView itself does nothing). Use `getInsets(systemBars()|displayCutout()|ime())` on API 30+, `getSystemWindowInset*` below.
3. Stop the page adding the same space again: in the bundled index.html remove `viewport-fit=cover` from the viewport meta and replace every `env(safe-area-inset-*)` with `0px`. Also do both at runtime in bridge.js (rewrite the viewport meta, and on DOMContentLoaded replace `env(safe-area-inset-…)` with `0px` in every `<style>` element), so a future drop-in of new web files still works.
Result: nothing covers the status bar or the gesture/3-button navigation, and there is no extra gap above the header.

## Verify, then deliver
- `./gradlew assembleRelease`, check with `apksigner verify --print-certs` (and that the certificate matches my keystore if I gave one) and `aapt dump badging`.
- Load the page in headless Chromium (Playwright) with bridge.js injected and a stubbed `XArchiveNative`: confirm no page errors, that Backup → Download file calls saveFile with the JSON, and that Copy data calls copyText.
- Send me the APK (named `<App>-<versionName>.apk`) and, if new, the keystore + keystore.properties. Commit the project (not the keystore or APK) with a README covering build, signing and how to update the web files, and push to the working branch.
