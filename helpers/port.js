import inquirer from "inquirer";

export const collectServerPort = async () => {
  const { port } = await inquirer.prompt({
    name: "port",
    type: "input",
    message: "Port number:",
    default: 3000,
    validate: (input) => {
      const parsed = parseInt(input, 10);
      if (isNaN(parsed) || parsed <= 0) {
        return "Please enter a valid port number.";
      }
      return true;
    },
  });

  return port;
};
