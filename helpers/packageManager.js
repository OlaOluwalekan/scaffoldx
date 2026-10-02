import inquirer from 'inquirer';

export const detectPackageManager = () => {
  const userAgent = process.env.npm_config_user_agent || '';

  if (userAgent.startsWith('pnpm')) {
    return 'pnpm';
  }
  if (userAgent.startsWith('yarn')) {
    return 'yarn';
  }
  if (userAgent.startsWith('bun')) {
    return 'bun';
  }
  return 'npm';
};

export const collectPackageManager = async (defaultGuess = 'npm', opts = {}) => {
  if (opts.yes) {
    if (opts.pm && ['npm', 'pnpm', 'yarn', 'bun'].includes(opts.pm)) {
      return opts.pm;
    }
    return defaultGuess || 'npm';
  }

  const { packageManager } = await inquirer.prompt({
    name: 'packageManager',
    type: 'list',
    message: 'Select package manager:',
    choices: ['npm', 'pnpm', 'yarn', 'bun'],
    default: opts.pm && ['npm', 'pnpm', 'yarn', 'bun'].includes(opts.pm) ? opts.pm : defaultGuess,
  });

  return packageManager;
};
