#!/usr/bin/env node

import { Command } from "commander";
import { collectAppName } from "./helpers/appname.js";
import { languageSelect } from "./helpers/language.js";
import { collectEntryFile } from "./helpers/entry.js";
import { collectOutputFolder } from "./helpers/output.js";
import { collectServerPort } from "./helpers/port.js";
import path from "path";
import copyTemplates from "./helpers/copy.js";
import { fileURLToPath } from "url";
import { installDependencies } from "./helpers/install.js";

// mimic __dirname in ESM
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const program = new Command();

program.version("1.0.0").description("An express server scaffolding CLI tool");

program.parse(process.argv);

// main function
(async () => {
  // 1. app name prompt and logic
  const { appName, targetDir } = await collectAppName();

  // 2. Choose JavaScript or TypeScript
  const language = await languageSelect();

  // 3. Entry Point
  const entryPoint = await collectEntryFile(language);

  // 4. Output Folder (for TypeScript)
  let outputFolder = "";
  if (language === "TypeScript") {
    outputFolder = await collectOutputFolder();
  }

  // 5. Port Number
  const port = await collectServerPort();

  const templateData = {
    appName: appName === "." ? path.basename(process.cwd()) : appName,
    language,
    entryPoint,
    outputFolder,
    port,
  };

  // prepare directory for app files and folders
  const templateDir = path.join(__dirname, "templates", language.toLowerCase());
  await copyTemplates(templateDir, targetDir, templateData);

  // install dependencies
  installDependencies(targetDir, port, appName);

  // console.log(language, entryPoint, outputFolder, port);

  // IIFE
})();
