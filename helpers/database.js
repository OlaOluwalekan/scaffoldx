import inquirer from 'inquirer';

export const databaseOptions = async () => {
  const { useDatabase } = await inquirer.prompt({
    name: 'useDatabase',
    type: 'confirm',
    message: 'Do you want to use a database?',
    default: false,
  });

  const { orm } = await inquirer.prompt({
    name: 'orm',
    type: 'list',
    message: 'Choose your ORM:',
    choices: ['Mongoose', 'Prisma'],
    when: useDatabase,
    default: 'Mongoose',
  });

  return { useDatabase, orm: orm || null };
};
