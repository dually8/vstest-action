import * as core from '@actions/core';
import * as exec from '@actions/exec';
import * as path from 'path';
import {uploadArtifact} from './uploadArtifact'
import {getTestAssemblies} from './getTestAssemblies'
import {getArguments} from './getArguments'
import {getVsTestPath} from './getVsTestPath'

export async function run() {
  try {
    let testFiles = await getTestAssemblies();
    if(testFiles.length == 0) {
      throw new Error('No matched test files!')
    }

    core.debug(`Matched test files are:`)
    testFiles.forEach(function (file) {
      core.debug(`${file}`)
    });

    core.info(`Downloading test tools...`);
    let workerZipPath = path.join(__dirname, 'win-x64.zip')
    await exec.exec(`pwsh`, ['-Command', 'Invoke-WebRequest', '-Uri', 'https://aka.ms/local-worker-win-x64', '-OutFile', `${workerZipPath}`]);

    core.info(`Unzipping test tools...`);
    core.debug(`workerZipPath is ${workerZipPath}`);
    await exec.exec(`pwsh`, ['-Command', 'Expand-Archive', '-Path', `${workerZipPath}`, '-DestinationPath', `${__dirname}`]);

    let vsTestPath = getVsTestPath();
    core.debug(`VsTestPath: ${vsTestPath}`);

    let args = getArguments();
    core.debug(`Arguments: ${args}`);

    core.info(`Running tests...`);
    await exec.exec(`${vsTestPath} ${testFiles.join(' ')} ${args} /Logger:TRX`);
  } catch (err) {
    if (err instanceof Error) {
      core.setFailed(err.message);
    } else {
      core.setFailed(String(err));
    }
  }

  // Always attempt to upload test result artifact
  try {
    await uploadArtifact();
  } catch (err) {
    if (err instanceof Error) {
      core.setFailed(err.message);
    } else {
      core.setFailed(String(err));
    }
  }
}

run()