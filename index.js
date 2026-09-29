#!/usr/bin/env node

import { Command } from 'commander';
import { collectAppName } from './helpers/appname.js';
import { languageSelect } from './helpers/language.js';
import { collectEntryFile } from './helpers/entry.js';
import { collectOutputFolder } from './helpers/output.js';
import { collectServerPort } from './helpers/port.js';
import path from 'path';
import copyTemplates from './helpers/copy.js';
import { fileURLToPath } from 'url';
import { installDependencies } from './helpers/install.js';
import { databaseOptions } from './helpers/database.js';
import {
  detectPackageManager,
  collectPackageManager,
} from './helpers/packageManager.js';
import chalk from 'chalk';

// mimic __dirname in ESM
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const program = new Command();

program.version('1.0.0').description('An express server scaffolding CLI tool');

program.parse(process.argv);

// main function
(async () => {
  // 1. app name prompt and logic
  const { appName, targetDir } = await collectAppName();

  // 2. Select package manager
  const detectedPM = detectPackageManager();
  const packageManager = await collectPackageManager(detectedPM);

  // 3. Choose JavaScript or TypeScript
  const language = await languageSelect();

  // 4. Entry Point
  const entryPoint = await collectEntryFile(language);

  // 5. Output Folder (for TypeScript)
  let outputFolder = '';
  if (language === 'TypeScript') {
    outputFolder = await collectOutputFolder();
  }

  // 6. use database?
  const { useDatabase, databaseType, orm } = await databaseOptions();

  // 7. Port Number
  const port = await collectServerPort();

  const templateData = {
    appName: appName === '.' ? path.basename(process.cwd()) : appName,
    packageManager,
    language,
    entryPoint,
    outputFolder,
    port,
    useDatabase,
    databaseType,
    orm,
  };

  // prepare directory for app files and folders
  const templateDir = path.join(__dirname, 'templates', language.toLowerCase());
  await copyTemplates(templateDir, targetDir, templateData);

  // install dependencies
  try {
    await installDependencies(
      targetDir,
      port,
      appName,
      orm,
      packageManager,
      databaseType
    );
  } catch (error) {
    console.error(chalk.red('\nFailed to install dependencies:'), error.message || error);
    process.exit(1);
  }
})();
