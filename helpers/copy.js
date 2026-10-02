import { exec } from 'child_process';
import ejs from 'ejs';
import fs from 'fs-extra';
import path from 'path';
import prettier from 'prettier';

const PRETTIER_EXTENSIONS = ['.js', '.ts', '.json', '.yml', '.yaml'];

const formatContent = async (content, destPath) => {
  const ext = path.extname(destPath).toLowerCase();
  const basename = path.basename(destPath);

  if (basename.startsWith('.env')) {
    // For .env/.env.example, collapse 3+ consecutive blank lines down to 1
    return content.replace(/\n{3,}/g, '\n\n');
  }

  if (PRETTIER_EXTENSIONS.includes(ext)) {
    try {
      return await prettier.format(content, {
        filepath: destPath,
        tabWidth: 2,
        semi: true,
        singleQuote: true,
        trailingComma: 'es5',
      });
    } catch (err) {
      // Fallback to unformatted content if prettier fails
      return content;
    }
  }

  return content;
};

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
      } else if (file === 'tests') {
        if (data.includeTests) {
          await fs.mkdir(destPath);
          await copyTemplates(srcPath, destPath, data);
        }
      } else {
        await fs.mkdir(destPath);
        await copyTemplates(srcPath, destPath, data);
      }
    } else {
      if (data.language && data.language.toLowerCase() === 'javascript') {
        if (file === 'tsconfig.json') {
          continue;
        }
      }

      if (file.startsWith('vitest.config.')) {
        if (!data.includeTests) {
          continue;
        }
      }

      if (file === 'docker-compose.postgres.yml.ejs') {
        if (data.databaseType === 'Postgres') {
          const destFile = path.join(destDir, 'docker-compose.yml');
          const content = await fs.readFile(srcPath, 'utf-8');
          const render = ejs.render(content, data);
          const formatted = await formatContent(render, destFile);
          await fs.writeFile(destFile, formatted, 'utf-8');
        }
        continue;
      }

      if (file === 'docker-compose.mongo-mongoose.yml.ejs') {
        if (data.databaseType === 'MongoDB' && data.orm === 'Mongoose') {
          const destFile = path.join(destDir, 'docker-compose.yml');
          const content = await fs.readFile(srcPath, 'utf-8');
          const render = ejs.render(content, data);
          const formatted = await formatContent(render, destFile);
          await fs.writeFile(destFile, formatted, 'utf-8');
        }
        continue;
      }

      if (file === 'docker-compose.mongo-prisma.yml.ejs') {
        if (data.databaseType === 'MongoDB' && data.orm === 'Prisma') {
          const destFile = path.join(destDir, 'docker-compose.yml');
          const content = await fs.readFile(srcPath, 'utf-8');
          const render = ejs.render(content, data);
          const formatted = await formatContent(render, destFile);
          await fs.writeFile(destFile, formatted, 'utf-8');
        }
        continue;
      }

      if (file === 'prisma.config.ts.ejs') {
        if (data.orm === 'Prisma') {
          const destFile = path.join(destDir, 'prisma.config.ts');
          const content = await fs.readFile(srcPath, 'utf-8');
          const render = ejs.render(content, data);
          const formatted = await formatContent(render, destFile);
          await fs.writeFile(destFile, formatted, 'utf-8');
        }
        continue;
      }

      if (file === 'pnpm-workspace.yaml.ejs') {
        if (data.packageManager === 'pnpm') {
          const destFile = path.join(destDir, 'pnpm-workspace.yaml');
          const content = await fs.readFile(srcPath, 'utf-8');
          const formatted = await formatContent(content, destFile);
          await fs.writeFile(destFile, formatted, 'utf-8');
        }
        continue;
      }

      const content = await fs.readFile(srcPath, 'utf-8');
      const render = ejs.render(content, data);
      const formatted = await formatContent(render, destPath);
      await fs.writeFile(destPath, formatted, 'utf-8');

      if (file === '.env.example.ejs') {
        const envFile = path.join(destDir, '.env');
        if (!fs.existsSync(envFile)) {
          await fs.writeFile(envFile, formatted, 'utf-8');
        }
      }
    }
  }
};

export default copyTemplates;
