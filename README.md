# XArchive — Android app

The XArchive web app (`app/src/main/assets/www/`) wrapped in a native Android WebView shell.

- Bundled offline: all app files ship inside the APK, served from `https://appassets.androidplatform.net/www/`
  so `localStorage` / IndexedDB work and persist like on the web.
- **Backup → Download file** opens the Android "Save to…" picker.
- **Backup → Copy data** uses the native clipboard.
- Artist/work links open in the phone's browser.
- Fonts load from Google Fonts when online; the system font is used offline.

## Build

Requires JDK 17+ and the Android SDK (platform 35, build-tools 35).

```sh
echo "sdk.dir=/path/to/android-sdk" > local.properties
./gradlew assembleRelease   # signed if keystore.properties exists, else unsigned
./gradlew assembleDebug     # debug-signed, installable
```

Release signing reads `keystore.properties` (not committed):

```
storeFile=xarchive-release.keystore
storePassword=...
keyAlias=xarchive
keyPassword=...
```

Keep the same keystore for every future build, otherwise Android will refuse to install updates
over the existing app (you would have to uninstall, which deletes the app's data).

To update the web app, replace the files in `app/src/main/assets/www/`, bump `versionCode` /
`versionName` in `app/build.gradle`, and rebuild.
