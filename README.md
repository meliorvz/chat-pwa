# AI Chat PWA

A Progressive Web App for chatting with various AI models including OpenAI's GPT and Anthropic's Claude.

## Features

- Support for multiple AI models (GPT-4, GPT-3.5, Claude, etc.)
- Secure local storage of API keys
- Progressive Web App capabilities
- Mobile-friendly interface
- Offline support
- No backend required

## Setup

1. Clone the repository:
```bash
git clone <your-repo-url>
cd chat-pwa
```

2. Install dependencies:
```bash
npm install
```

3. Start development server:
```bash
npm start
```

4. Build for production:
```bash
npm run build
```

## Deployment

This app is configured for deployment on Cloudflare Pages:

1. Push your code to GitHub
2. Connect your GitHub repository to Cloudflare Pages
3. Use these build settings:
   - Build command: `npm run build`
   - Build output directory: `build`
   - Framework preset: Create React App

## Usage

1. Open the app and click the settings icon
2. Enter your API keys for the services you want to use
3. Select a model from the menu
4. Start chatting!

## Security

- API keys are stored locally in your browser using IndexedDB
- No data is sent to any server except the AI providers
- All communication is done over HTTPS 