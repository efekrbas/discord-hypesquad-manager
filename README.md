# Discord HypeSquad Badge Manager

A modern web application that lets you easily manage your Discord HypeSquad badges.

## ✨ Features

- 🎯 **Easy to Use**: Simple and intuitive interface
- 🏆 **All HypeSquad Badges**: Bravery (Purple), Brilliance (Red), Balance (Green)
- 🔒 **Secure**: Your token is stored only in your browser
- 📱 **Responsive**: Works on mobile and desktop
- ⚡ **Fast**: Instant badge switching
- 🎨 **Modern Design**: Visual style aligned with Discord theme

## Usage

1. **Getting Your Token**:
   - https://youtu.be/rcwWex7aqTo (If you don't know how to get it, watch this.)

2. **Using the App**:
   - Open the [discord-hypesquad-manager](https://efekrbas.github.io/discord-hypesquad-manager/)
   - Enter your Discord token
   - Select the HypeSquad badge you want
   - Click the "Add Badge" button

## HypeSquad Houses

| House | Badge | Description |
|:---:|:---:|---|
| **Bravery** | <img src="images/bravery.png" width="48" height="48" alt="Bravery"> | Courage and risk-taking |
| **Brilliance** | <img src="images/brilliance.png" width="48" height="48" alt="Brilliance"> | Creativity and innovation |
| **Balance** | <img src="images/balance.png" width="48" height="48" alt="Balance"> | Harmony and balance |

## 📁 File Structure

```
discord-hypesquad-manager/
├── index.html          # Main HTML file
├── script.js           # JavaScript logic
├── style.css           # CSS styles
└── README.md           # This file
```

## ⚠️ Important Notices

- **Token Security**: Never share your Discord token!
- **Responsibility**: You are responsible for how you use this tool
- **Discord ToS**: Use in accordance with Discord’s Terms of Service

## 🔧 Technical Details

- **API Endpoint**: `https://discord.com/api/v9/hypesquad/online`
- **Method**: POST (add badge), DELETE (remove badge)
- **Requirements**: Modern web browser, internet connection

## 🐛 Troubleshooting

### Common Errors:

1. **401 Unauthorized**: Token is invalid or expired
2. **429 Too Many Requests**: Too many requests; wait a bit
3. **Network Error**: Check your internet connection

### Solutions:

- Obtain your token again
- Wait a few minutes and try again
- If using a VPN, try disabling it

## 📝 Changelog

- **v1.0**: Initial release
  - Basic badge management
  - Modern UI
  - Token storage
