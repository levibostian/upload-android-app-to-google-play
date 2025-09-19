# Android App Bundle Uploader

A simple CLI tool for uploading Android App Bundle (.aab) files to Google Play. Designed to be run on a CI, but can also be run locally. 

## Getting started 

1. **Install the CLI.** 

```bash
# Install a specific version of the tool (recommended for teams)
curl -fsSL https://github.com/levibostian/upload-android-app-to-google-play/blob/HEAD/install?raw=true | bash "1.0.0"

# To always install the latest version (not recommended for teams):
# curl -fsSL https://github.com/levibostian/upload-android-app-to-google-play/blob/HEAD/install?raw=true | bash
```

1. **Create a Service Account and have a `service-account.json` file ready.** I suggest following the Setup instructions [in these docs](https://docs.fastlane.tools/actions/upload_to_play_store/) to successfully create a Service Account and provide the permissions required. 

2. **Build Android app to create a .aab file.** Ensure the AAB file is signed and ready for upload. 

3. **Run the upload script.** `./upload-android-app-to-google-play --aab-file app-release.aab --package-name com.example.myapp --service-account service-account.json --track alpha`

### Options:

- `--aab-file <PATH>`: Path to your Android App Bundle (.aab) file [REQUIRED]
- `--package-name <NAME>`: Package name of your Android application (e.g., `com.example.myapp`) [REQUIRED]
- `--service-account <PATH>`: Path to your Google service account JSON key file [REQUIRED]
- `--track <TRACK>`: Release track - one of: `internal`, `alpha`, `beta`, `production`. Defaults to `internal`
- `--help, -h`: Show help message

# Why did I create this tool? 

When it comes to CI tools, I want to set it and forget it. I expect to be able to push code today and my CI server is going to work as I expect. 

When it comes to existing tools out there for uploading Android apps to Google Play from a CI server, I have been unsatisfied with the existing solutions. Existing tools... take too long to install, take too long to configure, can randomly fail at runtime, or are abandoned. 

So, I decided to build something. A tool that I can set it and forget it. The tool is a very small CLI wrapper around the Google Cloud SDK. We only rely on Google to maintain their SDK and their API that the SDK points to. The tool is also a compiled binary so as long as your operating system (Linux, macOS, Windows) is able to execute the binary and Google still supports the API endpoint the binary calls, it should work without any issues. No langs to install, no package manager, no dependencies/tools to install. 
