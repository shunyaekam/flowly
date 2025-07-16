# API Keys Setup

The AI Video Generator uses API keys for different services. Here's how to set them up:

## API Keys Overview

### 1. OpenAI API Key (Optional)
- **Purpose**: Advanced storyboard generation
- **Get your key**: https://platform.openai.com/api-keys
- **Format**: `sk-...`
- **Where to add**: In the app's Settings modal
- **Fallback**: Demo mode with pre-built storyboards

### 2. Replicate API Token (Required for Generation)
- **Purpose**: Image, video, and audio generation
- **Get your token**: https://replicate.com/account/api-tokens
- **Format**: `r8_...`
- **Where to add**: In the app's Settings modal

## Setup Instructions

### Option 1: Use Settings Modal (Recommended)
1. Run the app: `npm run dev`
2. Click "Settings" in the top navigation
3. Enter your API keys in the form
4. Keys are saved in browser localStorage for future sessions

### Option 2: Environment Variables (For OpenAI only)
If you prefer to use environment variables for OpenAI:

1. Create a `.env.local` file in the aivideo-app directory:

```bash
# OpenAI API Key for storyboard generation (optional)
OPENAI_API_KEY=sk-your-openai-api-key-here
```

2. Restart your development server:

```bash
npm run dev
```

## Important Notes

- **Replicate API keys**: Must be entered through the Settings modal (not environment variables)
- **OpenAI API keys**: Can be entered through Settings modal OR environment variables
- **Demo Mode**: Available for storyboard generation without OpenAI key
- **Generation Features**: Require Replicate API key in settings

## Security

- API keys entered in settings are stored in browser localStorage only
- Never commit `.env.local` files to version control
- For production deployment, use your hosting platform's environment variable settings

## Troubleshooting

1. **"No API key found"**: Add your keys in the Settings modal
2. **Generation not working**: Ensure Replicate API key is added in Settings
3. **Environment variables not loading**: Restart your development server 