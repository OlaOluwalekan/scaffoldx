import inquirer from "inquirer";

export const languageSelect = async (opts = {}) => {
  if (opts.yes) {
    if (opts.js) return "JavaScript";
    if (opts.ts) return "TypeScript";
    return "TypeScript";
  }

  // 2. Choose JavaScript or TypeScript
  const { language } = await inquirer.prompt({
    name: "language",
    type: "list",
    message: "Select language:",
    choices: ["JavaScript", "TypeScript"],
    default: opts.js ? "JavaScript" : "TypeScript",
  });

  return language;
};
