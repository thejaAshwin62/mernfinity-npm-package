import { execSync } from "child_process";
import inquirer from "inquirer";
import path from "path";
import fs from "fs";
import chalk from "chalk";
import { fileURLToPath } from "url";

// Resolve __dirname in ES Modules
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Function to remove old public directory based on platform
function removePublicDir(publicDir) {
  if (process.platform === "win32") {
    // Windows command to remove the directory
    console.log(chalk.yellow("🗑️ Clearing old public directory..."));
    execSync(`rmdir /s /q "${publicDir}"`, { stdio: "inherit" });
  } else {
    // Unix-based command to remove the directory
    console.log(chalk.yellow("🗑️ Clearing old public directory..."));
    execSync(`rm -rf "${publicDir}"`, { stdio: "inherit" });
  }
}

async function main() {
  console.log(chalk.green("\n🚀 MERN Deploy Helper\n"));

  const responses = await inquirer.prompt([
    {
      type: "input",
      name: "clientDir",
      message:
        "Enter the path to your React frontend directory (default: ./client):",
      default: "./client",
      validate: (input) =>
        fs.existsSync(input) ||
        "Directory not found, please enter a valid path.",
    },
    {
      type: "input",
      name: "publicDir",
      message:
        "Enter the path to your backend public directory (default: ./public):",
      default: "./public",
      validate: (input) =>
        input.trim().length > 0 || "Please enter a valid directory name.",
    },
  ]);

  const { clientDir, publicDir } = responses;

  try {
    console.log(chalk.blue("\n🔄 Installing frontend dependencies..."));
    execSync("npm install", { cwd: clientDir, stdio: "inherit" });

    console.log(chalk.blue("\n⚙️ Building React frontend..."));
    execSync("npm run build", { cwd: clientDir, stdio: "inherit" });

    //Moving the Build Files to the public Directory
    console.log(
      chalk.blue("\n🚚 Moving dist files to the public directory...")
    );
    const distDir = path.join(clientDir, "dist");

    // Remove the old public directory based on the platform
    if (fs.existsSync(publicDir)) {
      removePublicDir(publicDir);
    }

    fs.mkdirSync(publicDir, { recursive: true });

    if (process.platform === "win32") {
      execSync(`xcopy /s /e /y "${distDir}\\*" "${publicDir}\\"`, {
        stdio: "inherit",
      });
    } else {
      execSync(`cp -r ${distDir}/* ${publicDir}/`, { stdio: "inherit" });
    }

    console.log(chalk.green("\n✅ Deployment complete!"));
  } catch (error) {
    console.error(chalk.red("\n❌ Deployment failed!"), error.message);
  }
}

main();
