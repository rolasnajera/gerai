# GERAI

**GERAI** is a modern, privacy‑focused desktop AI chat application built with **Electron**, **React**, **TypeScript**, **Tailwind CSS**, and **SQLite**. It provides a fast OpenAI‑powered chat experience with persistent local history and a clean, minimalist design.

![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)

## 🚀 Features

- **Mock Model for Development**: Use the `Mock Model` to test UI and streaming without incurring OpenAI API costs. It's the default in development.
- **OpenAI Models**: Choose between `gpt-5-nano`, `gpt-5-mini`, and `gpt-5` (via OpenAI API).
- **Privacy‑First**: Conversation history is stored locally (SQLite in your OS user data folder).
- **Bring Your Own Key (BYOK)**: Enter your OpenAI API key in‑app (stored locally via secure storage/LocalStorage).
- **Native Performance**: Electron + Vite dev server for instant feedback; bundled via `tsup` and packaged with `electron‑builder`.
- **Minimalist UI**: Distraction‑free chat with a configurable system prompt.

## 🛠️ Tech Stack

- **Runtime**: [Electron](https://www.electronjs.org/)
- **Frontend**: [React](https://react.dev/), [Vite](https://vitejs.dev/), [Tailwind CSS](https://tailwindcss.com/)
- **Language/Build**: [TypeScript](https://www.typescriptlang.org/), [tsup](https://tsup.egoist.dev/)
- **Packaging**: [electron‑builder](https://www.electron.build/)
- **Database**: [SQLite](https://www.sqlite.org/index.html) (stored in Electron `app.getPath('userData')`)
- **Testing**: [Vitest](https://vitest.dev/) (Unit/Component), [Playwright](https://playwright.dev/) (E2E)

## 📦 Installation

### For Users

**macOS (Apple Silicon)**

1.  **Download the latest release**
    - Go to [Releases](https://github.com/rolasnajera/gerai/releases)
    - Download `GERAI-X.X.X-arm64.dmg` (where X.X.X is the version number)

2.  **Install the application**
    - Open the downloaded `.dmg` file
    - Drag **GERAI** to your Applications folder
    - Launch GERAI from Applications

3.  **Set your OpenAI API key**
    - Open the app, click the gear icon (Settings)
    - Paste your OpenAI API key
    - Optionally set a custom system prompt
    - Your key is stored locally on your machine; no server or proxy is used

**Auto-Updates**

Once installed, GERAI will automatically check for updates and notify you when new versions are available. Simply click "Install Now" when prompted to update to the latest version.

### For Developers

To build and run GERAI locally, you'll need [Node.js](https://nodejs.org/) (v18+ recommended) and [Git](https://git-scm.com/) installed.

1.  **Clone the repository**

    ```bash
    git clone https://github.com/rolasnajera/gerai.git
    cd gerai
    ```

2.  **Install dependencies**

    ```bash
    npm install
    ```

3.  **Run in Development Mode**
    ```bash
    npm run dev
    ```
    This starts the Vite dev server and the Electron app (auto‑reloading the main process via `tsup`).
    In development mode, the **Mock Model** is selected by default, allowing you to test the chat interface and streaming without an API key or costs.

## 🏗️ Building for Production

To create a distributable application for your OS (macOS, Windows, Linux):

```bash
npm run dist
```

The packaged installers/binaries will be located in the `release/` folder.

## 🧪 Testing

The project uses **Vitest** for unit and component testing, and **Playwright** for end-to-end (E2E) integration testing.

### Unit & Component Tests

Unit tests are used for testing individual functions and React components. They are located alongside the source code with the `.test.ts` or `.test.tsx` extension.

- **Run unit tests**:
  ```bash
  npm run test:unit
  ```
- **Run unit tests in watch mode**:
  ```bash
  npm run test:unit -- --watch
  ```

### End-to-End (Integration) Tests

E2E tests ensure that the entire application works as expected by launching the Electron app and simulating user interactions. These tests are located in the `e2e/` directory.

- **Run E2E tests**:
  ```bash
  npm run test:e2e
  ```

### Adding New Tests

- **Unit Tests**: Create a file named `filename.test.ts` (for logic) or `ComponentName.test.tsx` (for React components) in the same directory as the file you are testing.
- **E2E Tests**: Create a new `.spec.ts` file in the `e2e/` directory. See `e2e/example.spec.ts` for a reference implementation.

## 🚀 Releases & CI/CD

This project uses **GitHub Actions** for automated releases. To start a new release (e.g., version `0.0.1`):

1.  **Update Version**: The version in `package.json` should be set (e.g., `"0.0.1"`).
2.  **Tag the commit**:
    ```bash
    git tag v0.0.1
    ```
3.  **Push the tag**:
    `bash
    git push origin v0.0.1
    `
    GitHub Actions will automatically build the application for **macOS** and upload the binaries to a new GitHub Release.

If you only want a production build without packaging:

```bash
npm run build
```

This generates the renderer bundle in `dist/` and the Electron main/preload bundles in `dist-electron/`.

## ⚙️ Configuration Notes

- Database file location: stored under your OS user data directory (e.g., `~/Library/Application Support/GERAI/gerai.db` on macOS).
- Models available by default: `gpt-5-nano`, `gpt-5-mini`, `gpt-5`.
- **Mock Model**: Available in the model selector. It generates simulated streaming responses and does not require an internet connection or API key.
- No `.env` is required; configuration is handled in‑app.

## 🤝 Contributing

Contributions are welcome! Please read our [CONTRIBUTING.md](CONTRIBUTING.md) for details on our code of conduct, and the process for submitting pull requests.

## 📄 License

This repository contains the **Open Source Core** of GERAI, which is licensed under the [MIT License](LICENSE).

For users and organizations needing advanced features, we offer **GERAI Pro**, which includes:

- **Cloud Sync**: Firestore-backed synchronization across devices.
- **Teams**: Shared workspaces and collaborative features.
- **Mobile App**: Native iOS and Android applications.

The **Core UI** and **Local Logic** remain open source (MIT). The **Sync Engine** and **Mobile UI** are proprietary.

© 2025 Rolas Najera.
