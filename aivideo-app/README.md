# AI Video Generator

An intelligent video creation tool that generates complete video storyboards with AI-generated images, videos, and audio.

## Features

- **AI Storyboard Generation**: Create detailed video scripts using OpenAI
- **Image Generation**: Generate cinematic images with Replicate's Seedream model
- **Video Generation**: Create videos from images using Kling 2.1 Pro
- **Audio Generation**: Add sound and music using Thinksound
- **Project Management**: Save complete projects with all generated assets
- **Interactive Storyboard**: Visual node-based storyboard editor
- **Multiple Formats**: Support for conspiracy, educational, motivational, and storytelling formats

## Setup

### 1. Install Dependencies

```bash
npm install
```

### 2. API Keys Setup

**⚠️ IMPORTANT**: You need API keys to use the generation features.

**Recommended Method**: Add API keys through the app's Settings modal:
- **OpenAI API Key**: For advanced storyboard generation (optional - demo mode available)
- **Replicate API Token**: For image/video/audio generation (required)

**Alternative**: You can also set OpenAI key via environment variables:

```bash
# Create .env.local file (optional)
OPENAI_API_KEY=sk-your-openai-api-key-here
```

See `ENV_SETUP.md` for detailed setup instructions.

### 3. Run the Development Server

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) with your browser.

## Usage

1. **Create Storyboard**: Enter your video concept and select a format
2. **Generate Content**: Use individual scene generation or batch "Generate All"
3. **Edit & Refine**: Modify prompts and regenerate specific content
4. **Save Project**: Download a ZIP file with all generated assets

## Learn More

To learn more about Next.js, take a look at the following resources:

- [Next.js Documentation](https://nextjs.org/docs) - learn about Next.js features and API.
- [Learn Next.js](https://nextjs.org/learn) - an interactive Next.js tutorial.

You can check out [the Next.js GitHub repository](https://github.com/vercel/next.js) - your feedback and contributions are welcome!

## Deploy on Vercel

The easiest way to deploy your Next.js app is to use the [Vercel Platform](https://vercel.com/new?utm_medium=default-template&filter=next.js&utm_source=create-next-app&utm_campaign=create-next-app-readme) from the creators of Next.js.

Check out our [Next.js deployment documentation](https://nextjs.org/docs/app/building-your-application/deploying) for more details.
