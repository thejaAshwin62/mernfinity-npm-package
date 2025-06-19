import { execSync } from "child_process";
import inquirer from "inquirer";
import chalk from "chalk";
import fs from "fs";
import path from "path";
import os from "os";
import dotenv from "dotenv";
import yaml from "yaml";

const HISTORY_DIR = path.join(os.homedir(), ".mernfinity");
const HISTORY_FILE = path.join(HISTORY_DIR, "render-history.json");

function getRenderHistory() {
  try {
    if (!fs.existsSync(HISTORY_DIR)) {
      fs.mkdirSync(HISTORY_DIR, { recursive: true });
    }
    if (!fs.existsSync(HISTORY_FILE)) {
      fs.writeFileSync(
        HISTORY_FILE,
        JSON.stringify({
          lastUsedRepo: null,
          lastUsedEnvs: null,
          lastServiceName: null,
        })
      );
      return { lastUsedRepo: null, lastUsedEnvs: null, lastServiceName: null };
    }
    return JSON.parse(fs.readFileSync(HISTORY_FILE, "utf8"));
  } catch (error) {
    return { lastUsedRepo: null, lastUsedEnvs: null, lastServiceName: null };
  }
}

function saveRenderHistory(repoUrl, envs, serviceName) {
  try {
    const history = getRenderHistory();
    fs.writeFileSync(
      HISTORY_FILE,
      JSON.stringify(
        {
          lastUsedRepo: repoUrl || history.lastUsedRepo,
          lastUsedEnvs: envs || history.lastUsedEnvs,
          lastServiceName: serviceName || history.lastServiceName,
        },
        null,
        2
      )
    );
  } catch (error) {
    console.error(chalk.yellow("⚠️ Could not save Render history"));
  }
}

async function handleEnvVariables() {
  const envVars = {};
  const history = getRenderHistory();

  // Check for .env file
  if (fs.existsSync(".env")) {
    console.log(chalk.blue("\n📝 Found .env file"));
    const envConfig = dotenv.parse(fs.readFileSync(".env"));

    const { useExistingEnv } = await inquirer.prompt([
      {
        type: "confirm",
        name: "useExistingEnv",
        message: "Use environment variables from .env file?",
        default: true,
      },
    ]);

    if (useExistingEnv) {
      Object.assign(envVars, envConfig);
      console.log(chalk.green("✅ Environment variables loaded from .env"));
    }
  }

  // Ask if user wants to use last used env variables
  if (history.lastUsedEnvs && Object.keys(envVars).length === 0) {
    const { useLastEnv } = await inquirer.prompt([
      {
        type: "confirm",
        name: "useLastEnv",
        message: "Use last used environment variables?",
        default: true,
      },
    ]);

    if (useLastEnv) {
      Object.assign(envVars, history.lastUsedEnvs);
      console.log(chalk.green("✅ Loaded last used environment variables"));
    }
  }

  // Ask if user wants to add more env variables
  const { addMoreEnv } = await inquirer.prompt([
    {
      type: "confirm",
      name: "addMoreEnv",
      message: "Would you like to add more environment variables?",
      default: Object.keys(envVars).length === 0,
    },
  ]);

  if (addMoreEnv) {
    let addingEnv = true;
    while (addingEnv) {
      const { envKey, envValue, addAnother } = await inquirer.prompt([
        {
          type: "input",
          name: "envKey",
          message: "Enter environment variable name:",
          validate: (input) => input.trim().length > 0 || "Name is required",
        },
        {
          type: "input",
          name: "envValue",
          message: "Enter environment variable value:",
          validate: (input) => input.trim().length > 0 || "Value is required",
        },
        {
          type: "confirm",
          name: "addAnother",
          message: "Add another environment variable?",
          default: false,
        },
      ]);

      envVars[envKey] = envValue;
      addingEnv = addAnother;
    }
  }

  return envVars;
}

export default async function deployToRender() {
  try {
    console.log(chalk.blue("\n🚀 Preparing Render Deployment..."));

    // Get repository history and URL
    const history = getRenderHistory();
    let repoUrl;

    if (history.lastUsedRepo) {
      const { useLastRepo } = await inquirer.prompt([
        {
          type: "confirm",
          name: "useLastRepo",
          message: `Use last deployed repository (${history.lastUsedRepo})?`,
          default: true,
        },
      ]);

      if (useLastRepo) {
        repoUrl = history.lastUsedRepo;
      }
    }

    if (!repoUrl) {
      const { inputRepoUrl } = await inquirer.prompt([
        {
          type: "input",
          name: "inputRepoUrl",
          message: "Enter your GitHub repository URL:",
          validate: (input) =>
            input.trim().length > 0 || "Repository URL is required",
        },
      ]);
      repoUrl = inputRepoUrl;
    }

    // Get service name
    let serviceName;
    if (history.lastServiceName) {
      const { useLastService } = await inquirer.prompt([
        {
          type: "confirm",
          name: "useLastService",
          message: `Use last service name (${history.lastServiceName})?`,
          default: true,
        },
      ]);

      if (useLastService) {
        serviceName = history.lastServiceName;
      }
    }

    if (!serviceName) {
      const { inputServiceName } = await inquirer.prompt([
        {
          type: "input",
          name: "inputServiceName",
          message: "Enter a name for your Render service:",
          validate: (input) =>
            input.trim().length > 0 || "Service name is required",
        },
      ]);
      serviceName = inputServiceName;
    }

    // Handle environment variables
    const envVars = await handleEnvVariables();

    // Get server file name
    const { serverFileName } = await inquirer.prompt([
      {
        type: "input",
        name: "serverFileName",
        message: "Enter your server file name (e.g., server.js, index.js):",
        default: "server.js",
        validate: (input) =>
          input.trim().length > 0 || "Server file name is required",
      },
    ]);

    // Create render.yaml blueprint
    const renderConfig = {
      services: [
        {
          type: "web",
          name: serviceName,
          env: "node",
          plan: "free",
          buildCommand: "npm install",
          startCommand: `node ${serverFileName}`,
          autoDeploy: true,
          repo: repoUrl,
          branch: "main",
          envVars: Object.entries(envVars).map(([key, value]) => ({
            key,
            value,
            generateValue: false,
          })),
          healthCheckPath: "/",
          numInstances: 1,
        },
      ],
    };

    // Write render.yaml in YAML format
    fs.writeFileSync(
      "render.yaml",
      yaml.stringify(renderConfig, { indent: 2 })
    );
    console.log(chalk.green("✅ Created render.yaml blueprint"));

    // Guide user through deployment steps
    console.log(chalk.blue("\n🌐 To deploy your application:"));
    console.log(chalk.yellow("\n1. First time setup:"));
    console.log(chalk.yellow("   a. Visit https://dashboard.render.com"));
    console.log(chalk.yellow("   b. Sign in with your GitHub account"));
    console.log(chalk.yellow("   c. Go to 'Blueprints' in the left sidebar"));
    console.log(chalk.yellow("   d. Click 'New Blueprint Instance'"));
    console.log(chalk.yellow("   e. Select your repository"));
    console.log(chalk.yellow("   f. Click 'Connect' and wait for deployment"));

    console.log(chalk.blue("\n2. For subsequent deployments:"));
    console.log(
      chalk.yellow(
        "   - Pushing changes to your main branch will automatically trigger deployments"
      )
    );
    console.log(
      chalk.yellow(
        "   - You can also manually deploy from the Render dashboard"
      )
    );

    // Try to open the dashboard in the default browser
    try {
      if (process.platform === "win32") {
        execSync("start https://dashboard.render.com/blueprint/new", {
          stdio: "ignore",
        });
      } else {
        execSync("open https://dashboard.render.com/blueprint/new", {
          stdio: "ignore",
        });
      }
    } catch (error) {
      // Ignore browser open errors
    }

    // Save history
    saveRenderHistory(repoUrl, envVars, serviceName);

    console.log(chalk.green("\n✅ Render blueprint created successfully!"));
    console.log(
      chalk.blue("\n🔗 Once deployed, your app will be available at:")
    );
    console.log(chalk.yellow(`https://${serviceName}.onrender.com`));

    // Adding reminder about GitHub push
    console.log(
      chalk.magenta(
        "\n⚠️ IMPORTANT: Don't forget to push your changes to GitHub!"
      )
    );
    console.log(
      chalk.yellow(
        "To ensure your deployment is up to date, run the following:"
      )
    );
    console.log(chalk.cyan("1. Select 'Push to GitHub' from the main menu"));
    console.log(
      chalk.cyan("2. Your changes will be automatically deployed once pushed")
    );

    console.log(
      chalk.blue(
        "\n💡 Tip: Future pushes to your main branch will automatically trigger new deployments"
      )
    );
  } catch (error) {
    console.error(chalk.red("\n❌ Deployment failed!"), error.message);
  }
}
