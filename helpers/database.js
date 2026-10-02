import inquirer from 'inquirer';

export const databaseOptions = async (opts = {}) => {
  if (opts.yes) {
    if (opts.db === false) { // commander handles --no-db as opts.db = false
      return { useDatabase: false, databaseType: null, orm: null };
    }
    if (opts.mongodb) {
      return { useDatabase: true, databaseType: 'MongoDB', orm: 'Mongoose' };
    }
    if (opts.postgres) {
      return { useDatabase: true, databaseType: 'Postgres', orm: 'Prisma' };
    }
    // Default under --yes: Postgres + Prisma
    return { useDatabase: true, databaseType: 'Postgres', orm: 'Prisma' };
  }

  const { useDatabase } = await inquirer.prompt({
    name: 'useDatabase',
    type: 'confirm',
    message: 'Do you want to use a database?',
    default: opts.db === false ? false : true,
  });

  if (!useDatabase) {
    return { useDatabase: false, databaseType: null, orm: null };
  }

  const defaultDb = opts.mongodb ? 'MongoDB' : 'Postgres';
  const { databaseType } = await inquirer.prompt({
    name: 'databaseType',
    type: 'list',
    message: 'Select database type:',
    choices: [
      'Postgres',
      'MongoDB',
      { name: 'Firebase (coming soon)', value: 'Firebase', disabled: 'coming soon' },
    ],
    default: defaultDb,
  });

  if (databaseType === 'Postgres') {
    return { useDatabase: true, databaseType, orm: 'Prisma' };
  }

  const { orm } = await inquirer.prompt({
    name: 'orm',
    type: 'list',
    message: 'Choose your ORM:',
    choices: ['Mongoose', 'Prisma'],
    default: 'Mongoose',
  });

  return { useDatabase: true, databaseType, orm };
};
