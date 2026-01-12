# Dev Container Setup

This repository includes a dev container configuration for Swift development.

## Swift Dev Container
**Location**: `.devcontainer/devcontainer.json`

An Ubuntu-based container with Swift 6.0 for development. Good for:
- Editing Swift files with syntax highlighting
- Running Swift Package Manager builds
- Running unit tests (non-UI)
- Code review and documentation

**Limitations**: Cannot run Xcode, iOS Simulator, or SwiftUI Previews (requires macOS)

## Quick Start

### Using GitHub Codespaces
1. Click **Code** → **Codespaces** → **New codespace**
2. Wait for container to build (~2-3 minutes first time)
3. Swift will be available: `swift --version`

### Using VS Code Locally
1. Install [Docker Desktop](https://www.docker.com/products/docker-desktop)
2. Install [VS Code Remote - Containers](https://marketplace.visualstudio.com/items?itemName=ms-vscode-remote.remote-containers)
3. Open this folder in VS Code
4. Click "Reopen in Container" when prompted

## Building the App

### In Container (SPM - Package.swift targets only)
```bash
cd GolfTripApp
swift build
swift test
```

### Full iOS Build (requires macOS)
Use the GitHub Actions CI workflow which runs on macOS:
- Automatic on push to `main` or `develop`
- Manual trigger available in Actions tab

Or build locally on a Mac:
```bash
cd GolfTripApp
xcodebuild -project GolfTripApp.xcodeproj \
  -scheme GolfTripApp \
  -destination 'platform=iOS Simulator,name=iPhone 15' \
  build
```

## Installed Extensions

The dev container includes these VS Code extensions:
- **Swift Language** - Syntax highlighting and IntelliSense
- **GitHub Copilot** - AI pair programming
- **GitLens** - Git history visualization
- **Todo Tree** - Track TODOs in code
- **Markdown Lint** - Documentation quality

## Troubleshooting

### Container won't start
- Ensure Docker is running
- Try rebuilding: `Cmd+Shift+P` → "Dev Containers: Rebuild Container"

### Swift build fails
- This container supports SPM builds only
- Full iOS builds require macOS (use GitHub Actions)
