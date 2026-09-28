import inquirer from 'inquirer';
import fs from 'fs-extra';
import chalk from 'chalk';
import path from 'path';

export const collectAppName = async () => {
  // 1. prompt for app name
  const { appName } = await inquirer.prompt({
    name: 'appName',
    type: 'input',
    message: 'App name:',
    default: '.',
  });

  // app name logic to handle creating and clearing of directory
  const targetDir =
    appName === '.' ? process.cwd() : path.join(process.cwd(), appName);

  const dirExists = await fs.pathExists(targetDir);
  const isNonEmpty = dirExists && (await fs.readdir(targetDir)).length > 0;

  if (isNonEmpty) {
    console.log(
      chalk.yellow(
        `Target directory ${appName === '.' ? 'current directory' : `"${appName}"`} is not empty.`
      )
    );

    const { action } = await inquirer.prompt({
      name: 'action',
      type: 'list',
      message: 'How would you like to proceed?',
      choices: [
        'Clear existing content',
        'Scaffold alongside existing content',
        'Exit without scaffolding',
      ],
      default: 'Clear existing content',
    });

    if (action === 'Clear existing content') {
      await fs.emptyDir(targetDir);
    } else if (action === 'Exit without scaffolding') {
      console.log(chalk.yellow('Operation cancelled.'));
      process.exit(0);
    }
    // If 'Scaffold alongside existing content', proceed without emptying
  } else {
    await fs.ensureDir(targetDir);
  }

  return { appName, targetDir };
};
