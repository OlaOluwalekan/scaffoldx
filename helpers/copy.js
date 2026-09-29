import { exec } from 'child_process';
import ejs from 'ejs';
import fs from 'fs-extra';
import path from 'path';

const copyTemplates = async (srcDir, destDir, data) => {
  const files = await fs.readdir(srcDir);

  for (const file of files) {
    const srcPath = path.join(srcDir, file);

    let destinationFileName = file.includes('index')
      ? file.replace('index', data.entryPoint)
      : file;
    const destPath = path.join(
      destDir,
      destinationFileName.replace('.ejs', '')
    );

    const stats = await fs.stat(srcPath);

    if (stats.isDirectory()) {
      if (file === 'db') {
        if (data.useDatabase) {
          await fs.mkdir(destPath);
          await copyTemplates(srcPath, destPath, data);
        }
      } else if (file === 'models') {
        if (data.useDatabase && data.orm === 'Mongoose') {
          await fs.mkdir(destPath);
          await copyTemplates(srcPath, destPath, data);
        }
      } else {
        await fs.mkdir(destPath);
        await copyTemplates(srcPath, destPath, data);
      }
    } else {
      if (data.language && data.language.toLowerCase() === 'javascript') {
        if (file === 'nodemon.json' || file === 'tsconfig.json') {
          continue;
        }
      }
      if (data.orm === 'Prisma') {
        if (file === '.gitignore') {
          continue;
        }
      }

      if (file === 'docker-compose.postgres.yml.ejs') {
        if (data.databaseType === 'Postgres') {
          const destFile = path.join(destDir, 'docker-compose.yml');
          const content = await fs.readFile(srcPath, 'utf-8');
          const render = ejs.render(content, data);
          await fs.writeFile(destFile, render, 'utf-8');
        }
        continue;
      }

      if (file === 'docker-compose.mongo.yml.ejs') {
        if (data.databaseType === 'MongoDB') {
          const destFile = path.join(destDir, 'docker-compose.yml');
          const content = await fs.readFile(srcPath, 'utf-8');
          const render = ejs.render(content, data);
          await fs.writeFile(destFile, render, 'utf-8');
        }
        continue;
      }

      if (file === 'prisma.config.ts.ejs') {
        if (data.databaseType === 'Postgres' && data.orm === 'Prisma') {
          const destFile = path.join(destDir, 'prisma.config.ts');
          const content = await fs.readFile(srcPath, 'utf-8');
          const render = ejs.render(content, data);
          await fs.writeFile(destFile, render, 'utf-8');
        }
        continue;
      }

      const content = await fs.readFile(srcPath, 'utf-8');
      const render = ejs.render(content, data);
      await fs.writeFile(destPath, render, 'utf-8');
    }
  }
};

export default copyTemplates;
