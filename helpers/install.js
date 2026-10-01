import chalk from 'chalk';
import { exec } from 'child_process';
import ora from 'ora';
import fs from 'fs';
import path from 'path';

const INSTALL_COMMANDS = {
  npm: 'npm install',
  pnpm: 'pnpm install',
  yarn: 'yarn install',
  bun: 'bun install',
};

const DEV_COMMANDS = {
  npm: 'npm run dev',
  pnpm: 'pnpm dev',
  yarn: 'yarn dev',
  bun: 'bun run dev',
};

export const installDependencies = async (
  cwd,
  port,
  resolvedAppName,
  orm,
  packageManager = 'npm',
  databaseType = null,
  rawAppName = null
) => {
  const installCmd = INSTALL_COMMANDS[packageManager] || 'npm install';
  const devCmd = DEV_COMMANDS[packageManager] || 'npm run dev';

  // show download animation
  const spinner = ora({
    text: chalk.blue(`Installing dependencies with ${packageManager}...`),
    color: 'cyan',
    spinner: 'aesthetic',
  }).start();

  // run package manager install to install dependencies
  await new Promise((resolve, reject) => {
    exec(installCmd, { cwd }, (error, stdout, stderr) => {
      if (error) {
        spinner.fail(
          chalk.red(`Error installing dependencies with ${packageManager}.`)
        );
        if (
          error.code === 'ENOENT' ||
          (error.message && error.message.includes('not recognized'))
        ) {
          console.error(
            chalk.yellow(
              `\n${packageManager} does not seem to be installed on your system. Please install ${packageManager} or use another package manager.`
            )
          );
        }
        reject(error);
        return;
      }

      // display successful installation message
      spinner.succeed(
        chalk.green(`
        Dependencies installed successfully.

        You have successfully scaffold an express server
        `)
      );
      resolve();
    });
  });

  // check if orm is prisma to initiate prisma
  if (orm === 'Prisma') {
    const prismaSpinner = ora({
      text: chalk.blue('Initializing Prisma...'),
      color: 'cyan',
      spinner: 'aesthetic',
    }).start();

    const initCmd =
      databaseType === 'Postgres'
        ? 'npx prisma init --datasource-provider postgresql'
        : 'npx prisma init --datasource-provider mongodb';

    // run prisma init to initialize prisma
    await new Promise((resolve, reject) => {
      exec(initCmd, { cwd: `${cwd}/src` }, async (error) => {
        if (error) {
          prismaSpinner.fail(chalk.red('Error initializing Prisma.'));
          reject(error);
          return;
        }

        // display successful prisma initialization message
        prismaSpinner.succeed(
          chalk.green(`successfully initialized Prisma ORM

            navigate to src/prisma/schema.prisma to setup your schemas/models. Add your database url in .env and run npx prisma generate to create your database
            `)
        );

        try {
          // 📌 Move .env and gitignore file to the root folder
          const envSourcePath = path.join(cwd, 'src', '.env');
          const envDestPath = path.join(cwd, '.env');
          const gitignoreSrcPath = path.join(cwd, 'src', '.gitignore');
          const gitignoreDestPath = path.join(cwd, '.gitignore');

          if (fs.existsSync(envSourcePath)) {
            await fs.promises.rename(envSourcePath, envDestPath);
          }
          if (fs.existsSync(gitignoreSrcPath)) {
            await fs.promises.unlink(gitignoreSrcPath);
          }

          if (fs.existsSync(envDestPath)) {
            let envContent = await fs.promises.readFile(envDestPath, 'utf-8');
            const targetUrl =
              databaseType === 'MongoDB'
                ? `mongodb://admin:secret_password@localhost:27017/${resolvedAppName}_dev?authSource=admin&replicaSet=rs0`
                : `postgresql://postgres:postgres@localhost:5432/${resolvedAppName}_dev?schema=public`;
            if (/DATABASE_URL=/.test(envContent)) {
              envContent = envContent.replace(
                /DATABASE_URL=.*(\r?\n|$)/,
                `DATABASE_URL="${targetUrl}"$1`
              );
            } else {
              envContent += `DATABASE_URL="${targetUrl}"\n`;
            }
            await fs.promises.writeFile(envDestPath, envContent, 'utf-8');
          }

          // Remove any duplicate config generated in src by prisma init
          const srcPrisma7Config = path.join(cwd, 'src', 'prisma7.config.ts');
          const srcPrismaConfig = path.join(cwd, 'src', 'prisma.config.ts');
          if (fs.existsSync(srcPrisma7Config)) {
            await fs.promises.unlink(srcPrisma7Config);
          }
          if (fs.existsSync(srcPrismaConfig)) {
            await fs.promises.unlink(srcPrismaConfig);
          }

          const schemaPath = path.join(cwd, 'src', 'prisma', 'schema.prisma');
          if (fs.existsSync(schemaPath)) {
            let schemaContent = await fs.promises.readFile(schemaPath, 'utf-8');

            schemaContent = schemaContent.replace(
              /generator\s+client\s*\{[\s\S]*?\}/,
              `generator client {\n  provider = "prisma-client"\n  output   = "../generated/prisma"\n}`
            );

            if (databaseType === 'Postgres') {
              const userModel = `
model User {
  id          String   @id @default(uuid())
  username    String   @unique
  profilePic  String   @default("")
  createdAt   DateTime @default(now())
}`;

              if (!schemaContent.includes('model User')) {
                schemaContent += '\n' + userModel;
              }
            } else {
              const userModel = `
model User {
  id          String   @id @default(auto()) @map("_id") @db.ObjectId
  username    String   @unique
  profilePic  String   @default("")
  createdAt   DateTime @default(now())
}`;

              if (!schemaContent.includes('model User')) {
                schemaContent += '\n' + userModel;
              }
            }

            await fs.promises.writeFile(schemaPath, schemaContent, 'utf-8');
            console.log(
              chalk.green(
                '✅ Configured schema.prisma generator client and User model'
              )
            );
          }

          resolve();
        } catch (err) {
          reject(err);
        }
      });
    });
  }
  const envExamplePath = path.join(cwd, '.env.example');
  const envPath = path.join(cwd, '.env');
  if (!fs.existsSync(envPath) && fs.existsSync(envExamplePath)) {
    await fs.promises.copyFile(envExamplePath, envPath);
  }

  const postgresDbUrl = `postgresql://postgres:postgres@localhost:5432/${resolvedAppName}_dev?schema=public`;
  const mongoDbMongooseUrl = `mongodb://admin:secret_password@localhost:27017/${resolvedAppName}_dev?authSource=admin`;
  const mongoDbPrismaUrl = `mongodb://admin:secret_password@localhost:27017/${resolvedAppName}_dev?authSource=admin&replicaSet=rs0`;

  const shouldPrintCd = rawAppName ? rawAppName !== '.' : path.resolve(cwd) !== process.cwd();

  console.log(
    chalk.yellow(`
      ${
        databaseType !== null
          ? `start your database container using ${chalk.green('docker compose up -d')}\n`
          : ''
      }${
        orm !== null
          ? `open ${chalk.green('.env')} file and replace ${chalk.green(
              orm === 'Mongoose'
                ? `MONGO_URI=${mongoDbMongooseUrl}`
                : databaseType === 'Postgres'
                  ? `DATABASE_URL='${postgresDbUrl}'`
                  : `DATABASE_URL='${mongoDbPrismaUrl}'`
            )} with your actual database uri`
          : ''
      }
      ${
        orm === 'Prisma'
          ? `\n      generate your Prisma client using ${chalk.green('npx prisma generate')}`
          : ''
      }
${shouldPrintCd ? `\n      cd ./${rawAppName || resolvedAppName}` : ''}

      start your dev server using ${chalk.green(devCmd)}

      open ${chalk.green(`http://localhost:${port}`)} in your browser
      `)
  );
};
