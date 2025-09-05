import { parseArgs } from '@std/cli/parse-args';
import { androidpublisher_v3 } from '@googleapis/androidpublisher';
import { GoogleAuth } from 'google-auth-library';
import { createReadStream } from 'node:fs';

// Define CLI options
const VALID_TRACKS = ['internal', 'alpha', 'beta', 'production'];

// Help text
const HELP_TEXT = `
Android App Bundle Uploader

Upload Android App Bundle (.aab) files to Google Play Console.

USAGE:
    upload-android-app-to-google-play [OPTIONS]

OPTIONS:
    --aab-file <PATH>           Path to the Android App Bundle (.aab) file [REQUIRED]
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
`;

// Parse command line arguments
const args = parseArgs(Deno.args, {
  string: ['aab-file', 'package-name', 'service-account', 'track'],
  boolean: ['help'],
  default: {
    track: 'internal'
  }
});

// Show help if requested or no arguments provided
if (args.help || Deno.args.length === 0) {
  console.log(HELP_TEXT);
  Deno.exit(0);
}

// Validate required arguments
const aabFile = args['aab-file'];
const packageName = args['package-name'];
const serviceAccount = args['service-account'];
const track = args.track;

if (!aabFile) {
  console.error('❌ Error: --aab-file is required');
  console.error('Use --help for usage information');
  Deno.exit(1);
}

if (!packageName) {
  console.error('❌ Error: --package-name is required');
  console.error('Use --help for usage information');
  Deno.exit(1);
}

if (!serviceAccount) {
  console.error('❌ Error: --service-account is required');
  console.error('Use --help for usage information');
  Deno.exit(1);
}

// Validate track parameter
if (!VALID_TRACKS.includes(track)) {
  console.error(`❌ Error: Invalid track "${track}". Must be one of: ${VALID_TRACKS.join(', ')}`);
  Deno.exit(1);
}

// Verify files exist
try {
  await Deno.stat(aabFile);
} catch {
  console.error(`❌ Error: AAB file not found: ${aabFile}`);
  Deno.exit(1);
}

try {
  await Deno.stat(serviceAccount);
} catch {
  console.error(`❌ Error: Service account JSON file not found: ${serviceAccount}`);
  Deno.exit(1);
}

console.log(`🚀 Starting upload process...`);
console.log(`   AAB file: ${aabFile}`);
console.log(`   Package: ${packageName}`);
console.log(`   Track: ${track}`);
console.log(`   Service account: ${serviceAccount}`);
console.log('');

try {
  // Initialize Google Auth with service account
  const auth = new GoogleAuth({
    keyFile: serviceAccount,
    scopes: ['https://www.googleapis.com/auth/androidpublisher'],
  });

  // Create Android Publisher client
  const androidPublisherClient = new androidpublisher_v3.Androidpublisher({
    auth,
  });

  // Step 1: Create a new edit (draft)
  console.log('📝 Creating edit...');
  const editResponse = await androidPublisherClient.edits.insert({
    packageName,
    requestBody: {},
  });
  
  const editId = editResponse.data.id!;
  console.log(`   Edit created: ${editId}`);

  try {
    // Step 2: Upload the AAB bundle
    console.log('📦 Uploading AAB bundle...');
    const bundleResponse = await androidPublisherClient.edits.bundles.upload({
      packageName,
      editId,
      media: {
        mimeType: 'application/octet-stream',
        body: createReadStream(aabFile),
      },
    });

    const versionCode = bundleResponse.data.versionCode!;
    console.log(`   Bundle uploaded successfully. Version code: ${versionCode}`);

    // Step 3: Update the track with the new bundle
    console.log(`🎯 Updating track "${track}"...`);
    await androidPublisherClient.edits.tracks.update({
      packageName,
      editId,
      track,
      requestBody: {
        releases: [{
          versionCodes: [versionCode.toString()],
          status: 'completed',
        }],
      },
    });

    console.log(`   Track "${track}" updated with version ${versionCode}`);

    // Step 4: Commit the edit
    console.log('💾 Committing edit...');
    const commitResponse = await androidPublisherClient.edits.commit({
      packageName,
      editId,
    });

    console.log('');
    console.log('✅ Upload completed successfully!');
    console.log(`   Edit ID: ${commitResponse.data.id}`);
    console.log(`   Version code ${versionCode} is now available on the "${track}" track`);
    console.log('');
    console.log('📱 Next steps:');
    console.log('   1. Go to Google Play Console');
    console.log('   2. Review the release details');
    console.log('   3. Add release notes (if needed)');
    console.log('   4. Roll out the release to users');

  } catch (error) {
    // If anything fails after creating the edit, try to delete it
    console.error('🧹 Error during upload process, cleaning up...');
    try {
      await androidPublisherClient.edits.delete({
        packageName,
        editId,
      });
      console.log('   Edit deleted successfully');
    } catch (deleteError) {
      console.error('   Failed to delete edit:', deleteError);
    }
    throw error;
  }

} catch (error) {
  console.error('❌ Upload failed:');
  if (error instanceof Error) {
    console.error(`   ${error.message}`);
  } else {
    console.error('   ', error);
  }
  Deno.exit(1);
}
