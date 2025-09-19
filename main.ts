import { parseArgs } from "@std/cli/parse-args";
import { androidpublisher_v3 } from "@googleapis/androidpublisher";
import { GoogleAuth } from "google-auth-library";
import { createReadStream } from "node:fs";

// Define CLI options
const VALID_TRACKS = ["internal", "alpha", "beta", "production"];

// Help text
const HELP_TEXT = `
Android App Bundle Uploader

Upload Android App Bundle (.aab) files to Google Play Console.

USAGE:
    upload-android-app-to-google-play [OPTIONS]
    upload-android-app-to-google-play auth-check [OPTIONS]

COMMANDS:
    auth-check                  Test authentication with Google Play Console API

OPTIONS:
    --aab-file <PATH>           Path to the Android App Bundle (.aab) file [REQUIRED for upload]
    --package-name <NAME>       Package name of the Android application [REQUIRED]
    --service-account <PATH>    Path to the Google service account JSON file [REQUIRED]
    --track <TRACK>             Release track (internal, alpha, beta, production) [default: internal]
    --help, -h                  Show this help message

EXAMPLES:
    # Upload to internal track (default)
    upload-android-app-to-google-play \\
        --aab-file app-release.aab \\
        --package-name com.example.myapp \\
        --service-account service-account.json

    # Upload to alpha track
    upload-android-app-to-google-play \\
        --aab-file app-release.aab \\
        --package-name com.example.myapp \\
        --service-account service-account.json \\
        --track alpha

    # Test authentication
    upload-android-app-to-google-play auth-check \\
        --package-name com.example.myapp \\
        --service-account service-account.json
`;

// Check if first argument is a command
const isAuthCheck = Deno.args[0] === "auth-check";

// Parse command line arguments (skip first arg if it's a command)
const argsToProcess = isAuthCheck ? Deno.args.slice(1) : Deno.args;
const args = parseArgs(argsToProcess, {
  string: ["aab-file", "package-name", "service-account", "track"],
  boolean: ["help"],
  default: {
    track: "internal",
  },
});

// Show help if requested or no arguments provided
if (args.help || Deno.args.length === 0) {
  console.log(HELP_TEXT);
  Deno.exit(0);
}

// Validate required arguments
const aabFile = args["aab-file"];
const packageName = args["package-name"];
const serviceAccount = args["service-account"];
const track = args.track;

// For regular upload, aab-file is required; for auth-check, it's not
if (!isAuthCheck && !aabFile) {
  console.error("❌ Error: --aab-file is required");
  console.error("Use --help for usage information");
  Deno.exit(1);
}

if (!packageName) {
  console.error("❌ Error: --package-name is required");
  console.error("Use --help for usage information");
  Deno.exit(1);
}

if (!serviceAccount) {
  console.error("❌ Error: --service-account is required");
  console.error("Use --help for usage information");
  Deno.exit(1);
}

// Validate track parameter
if (!VALID_TRACKS.includes(track)) {
  console.error(
    `❌ Error: Invalid track "${track}". Must be one of: ${
      VALID_TRACKS.join(", ")
    }`,
  );
  Deno.exit(1);
}

// Verify files exist
if (!isAuthCheck && aabFile) {
  try {
    await Deno.stat(aabFile);
  } catch {
    console.error(`❌ Error: AAB file not found: ${aabFile}`);
    Deno.exit(1);
  }
}

try {
  await Deno.stat(serviceAccount);
} catch {
  console.error(
    `❌ Error: Service account JSON file not found: ${serviceAccount}`,
  );
  Deno.exit(1);
}

try {
  // Initialize Google Auth with service account
  const auth = new GoogleAuth({
    keyFile: serviceAccount,
    scopes: ["https://www.googleapis.com/auth/androidpublisher"],
  });

  // Create Android Publisher client
  const androidPublisherClient = new androidpublisher_v3.Androidpublisher({
    auth,
  });

  if (isAuthCheck) {
    // Auth check flow
    console.log("🔐 Testing authentication...");
    console.log(`   Package: ${packageName}`);
    console.log(`   Service account: ${serviceAccount}`);
    console.log("");

    console.log("📞 Calling Google Play Console API...");
    // params dont really matter. we're just testing the response code is 200 meaning auth is good. 
    const response = await androidPublisherClient.generatedapks.list({
      packageName,      
      versionCode: 1
    });

    if (response.status == 200) {
      console.log("✅ Authentication successful!");
      console.log(`   Successfully connected to Google Play Console API`);

      Deno.exit(0);
    } else {
      console.error("❌ Authentication failed:");
      console.error(`   ${response.status} ${response.statusText}`);

      Deno.exit(1);
    }
  }

  // Upload flow
  console.log(`🚀 Starting upload process...`);
  console.log(`   AAB file: ${aabFile}`);
  console.log(`   Package: ${packageName}`);
  console.log(`   Track: ${track}`);
  console.log(`   Service account: ${serviceAccount}`);
  console.log("");

  // Step 1: Create a new edit (draft)
  console.log("📝 Creating edit...");
  const editResponse = await androidPublisherClient.edits.insert({
    packageName,
    requestBody: {},
  });

  const editId = editResponse.data.id!;
  console.log(`   Edit created: ${editId}`);

  try {
    // Step 2: Upload the AAB bundle
    console.log("📦 Uploading AAB bundle...");
    const bundleResponse = await androidPublisherClient.edits.bundles.upload({
      packageName,
      editId,
      media: {
        mimeType: "application/octet-stream",
        body: createReadStream(aabFile!),
      },
    });

    const versionCode = bundleResponse.data.versionCode!;
    console.log(
      `   Bundle uploaded successfully. Version code: ${versionCode}`,
    );

    // Step 3: Update the track with the new bundle
    console.log(`🎯 Updating track "${track}"...`);
    await androidPublisherClient.edits.tracks.update({
      packageName,
      editId,
      track,
      requestBody: {
        releases: [{
          versionCodes: [versionCode.toString()],
          status: "completed",
        }],
      },
    });

    console.log(`   Track "${track}" updated with version ${versionCode}`);

    // Step 4: Commit the edit
    console.log("💾 Committing edit...");
    const commitResponse = await androidPublisherClient.edits.commit({
      packageName,
      editId,
    });

    console.log("");
    console.log("✅ Upload completed successfully!");
    console.log(`   Edit ID: ${commitResponse.data.id}`);
    console.log(
      `   Version code ${versionCode} is now available on the "${track}" track`,
    );
    console.log("");
    console.log("📱 Next steps:");
    console.log("   1. Go to Google Play Console");
    console.log("   2. Review the release details");
    console.log("   3. Add release notes (if needed)");
    console.log("   4. Roll out the release to users");
  } catch (error) {
    // If anything fails after creating the edit, try to delete it
    console.error("🧹 Error during upload process, cleaning up...");
    try {
      await androidPublisherClient.edits.delete({
        packageName,
        editId,
      });
      console.log("   Edit deleted successfully");
    } catch (deleteError) {
      console.error("   Failed to delete edit:", deleteError);
    }
    throw error;
  }
} catch (error) {
  const operation = isAuthCheck ? "Authentication check" : "Upload";
  console.error(`❌ ${operation} failed:`);
  if (error instanceof Error) {
    console.error(`   ${error.message}`);
  } else {
    console.error("   ", error);
  }
  Deno.exit(1);
}
