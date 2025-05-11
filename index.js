import { execSync } from "child_process";
import inquirer from "inquirer";
import path from "path";
import fs from "fs";
import chalk from "chalk";
import { fileURLToPath } from "url";
import pushToGitHub from "./github-repo-push.js";
import deployToRender from "./render-deploy.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Function to remove old public directory based on platform
function removePublicDir(publicDir) {
  if (process.platform === "win32") {
    console.log(chalk.yellow("🗑️ Clearing old public directory..."));
    execSync(`rmdir /s /q "${publicDir}"`, { stdio: "inherit" });
  } else {
    console.log(chalk.yellow("🗑️ Clearing old public directory..."));
    execSync(`rm -rf "${publicDir}"`, { stdio: "inherit" });
  }
}

// Function to detect project structure
function detectProjectStructure() {
  const commonClientDirs = ["client", "frontend", "react-app", "web", "app"];
  const commonPublicDirs = ["public", "static", "dist"];

  let detectedClientDir = null;
  let detectedPublicDir = null;

  // Check for client directory
  for (const dir of commonClientDirs) {
    if (fs.existsSync(dir)) {
      // Verify it's a React project by checking for package.json with react
      try {
        const packageJson = JSON.parse(
          fs.readFileSync(path.join(dir, "package.json"), "utf8")
        );
        if (packageJson.dependencies?.react) {
          detectedClientDir = dir;
          break;
        }
      } catch (error) {
        continue;
      }
    }
  }

  // Check for public directory
  for (const dir of commonPublicDirs) {
    if (fs.existsSync(dir)) {
      detectedPublicDir = dir;
      break;
    }
  }

  return { detectedClientDir, detectedPublicDir };
}

async function deploy() {
  try {
    const answers = await inquirer.prompt([
      {
        type: "list",
        name: "deploymentOption",
        message: "Where would you like to deploy?",
        choices: ["Render", "GitHub"],
      },
    ]);

    if (answers.deploymentOption === "GitHub") {
      await pushToGitHub();
    } else if (answers.deploymentOption === "Render") {
      await deployToRender();
    }
  } catch (error) {
    console.error(chalk.red("Deployment failed:"), error);
    process.exit(1);
  }
}

async function main() {
  console.log(chalk.green("\n🚀 MERN Deploy Helper\n"));

  // Detect project structure
  const { detectedClientDir, detectedPublicDir } = detectProjectStructure();

  // Streamlined setup prompt
  const setupResponse = await inquirer.prompt([
    {
      type: "list",
      name: "setupType",
      message: "How would you like to proceed?",
      choices: [
        {
          name: detectedClientDir
            ? `Quick setup (Using detected structure: ${detectedClientDir} → ${
                detectedPublicDir || "public"
              })`
            : "Quick setup (Using default: client → public)",
          value: "quick",
        },
        {
          name: "Custom setup (Specify directories manually)",
          value: "custom",
        },
      ],
      default: "quick",
    },
  ]);

  let clientDir, publicDir;

  if (setupResponse.setupType === "quick") {
    clientDir = detectedClientDir || "./client";
    publicDir = detectedPublicDir || "./public";

    // If using detected directories, just confirm
    if (detectedClientDir) {
      console.log(
        chalk.blue(`\n✓ Using detected frontend directory: ${clientDir}`)
      );
      console.log(
        chalk.blue(`✓ Using detected public directory: ${publicDir}`)
      );
    } else {
      console.log(chalk.blue("\n✓ Using default directories"));
    }
  } else {
    // Custom setup - only ask if really needed
    const responses = await inquirer.prompt([
      {
        type: "input",
        name: "clientDir",
        message: "Enter the path to your React frontend directory:",
        default: detectedClientDir || "./client",
        validate: (input) =>
          fs.existsSync(input) ||
          "Directory not found, please enter a valid path.",
      },
      {
        type: "input",
        name: "publicDir",
        message: "Enter the path to your backend public directory:",
        default: detectedPublicDir || "./public",
        validate: (input) =>
          input.trim().length > 0 || "Please enter a valid directory name.",
      },
    ]);

    clientDir = responses.clientDir;
    publicDir = responses.publicDir;
  }

  try {
    // Combined deployment options
    const { deployAction } = await inquirer.prompt([
      {
        type: "list",
        name: "deployAction",
        message: chalk.cyan.bold("📋 Select Deployment Action:"),
        choices: [
          {
            name:
              chalk.blue("🔨 Build Frontend") +
              chalk.gray(" - Compile and build the React application"),
            value: "build",
          },
          {
            name:
              chalk.green("🔄 Build & Push") +
              chalk.gray(" - Build frontend and push to GitHub"),
            value: "build-github",
          },
          {
            name:
              chalk.magenta("🚀 Full Deployment") +
              chalk.gray(" - Build, push to GitHub, and deploy to Render"),
            value: "build-github-render",
          },
          {
            name:
              chalk.yellow("☁️ Deploy to Render") +
              chalk.gray(" - Deploy to Render"),
            value: "render",
          },
          {
            name:
              chalk.cyan("📤 Push to GitHub") +
              chalk.gray(" - Push current changes to GitHub"),
            value: "github",
          },
        ],
        default: "build",
        pageSize: 5,
      },
    ]);

    // Handle build if needed
    if (
      ["build", "build-github", "build-github-render"].includes(deployAction)
    ) {
      // Build frontend
      console.log(chalk.blue("\n🔄 Installing frontend dependencies..."));
      execSync("npm install", { cwd: clientDir, stdio: "inherit" });

      console.log(chalk.blue("\n⚙️ Building React frontend..."));
      execSync("npm run build", { cwd: clientDir, stdio: "inherit" });

      console.log(
        chalk.blue("\n🚚 Moving dist files to the public directory...")
      );
      const distDir = path.join(clientDir, "dist");

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

      console.log(chalk.green("\n✅ Build complete!"));
    }

    // Handle GitHub push if needed
    if (
      ["build-github", "build-github-render", "github"].includes(deployAction)
    ) {
      await pushToGitHub();
    }

    // Handle Render deployment if needed
    if (["build-github-render", "render"].includes(deployAction)) {
      await deployToRender();
    }

    console.log(chalk.green("\n✅ All operations completed successfully!"));
  } catch (error) {
    console.error(chalk.red("\n❌ Operation failed!"), error.message);
  }
}

main();
