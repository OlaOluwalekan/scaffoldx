import inquirer from "inquirer";

export const collectOutputFolder = async (opts = {}) => {
  if (opts.yes) {
    return "dist";
  }

  const { output } = await inquirer.prompt({
    name: "output",
    type: "input",
    message: "Output folder:",
    default: "dist",
  });

  return output;
};
