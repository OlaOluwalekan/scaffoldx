import ejs from "ejs";
import fs from "fs-extra";
import path from "path";

const copyTemplates = async (srcDir, destDir, data) => {
  const files = await fs.readdir(srcDir);

  for (const file of files) {
    // get the destination path - i.e. what will eventually be in the scaffolded app
    const srcPath = path.join(srcDir, file);

    let destinationFileName = file.includes("index")
      ? file.replace("index", data.entryPoint)
      : file;
    const destPath = path.join(
      destDir,
      destinationFileName.replace(".ejs", "")
    );

    // get the info of the current file/folder
    const stats = await fs.stat(srcPath);

    // check if it's a folder and then recursively call copyTemplates
    if (stats.isDirectory()) {
      await fs.mkdir(destPath);
      await copyTemplates(srcPath, destPath, data);
    } else {
      if (data.language === "Javascript") {
        if (file === "nodemon.json" || file === "tsconfig.json") {
          continue;
        }
      }
      const content = await fs.readFile(srcPath, "utf-8");
      const render = ejs.render(content, data);
      await fs.writeFile(destPath, render, "utf-8");
    }
  }
};

export default copyTemplates;
