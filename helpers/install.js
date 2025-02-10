import chalk from 'chalk';
import { exec } from 'child_process';
import ora from 'ora';
import fs from 'fs';
import path from 'path';

export const installDependencies = async (cwd, port, appName, orm) => {
  const spinner = ora({
    text: chalk.blue('Installing dependencies...'),
    color: 'cyan',
    spinner: 'aesthetic',
  }).start();

  exec('npm install', { cwd }, (error, stdout, stderr) => {
    if (error) {
      spinner.fail(chalk.red('Error installing dependencies.'));
      console.error(error);
      return;
    }

    spinner.succeed(
      chalk.green(`
        Dependencies installed successfully.

        You have successfully scaffold an express server
        `)
    );

    if (orm === 'Prisma') {
      const prismaSpinner = ora({
        text: chalk.blue('Initializing Prisma...'),
        color: 'cyan',
        spinner: 'aesthetic',
      }).start();
      exec(`npx prisma init`, { cwd: `${cwd}/src` }, (error) => {
        if (error) {
          prismaSpinner.fail(chalk.red('Error initializing Prisma.'));
          console.error(error);
          return;
        }

        prismaSpinner.succeed(
          chalk.green(`successfully initialized Prisma ORM

            navigate to src/prisma/schema.prisma to setup your schemas/models. Add your database url in .env and run npx prisma generate to create your database
            `)
        );

        // 📌 Move .env file to the root folder
        const envSourcePath = path.join(cwd, 'src', '.env');
        const envDestPath = path.join(cwd, '.env');

        fs.rename(envSourcePath, envDestPath, (err) => {
          if (err) {
            console.error(chalk.red('Error moving .env file:'), err);
          }
        });

        const schemaPath = path.join(cwd, 'src', 'prisma', 'schema.prisma');

        // 📌 Prisma User Model
        const userModel = `
          model User {
            id          String   @id @default(uuid())
            username    String   @unique
            profilePic  String   @default("")
            createdAt   DateTime @default(now())
          }`;

        fs.appendFile(schemaPath, userModel, (err) => {
          if (err) {
            console.error(chalk.red('Error updating schema.prisma'), err);
          } else {
            console.log(chalk.green('✅ User model added to schema.prisma'));
          }
        });
      });
    }

    console.log(
      chalk.yellow(`
        ${
          orm !== null
            ? `open ${chalk.green('.env')} file and replace ${chalk.green(
                orm === 'Mongoose'
                  ? 'MONGO_URI=mongodb://localhost:27017/'
                  : "DATABASE_URL='postgresql://johndoe:randompassword@localhost:5432/mydb?schema=public'"
              )} with your actual database uri`
            : ''
        }

        ${appName !== '.' ? `cd ./${appName}` : ''}

        start your dev server using ${chalk.green('npm run dev')}

        open ${chalk.green(`http://localhost:${port}`)} in your browser
        `)
    );
  });
};
