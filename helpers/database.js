import inquirer from 'inquirer';

export const databaseOptions = async () => {
  const { useDatabase } = await inquirer.prompt({
    name: 'useDatabase',
    type: 'confirm',
    message: 'Do you want to use a database?',
    default: false,
  });

  if (!useDatabase) {
    return { useDatabase: false, databaseType: null, orm: null };
  }

  const { databaseType } = await inquirer.prompt({
    name: 'databaseType',
    type: 'list',
    message: 'Select database type:',
    choices: [
      'Postgres',
      'MongoDB',
      { name: 'Firebase (coming soon)', value: 'Firebase', disabled: 'coming soon' },
    ],
    default: 'Postgres',
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
