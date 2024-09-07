import inquirer from "inquirer";

export const collectOutputFolder = async () => {
  const { output } = await inquirer.prompt({
    name: "output",
    type: "input",
    message: "Output folder:",
    default: "dist",
  });

  return output;
};
