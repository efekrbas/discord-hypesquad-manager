# Discord HypeSquad Badge Manager (Desktop App)

A modern, secure desktop application that lets you easily manage your Discord HypeSquad badges without complex manual requests.

![App Screenshot](https://via.placeholder.com/800x400?text=App+Screenshot+Placeholder)

## ✨ Features

- 🖥️ **Desktop Application**: Runs securely on your PC (Windows).
- 🔒 **Secure Login**: Logs in directly via Discord's official login page. Your token is stored locally on your device.
- 👤 **Profile View**: Displays your current Avatar, Username, and HypeSquad Badge.
- ⚡ **Instant Switching**: Switch between Bravery, Brilliance, and Balance instantly.
- 🛡️ **Rate Limit Handling**: Smartly handles Discord's rate limits by telling you exactly when you can switch again.
- 🎨 **Modern Design**: Sleek interface inspired by Discord's own UI.

## HypeSquad Houses

| House | Badge | Description |
|:---:|:---:|---|
| **Bravery** | <img src="images/hypesquadbravery.svg" width="48" height="48" alt="Bravery"> | Courage and risk-taking |
| **Brilliance** | <img src="images/hypesquadbrilliance.svg" width="48" height="48" alt="Brilliance"> | Creativity and innovation |
| **Balance** | <img src="images/hypesquadbalance.svg" width="48" height="48" alt="Balance"> | Harmony and balance |

## How to Use

You can use this application in two ways: **Web Browser** or **Desktop App**.

### Method 1: Web Browser (No Download Required)
Simply visit the website to use the tool directly in your browser:
🔗 **[Click here to open Discord HypeSquad Manager](https://efekrbas.github.io/discord-hypesquad-manager/)**

#### 🔑 Getting Your Token
1.  **Watch this video if you don't know how:** [https://youtu.be/rcwWex7aqTo](https://youtu.be/rcwWex7aqTo)
2.  Open the [discord-hypesquad-manager](https://efekrbas.github.io/discord-hypesquad-manager/)
3.  Enter your **Discord Token** in the input field.
4.  Select the **HypeSquad Badge** you want (Bravery, Brilliance, or Balance).
5.  Click the **"Add Badge"** button.

### Method 2: Desktop Application (Windows) - (Recommended)
If you prefer a standalone app:
1.  Go to the **[Releases](../../releases)** page of this repository.
2.  Download the latest `Discord.HypeSquad.Manager.Setup.v1.0.0.exe` (or latest version).
3.  Double-click the file to install and launch the application.

## 🛠️ For Developers (Build from Source)

If you want to modify or build the app yourself:

1.  **Clone the repository**:
    ```bash
    git clone https://github.com/efekrbas/discord-hypesquad-manager.git
    cd discord-hypesquad-manager
    ```

2.  **Install dependencies**:
    ```bash
    npm install
    ```

3.  **Run locally**:
    ```bash
    npm start
    ```
    (Or double-click `start_app.bat` on Windows)

4.  **Build .exe**:
    ```bash
    npm run build
    ```
    The output will be in the `dist` folder.

## ⚠️ Disclaimer

- This tool is for educational purposes.
- **Never share your token** with anyone.
- Use this tool responsibly and in accordance with Discord's Terms of Service.

## 📄 License

ISC

