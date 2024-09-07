import inquirer from "inquirer";

export const collectEntryFile = async (language) => {
  // 3. Entry Point
  const defaultEntryPoint = language === "TypeScript" ? "index.ts" : "index.js";
  const { entryPoint } = await inquirer.prompt({
    name: "entryPoint",
    type: "input",
    message: "Your project entry point:",
    default: defaultEntryPoint,
  });

  return entryPoint.replace(/\..*$/, "");
};

// validate: (input) => {
//   // validate app name
//   if (input === ".") {
//     const files = fs.readdirSync(process.cwd());
//     if (files.length > 0) {
//       return "Current directory is not empty. Please choose a different directory or confirm to delete its contents.";
//     }
//   }
//   return true;
// },
