import chalk from "chalk";
import { exec } from "child_process";
import ora from "ora";

export const installDependencies = (cwd, port, appName) => {
  const spinner = ora({
    text: chalk.blue("Installing dependencies..."),
    color: "cyan",
    spinner: "aesthetic",
  }).start();

  exec("npm install", { cwd }, (error, stdout, stderr) => {
    if (error) {
      spinner.fail(chalk.red("Error installing dependencies."));
      console.error(error);
      return;
    }

    spinner.succeed(
      chalk.green(`
        Dependencies installed successfully.

        You have successfully scaffold an express server
        `)
    );

    console.log(
      chalk.yellow(`
        open ${chalk.green(".env")} file and replace ${chalk.green(
        "MONGO_URI=mongodb://localhost:27017/"
      )} with your actual database uri

        ${appName !== "." ? `cd ./${appName}` : ""}

        start your dev server using ${chalk.green("npm run dev")}

        open ${chalk.green(`http://localhost:${port}`)} in your browser
        `)
    );
  });
};
