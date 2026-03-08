# Awaj — Android TWA Wrapper

This directory contains a Trusted Web Activity (TWA) wrapper that packages the Awaj website as a native Android app.

## How it works

The Android app loads `https://awaj.eu.cc/` in fullscreen using Chrome's Trusted Web Activity. No website files are bundled — the app always loads the live site, so updates appear instantly.

## Building

### Automated (GitHub Actions)
Push changes to the `android-twa/` directory or trigger the workflow manually from the Actions tab. The workflow builds both APK and AAB files and uploads them as artifacts.

### Manual (local)
```bash
# Install Bubblewrap
npm install -g bubblewrap

# Generate keystore (first time only)
keytool -genkeypair -alias awaj -keypass android -keystore android.keystore \
  -storepass android -dname "CN=Awaj,O=Awaj,L=Dhaka,C=BD" -validity 10000 \
  -keyalg RSA -keysize 2048

# Initialize and build
cd android-twa
npx bubblewrap init --manifest twa-manifest.json
npx bubblewrap build --skipPwaValidation
```

## Google Play Publishing

1. Build the AAB using the workflow or locally
2. Get your signing key SHA-256 fingerprint:
   ```bash
   keytool -list -v -keystore android.keystore -alias awaj -storepass android
   ```
3. Update `public/.well-known/assetlinks.json` with the fingerprint
4. Upload the AAB to Google Play Console
5. For production, use a proper signing key (not the debug one)

## Digital Asset Links

The file `public/.well-known/assetlinks.json` must be served at:
```
https://sky-post-clone.lovable.app/.well-known/assetlinks.json
```

Replace the `TODO` placeholder with your actual signing key SHA-256 fingerprint. Without this, Chrome will show the URL bar instead of fullscreen mode.
