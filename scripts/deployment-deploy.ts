#!/usr/bin/env -S deno run --quiet --allow-all --no-lock

import $ from "jsr:@david/dax";
import { getDeployStepInput } from "jsr:@levibostian/decaf-sdk";

const input = getDeployStepInput();

const githubReleaseAssets: string[] = [];

const compileBinary = async (
  { denoTarget, outputFileName }: {
    denoTarget: string;
    outputFileName: string;
  },
) => {
  await $`OUTPUT_FILE_NAME=dist/${outputFileName} DENO_TARGET=${denoTarget} deno task compile`
    .printCommand();

  githubReleaseAssets.push(`dist/${outputFileName}#${outputFileName}`);
};

await compileBinary({
  denoTarget: "x86_64-unknown-linux-gnu",
  outputFileName: "bin-x86_64-Linux",
});

await compileBinary({
  denoTarget: "aarch64-unknown-linux-gnu",
  outputFileName: "bin-aarch64-Linux",
});

await compileBinary({
  denoTarget: "x86_64-apple-darwin",
  outputFileName: "bin-x86_64-Darwin",
});

await compileBinary({
  denoTarget: "aarch64-apple-darwin",
  outputFileName: "bin-aarch64-Darwin",
});

const argsToCreateGithubRelease = [
  `release`,
  `create`,
  input.nextVersionName,
  `--generate-notes`,
  `--latest`,
  `--target`,
  "main",
  ...githubReleaseAssets,
];

if (input.testMode) {
  console.log("Running in test mode, skipping creating GitHub release.");
  console.log(
    `Command to create GitHub release: gh ${
      argsToCreateGithubRelease.join(" ")
    }`,
  );

  Deno.exit(0);
}

// Create the GitHub release with the compiled binaries
// https://github.com/dsherret/dax#providing-arguments-to-a-command
await $`gh ${argsToCreateGithubRelease}`.printCommand();
