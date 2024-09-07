import inquirer from "inquirer";

export const languageSelect = async () => {
  // 2. Choose JavaScript or TypeScript
  const { language } = await inquirer.prompt({
    name: "language",
    type: "list",
    message: "Select language:",
    choices: ["JavaScript", "TypeScript"],
    default: "TypeScript",
  });

  return language;
};
