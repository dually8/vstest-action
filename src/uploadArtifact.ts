import * as core from '@actions/core';
import { create, UploadOptions } from '@actions/artifact';
import { findFilesToUpload } from './search';
import { getInputs } from './input-helper';
import { NoFileOptions } from './constants';

// New helper function to handle the case when no files are found
async function handleNoFilesFound(inputs: any, searchPath: string) {
  let message = `No files were found with the provided path: ${searchPath}. No artifacts will be uploaded.`;

  switch (inputs.ifNoFilesFound) {
    case NoFileOptions.warn:
      core.warning(message);
      break;
    case NoFileOptions.error:
      core.setFailed(message);
      break;
    case NoFileOptions.ignore:
      core.info(message);
      break;
  }
}

// New helper function to handle the artifact upload process
async function uploadArtifactProcess(inputs: any, searchResult: any) {
  const s = searchResult.filesToUpload.length === 1 ? '' : 's';
  core.info(`With the provided path, there will be ${searchResult.filesToUpload.length} file${s} uploaded`);
  core.debug(`Root artifact directory is ${searchResult.rootDirectory}`);

  if (searchResult.filesToUpload.length > 10000) {
    core.warning(`There are over 10,000 files in this artifact, consider creating an archive before upload to improve the upload performance.`);
  }

  const artifactClient = create();
  const options: UploadOptions = { continueOnError: false };
  if (inputs.retentionDays) {
    options.retentionDays = inputs.retentionDays;
  }

  const uploadResponse = await artifactClient.uploadArtifact(
    inputs.artifactName,
    searchResult.filesToUpload,
    searchResult.rootDirectory,
    options
  );

  if (uploadResponse.failedItems.length > 0) {
    core.setFailed(`An error was encountered when uploading ${uploadResponse.artifactName}. There were ${uploadResponse.failedItems.length} items that failed to upload.`);
  } else {
    core.info(`Artifact ${uploadResponse.artifactName} has been successfully uploaded`);
  }
}

export async function uploadArtifact() {
  try {
    const inputs = getInputs();
    const searchResult = await findFilesToUpload(inputs.searchPath);

    if (searchResult.filesToUpload.length === 0) {
      await handleNoFilesFound(inputs, inputs.searchPath);
    } else {
      await uploadArtifactProcess(inputs, searchResult);
    }
  } catch (err) {
    if (err instanceof Error) {
      core.setFailed(err.message);
    } else {
      core.setFailed(String(err));
    }
  }
}