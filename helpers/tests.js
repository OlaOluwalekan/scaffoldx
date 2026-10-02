import inquirer from 'inquirer';

export const collectIncludeTests = async (opts = {}) => {
  if (opts.yes) {
    return true;
  }

  const { includeTests } = await inquirer.prompt([
    {
      type: 'confirm',
      name: 'includeTests',
      message: 'Would you like to include test scaffolding (Vitest + Supertest)?',
      default: true,
    },
  ]);
  return includeTests;
};
