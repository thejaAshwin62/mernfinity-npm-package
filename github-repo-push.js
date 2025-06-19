import { execSync } from "child_process";
import inquirer from "inquirer";
import chalk from "chalk";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import os from "os";

const HISTORY_DIR = path.join(os.homedir(), ".mernfinity");
const HISTORY_FILE = path.join(HISTORY_DIR, "repo-history.json");

// Get repository and branch history
function getRepoHistory() {
  try {
    if (!fs.existsSync(HISTORY_DIR)) {
      fs.mkdirSync(HISTORY_DIR, { recursive: true });
    }
    if (!fs.existsSync(HISTORY_FILE)) {
      fs.writeFileSync(
        HISTORY_FILE,
        JSON.stringify({
          lastUsedRepo: null,
          lastUsedBranch: null,
        })
      );
      return { lastUsedRepo: null, lastUsedBranch: null };
    }
    return JSON.parse(fs.readFileSync(HISTORY_FILE, "utf8"));
  } catch (error) {
    return { lastUsedRepo: null, lastUsedBranch: null };
  }
}

// Save repository and branch history
function saveRepoHistory(repoUrl, branchName) {
  try {
    if (!fs.existsSync(HISTORY_DIR)) {
      fs.mkdirSync(HISTORY_DIR, { recursive: true });
    }
    const history = getRepoHistory();
    fs.writeFileSync(
      HISTORY_FILE,
      JSON.stringify(
        {
          lastUsedRepo: repoUrl || history.lastUsedRepo,
          lastUsedBranch: branchName || history.lastUsedBranch,
        },
        null,
        2
      )
    );
  } catch (error) {
    console.error(chalk.yellow("⚠️ Could not save repository history"));
  }
}

// Detect git user configuration
async function ensureGitConfig() {
  try {
    execSync("git config user.name", { stdio: "pipe" });
    execSync("git config user.email", { stdio: "pipe" });
    return true;
  } catch (error) {
    const { userName, userEmail } = await inquirer.prompt([
      {
        type: "input",
        name: "userName",
        message: "Enter your Git username:",
        validate: (input) => input.trim().length > 0 || "Username is required",
      },
      {
        type: "input",
        name: "userEmail",
        message: "Enter your Git email:",
        validate: (input) => input.trim().length > 0 || "Email is required",
      },
    ]);

    execSync(`git config user.name "${userName}"`, { stdio: "inherit" });
    execSync(`git config user.email "${userEmail}"`, { stdio: "inherit" });
    return true;
  }
}

// Detect current repository URL if any
function getCurrentRepoUrl() {
  try {
    return execSync("git config --get remote.origin.url", { stdio: "pipe" })
      .toString()
      .trim();
  } catch (error) {
    return null;
  }
}

export default async function pushToGitHub() {
  try {
    console.log(chalk.blue("\n🔄 Initializing Git..."));

    // Initialize git if needed
    if (!fs.existsSync(".git")) {
      execSync("git init", { stdio: "inherit" });
      console.log(chalk.green("✅ Git repository initialized"));
    }

    // Ensure git config is set up
    await ensureGitConfig();

    // Check and create .gitignore first
    if (!fs.existsSync(".gitignore")) {
      console.log(chalk.blue("\n📝 Creating .gitignore file..."));
      fs.writeFileSync(
        ".gitignore",
        "node_modules/\n" +
          ".env\n" +
          ".DS_Store\n" +
          "dist/\n" +
          "build/\n" +
          "*.log\n" +
          ".env.local\n" +
          ".env.development.local\n" +
          ".env.test.local\n" +
          ".env.production.local\n" +
          "npm-debug.log*\n" +
          "yarn-debug.log*\n" +
          "yarn-error.log*\n"
      );
      console.log(chalk.green("✅ Created .gitignore file"));
    }

    // Get repository history and current repo URL
    const history = getRepoHistory();
    const currentRepoUrl = getCurrentRepoUrl();

    // Smart repository setup
    const { repoSetup } = await inquirer.prompt([
      {
        type: "list",
        name: "repoSetup",
        message: "Repository setup:",
        choices: [
          ...(currentRepoUrl
            ? [
                {
                  name: `Continue with current repository (${currentRepoUrl})`,
                  value: "current",
                },
              ]
            : []),
          ...(history.lastUsedRepo && history.lastUsedRepo !== currentRepoUrl
            ? [
                {
                  name: `Use last repository (${history.lastUsedRepo})`,
                  value: "last",
                },
              ]
            : []),
          {
            name: "Create new repository",
            value: "new",
          },
          {
            name: "Use existing repository",
            value: "existing",
          },
        ],
        default: currentRepoUrl ? "current" : "new",
      },
    ]);

    let finalRepoUrl = currentRepoUrl;
    let repoName, repoDescription;

    switch (repoSetup) {
      case "new":
        ({ repoName, repoDescription } = await inquirer.prompt([
          {
            type: "input",
            name: "repoName",
            message: "New repository name:",
            validate: (input) =>
              input.trim().length > 0 || "Repository name is required",
          },
          {
            type: "input",
            name: "repoDescription",
            message: "Repository description (optional):",
            default: "My awesome MERN project",
          },
        ]));
        break;
      case "existing":
        ({ finalRepoUrl } = await inquirer.prompt([
          {
            type: "input",
            name: "finalRepoUrl",
            message: "Repository URL:",
            validate: (input) =>
              input.trim().length > 0 || "Repository URL is required",
          },
        ]));
        break;
      case "last":
        finalRepoUrl = history.lastUsedRepo;
        break;
    }

    // Smart branch handling
    let currentBranch;
    try {
      currentBranch = execSync("git rev-parse --abbrev-ref HEAD", {
        stdio: "pipe",
      })
        .toString()
        .trim();
    } catch (error) {
      // If this fails, it means there are no commits yet
      currentBranch = "";
      // Create initial commit if no commits exist
      execSync("git add .", { stdio: "inherit" });
      execSync('git commit -m "Initial commit"', { stdio: "inherit" });
      console.log(chalk.green("✅ Created initial commit"));
    }

    const { branchSetup } = await inquirer.prompt([
      {
        type: "list",
        name: "branchSetup",
        message: "Branch setup:",
        choices: [
          ...(currentBranch
            ? [
                {
                  name: `Continue with current branch (${currentBranch})`,
                  value: "current",
                },
              ]
            : []),
          ...(history.lastUsedBranch && history.lastUsedBranch !== currentBranch
            ? [
                {
                  name: `Use last branch (${history.lastUsedBranch})`,
                  value: "last",
                },
              ]
            : []),
          {
            name: "Create/switch to a different branch",
            value: "new",
          },
        ],
        default: "current",
      },
    ]);

    let finalBranchName = currentBranch || "main";

    if (branchSetup === "new") {
      ({ finalBranchName } = await inquirer.prompt([
        {
          type: "input",
          name: "finalBranchName",
          message: "Branch name:",
          default: "main",
          validate: (input) =>
            input.trim().length > 0 || "Branch name is required",
        },
      ]));
    } else if (branchSetup === "last") {
      finalBranchName = history.lastUsedBranch;
    }

    // Stage and commit changes
    const status = execSync("git status --porcelain", {
      stdio: "pipe",
    }).toString();
    if (status) {
      const { commitMessage } = await inquirer.prompt([
        {
          type: "input",
          name: "commitMessage",
          message: "Enter your commit message:",
          default: "Update",
          validate: (input) =>
            input.trim().length > 0 || "Commit message is required",
        },
      ]);

      execSync("git add .", { stdio: "inherit" });
      execSync(`git commit -m "${commitMessage}"`, { stdio: "inherit" });
      console.log(chalk.green("✅ Changes committed"));
    }

    // Switch/create branch if needed
    if (currentBranch !== finalBranchName) {
      execSync(`git checkout -B ${finalBranchName}`, { stdio: "inherit" });
      console.log(chalk.green(`✅ Switched to branch '${finalBranchName}'`));
    }

    // Handle repository push
    if (repoSetup === "new") {
      try {
        execSync(
          `gh repo create "${repoName}" --public --description "${repoDescription}" --source . --remote origin --push`,
          { stdio: "inherit" }
        );
        console.log(chalk.green("✅ Repository created and pushed"));
      } catch (error) {
        if (error.message.includes("already exists")) {
          console.log(chalk.blue("↪️ Repository exists, updating remote..."));
          execSync(`git remote add origin https://github.com/${repoName}.git`, {
            stdio: "pipe",
          });
          execSync(`git push -u origin ${finalBranchName} --force`, {
            stdio: "inherit",
          });
        }
      }
    } else {
      try {
        if (finalRepoUrl !== currentRepoUrl) {
          execSync(`git remote set-url origin ${finalRepoUrl}`, {
            stdio: "pipe",
          });
        }
        execSync(`git push -u origin ${finalBranchName}`, { stdio: "inherit" });
        console.log(chalk.green("✅ Changes pushed successfully"));
      } catch (error) {
        if (error.message.includes("src refspec")) {
          execSync(`git push -u origin HEAD:${finalBranchName}`, {
            stdio: "inherit",
          });
          console.log(chalk.green("✅ Changes pushed successfully"));
        } else {
          throw error;
        }
      }
    }

    // Save history
    saveRepoHistory(
      finalRepoUrl || `https://github.com/${repoName}.git`,
      finalBranchName
    );
  } catch (error) {
    console.error(chalk.red("\n❌ GitHub push failed!"), error.message);
  }
}
