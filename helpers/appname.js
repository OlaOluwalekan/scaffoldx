import inquirer from "inquirer";
import fs from "fs-extra";
import chalk from "chalk";
import path from "path";

export const collectAppName = async () => {
  // 1. prompt for app name
  const { appName } = await inquirer.prompt({
    name: "appName",
    type: "input",
    message: "App name:",
    default: ".",
  });

  // app name logic to handle creating and clearing of directory
  let targetDir =
    appName === "." ? process.cwd() : path.join(process.cwd(), appName);

  // check if app name is . then clear directory if any exists in it (upon users confirmation)
  if (appName !== ".") {
    if (fs.existsSync(targetDir)) {
      // check if the file already exists in the directory
      console.log(chalk.red(`Directory ${appName} already exists.`));

      const { overwrite } = inquirer.prompt({
        name: "overwrite",
        type: "confirm",
        message: `Do you want to overwrite the existing directory ${appName}?`,
        default: false,
      });
      if (!overwrite) process.exit(1);
      await fs.remove(targetDir);
    }
    await fs.mkdir(targetDir);
  } else {
    const files = fs.readdirSync(targetDir);
    if (files.length > 0) {
      const { confirmEmpty } = await inquirer.prompt({
        name: "confirmEmpty",
        type: "confirm",
        message: `The current directory is not empty. Do you want to clear its contents?`,
        default: false,
      });
      if (confirmEmpty) {
        await fs.emptyDir(targetDir);
      } else {
        console.log(chalk.yellow("Operation cancelled."));
        process.exit(1);
      }
    }
  }

  return { appName, targetDir };
};
