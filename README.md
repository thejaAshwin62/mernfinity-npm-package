# MERNfinity

[![NPM Version](https://img.shields.io/npm/v/mernfinity.svg)](https://www.npmjs.com/package/mernfinity)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)

A robust CLI tool that streamlines the build and deployment process for MERN stack applications by automating frontend builds and static file deployment.

## Features

- 🚀 **One-Command Deployment**: Automates the entire frontend build and deployment process
- 🔄 **Dependency Management**: Automatically handles frontend dependency installation
- 📁 **Flexible Directory Structure**: Supports custom frontend and backend directory paths
- 💻 **Cross-Platform**: Full support for Windows, Linux, and macOS
- 🛠️ **Vite Compatible**: Optimized for Vite-based React applications

## Installation

```bash
npm install -g mernfinity
```

## Usage

Run the following command in your MERN project root:

```bash
setup-mern
```

### Interactive Setup

The CLI will guide you through two simple prompts:

1. Frontend directory path (default: `./client`)
2. Backend public directory path (default: `./public`)

### Process Overview

1. **Frontend Dependency Installation**
   - Executes `npm install` in your frontend directory
2. **Build Process**
   - Runs `npm run build` to create production-ready assets
3. **Deployment**
   - Automatically moves built files to your specified public directory

## Project Structure

Your MERN project should follow this structure:

```
your-mern-project/
├── client/             # React frontend (customizable)
│   ├── src/
│   └── package.json
└── public/            # Backend public directory (customizable)
```

## Configuration

No additional configuration required. Directory paths can be specified through the interactive prompts.

## Requirements

- Node.js 14.0.0 or higher
- npm 6.0.0 or higher
- A MERN stack project with a Vite-based React frontend

## Error Handling

### Common Issues

**Invalid Directory Error**

```
Directory not found, please enter a valid path.
```

Solution: Ensure the specified frontend directory exists in your project.

**Build Process Error**

```
❌ Deployment failed!
```

Solution: Check your frontend's build configuration and ensure all dependencies are properly installed.

## Contributing

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## Dependencies

- [chalk](https://github.com/chalk/chalk) - Terminal string styling
- [inquirer](https://github.com/SBoudrias/Inquirer.js) - Interactive command line interface

## Author

Theja Ashwin

## Support

For issues and feature requests, please [open an issue](https://github.com/thejaAshwin62/mernfinity-npm-package) on GitHub.
