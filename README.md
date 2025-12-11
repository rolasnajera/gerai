# GERAI

**GERAI** is a modern, privacy‑focused desktop AI chat application built with **Electron**, **React**, **TypeScript**, **Tailwind CSS**, and **SQLite**. It provides a fast OpenAI‑powered chat experience with persistent local history and a clean, minimalist design.

![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)

## 🚀 Features

*   **OpenAI Models**: Choose between `gpt-5-nano`, `gpt-5-mini`, and `gpt-5` (via OpenAI API).
*   **Privacy‑First**: Conversation history is stored locally (SQLite in your OS user data folder).
*   **Bring Your Own Key (BYOK)**: Enter your OpenAI API key in‑app (stored locally via secure storage/LocalStorage).
*   **Native Performance**: Electron + Vite dev server for instant feedback; bundled via `tsup` and packaged with `electron‑builder`.
*   **Minimalist UI**: Distraction‑free chat with a configurable system prompt.

## 🛠️ Tech Stack

*   **Runtime**: [Electron](https://www.electronjs.org/)
*   **Frontend**: [React](https://react.dev/), [Vite](https://vitejs.dev/), [Tailwind CSS](https://tailwindcss.com/)
*   **Language/Build**: [TypeScript](https://www.typescriptlang.org/), [tsup](https://tsup.egoist.dev/)
*   **Packaging**: [electron‑builder](https://www.electron.build/)
*   **Database**: [SQLite](https://www.sqlite.org/index.html) (stored in Electron `app.getPath('userData')`)

## 📦 Installation

To build and run GERAI locally, you'll need [Node.js](https://nodejs.org/) (v18+ recommended) and [Git](https://git-scm.com/) installed.

1.  **Clone the repository**
    ```bash
    git clone https://github.com/yourusername/gerai.git
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

4.  **Set your OpenAI API key**
    - Open the app, click the gear icon (Settings), paste your API key, and optionally set a system prompt.
    - Your key is stored locally on your machine; no server or proxy is used.

## 🏗️ Building for Production

To create a distributable application for your OS (macOS, Windows, Linux):

```bash
npm run dist
```
The packaged installers/binaries will be located in the `release/` folder.

If you only want a production build without packaging:

```bash
npm run build
```
This generates the renderer bundle in `dist/` and the Electron main/preload bundles in `dist-electron/`.

## ⚙️ Configuration Notes

- Database file location: stored under your OS user data directory (e.g., `~/Library/Application Support/GERAI/gerai.db` on macOS).
- Models available by default: `gpt-5-nano`, `gpt-5-mini`, `gpt-5`.
- No `.env` is required; configuration is handled in‑app.

## 🤝 Contributing

Contributions are welcome! Please read our [CONTRIBUTING.md](CONTRIBUTING.md) for details on our code of conduct, and the process for submitting pull requests.

## 📄 License

This project is licensed under the [MIT License](LICENSE). © 2025 Rolas Najera.
