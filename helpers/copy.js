import { exec } from 'child_process';
import ejs from 'ejs';
import fs from 'fs-extra';
import path from 'path';

const copyTemplates = async (srcDir, destDir, data) => {
  const files = await fs.readdir(srcDir);

  for (const file of files) {
    // get the destination path - i.e. what will eventually be in the scaffolded app
    const srcPath = path.join(srcDir, file);

    let destinationFileName = file.includes('index')
      ? file.replace('index', data.entryPoint)
      : file;
    const destPath = path.join(
      destDir,
      destinationFileName.replace('.ejs', '')
    );
    // console.log('destination', file)

    // get the info of the current file/folder
    const stats = await fs.stat(srcPath);

    // check if it's a folder and then recursively call copyTemplates
    if (stats.isDirectory()) {
      if (file == 'db') {
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
      if (data.language === 'Javascript') {
        if (file === 'nodemon.json' || file === 'tsconfig.json') {
          continue;
        }
      }
      const content = await fs.readFile(srcPath, 'utf-8');
      const render = ejs.render(content, data);
      await fs.writeFile(destPath, render, 'utf-8');

      if (file !== '.gitignore') {
        exec(`npx prettier --write "${destPath}"`, (error) => {
          if (error) {
            console.error('format error=>', error);
          }
        });
      }
    }
  }
};

export default copyTemplates;
