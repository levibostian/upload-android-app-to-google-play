# Android App Bundle Uploader

A simple CLI tool for uploading Android App Bundle (.aab) files to Google Play. Designed to be run on a CI, but can also be run locally. 

## Getting started 

1. **Create a Service Account and have a `service-account.json` file ready.** I suggest following the Setup instructions [in these docs](https://docs.fastlane.tools/actions/upload_to_play_store/) to successfully create a Service Account and provide the permissions required. 

2. **Build Android app to create a .aab file.** Ensure the AAB file is signed and ready for upload. 

3. **Run the upload script.** `upload-android-app-to-google-play --aab-file app-release.aab --package-name com.example.myapp --service-account service-account.json --track alpha`

### Options:

- `--aab-file <PATH>`: Path to your Android App Bundle (.aab) file [REQUIRED]
- `--package-name <NAME>`: Package name of your Android application (e.g., `com.example.myapp`) [REQUIRED]
- `--service-account <PATH>`: Path to your Google service account JSON key file [REQUIRED]
- `--track <TRACK>`: Release track - one of: `internal`, `alpha`, `beta`, `production`. Defaults to `internal`
- `--help, -h`: Show help message
