# GERAI

**GERAI** is a modern, privacy-focused desktop AI chat application built with **Electron**, **React**, **Tailwind CSS**, and **SQLite**. It offers a multi-model interface compatible with OpenAI, ~~Grok~~, ~~Gemini~~, ~~Claude~~ (via API), featuring persistent local history and a clean, minimalist design.

![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)

## 🚀 Features

*   **Multi-Model Support**: Switch seamlessly between GPT-4, GPT-3.5, and potentially other models.
*   **Privacy-First**: All conversation history is stored locally on your machine using SQLite.
*   **Bring Your Own Key (BYOK)**: No middleman. Your API keys are stored securely in your local environment.
*   **Native Performance**: Built on Electron and Vite for a snappy, responsive experience.
*   **Minimalist UI**: Distraction-free chat interface inspired by the best in class.

## 🛠️ Tech Stack

*   **Runtime**: [Electron](https://www.electronjs.org/)
*   **Frontend**: [React](https://react.dev/), [Vite](https://vitejs.dev/), [Tailwind CSS](https://tailwindcss.com/)
*   **Backend Logic**: Electron Main Process (Node.js)
*   **Database**: [SQLite](https://www.sqlite.org/index.html)

## 📦 Installation

To build and run GERAI locally, you'll need [Node.js](https://nodejs.org/) (v16+) and [Git](https://git-scm.com/) installed.

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
    This will start the Vite dev server and launch the Electron window.

## 🏗️ Building for Production

To create a distributable application for your OS (macOS, Windows, Linux):

```bash
npm run dist
```
The output binaries will be located in the `dist-electron/` folder.

## 🤝 Contributing

Contributions are welcome! Please read our [CONTRIBUTING.md](CONTRIBUTING.md) for details on our code of conduct, and the process for submitting pull requests.

## 📄 License

This project is licensed under the [MIT License](LICENSE).
