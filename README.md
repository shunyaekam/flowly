# 🎬 AI Video Generator - Create Professional Videos with AI

> **✨ Try it live at: [https://flowly.studio/](https://flowly.studio/)**

Transform your ideas into professional videos using artificial intelligence! This tool helps you create complete video storyboards with AI-generated images, videos, and audio - no video editing experience required.

## 🌟 What Does This Do?

Imagine you have an idea for a video but don't know how to make it. This tool:

1. **Takes your text description** (like "a mystery about ancient pyramids")
2. **Creates a complete video script** broken into scenes
3. **Generates images** for each scene using AI
4. **Creates videos** from those images with motion
5. **Adds appropriate sound effects and music**
6. **Packages everything** for you to download

**Perfect for**: Content creators, educators, marketers, storytellers, or anyone who wants to create videos without complex software.

---

## 🚀 Quick Start (No Setup Required!)

### **Option 1: Use the Live Web App (Recommended)**

1. **Visit**: [https://flowly.studio/](https://flowly.studio/)
2. **Describe your video**: Type what you want (e.g., "A short educational video about climate change")
3. **Choose a style**: Educational, storytelling, motivational, or conspiracy theory
4. **Generate**: Click "generate" and watch the magic happen!
5. **Download**: Get your complete video project as a ZIP file

**That's it!** No installation, no setup, just create.

---

## 📁 What's in This Repository?

This repository contains multiple versions of the AI video generator:

```
📦 aivideo/
├── 🌐 aivideo-app/          # Main web application (what you see at flowly-one.vercel.app)
├── 🐍 Python script/        # Original Python version (for developers)
├── 🎛️ streamlit/           # Alternative web interface using Streamlit
├── 🔊 sound effects/        # Audio files used in the web app
├── 🎬 final_videos/         # Example output videos
├── 📄 input-example.tsx     # Code example for developers
└── 📖 README.md            # This file!
```

### **Which Version Should You Use?**

- **🌐 Web App** (`aivideo-app/`): **Most users start here** - No setup required, just visit the website
- **🎛️ Streamlit** (`streamlit/`): Alternative interface, requires some setup
- **🐍 Python Script** (`Python script/`): For developers who want to customize the code

---

## 🎯 How to Use the Web App

### **Step 1: Describe Your Video**
Type a description of what you want. Examples:
- "A 30-second video explaining how plants grow"
- "A mysterious story about a lost civilization"  
- "An inspiring video about overcoming challenges"

### **Step 2: Choose Your Style**
- **📚 Educational**: Clear, informative content
- **📖 Storytelling**: Narrative-driven with plot
- **💪 Motivational**: Inspiring and uplifting
- **🕵️ Conspiracy**: Mysterious and intriguing

### **Step 3: Generate Content**
The AI will create:
- **Script**: Complete narration broken into scenes
- **Images**: AI-generated visuals for each scene  
- **Videos**: Motion added to images
- **Audio**: Sound effects and music

### **Step 4: Customize (Optional)**
- **Edit scenes**: Double-click any scene to modify
- **Rearrange order**: Drag scenes to reorder
- **Regenerate content**: Don't like something? Generate new versions

### **Step 5: Download**
Get a ZIP file containing:
- All video files
- Audio files
- Images
- Complete project data

---

## 🛠️ Running Your Own Copy

Want to modify the app or run it locally? Here's how:

### **Prerequisites (What You Need)**
- A computer (Mac, Windows, or Linux)
- Internet connection
- About 30 minutes of setup time

### **Step 1: Get the Code**
```bash
# Copy this repository to your computer
git clone https://github.com/yourusername/aivideo.git
cd aivideo/aivideo-app
```

### **Step 2: Install Requirements**
```bash
# Install the tools needed to run the app
npm install
```

### **Step 3: Get API Keys**
The app needs permission to use AI services:

1. **OpenAI** (for script generation):
   - Go to [platform.openai.com](https://platform.openai.com/api-keys)
   - Create an account and get an API key
   - Starts with `sk-...`

2. **Replicate** (for image/video/audio generation):
   - Go to [replicate.com](https://replicate.com/account/api-tokens)
   - Create an account and get an API token
   - Starts with `r8_...`

### **Step 4: Run the App**
```bash
# Start the application
npm run dev
```

Open your browser to `http://localhost:3000`

---

## 💰 Cost Information

### **Using AI Services**
The app uses external AI services that charge based on usage:

- **OpenAI**: ~$0.01-0.05 per video script
- **Replicate**: ~$0.50-2.00 per video (depending on length and quality)

### **Free Alternatives**
- **Demo Mode**: Try the app without API keys (limited features)
- **Live Website**: Use the hosted version at [flowly-one.vercel.app](https://flowly-one.vercel.app)

---

## 🤝 Alternative Versions

### **🎛️ Streamlit Version**
A simpler interface for basic video generation:
```bash
cd streamlit/
pip install -r requirements.txt
streamlit run app.py
```

### **🐍 Python Script**
Direct command-line tool for developers:
```bash
cd "Python script/"
pip install -r requirements.txt
python main.py
```

---

## 🆘 Troubleshooting

### **"No API key found"**
- Add your API keys in the Settings menu (top right)
- Or try Demo Mode for basic functionality

### **"Generation failed"**
- Check your internet connection
- Verify your API keys are correct
- Make sure you have credits in your AI service accounts

### **App won't start**
- Make sure you have Node.js installed
- Try deleting `node_modules/` and running `npm install` again
- Check the terminal for error messages

### **Need Help?**
- Check the `ENV_SETUP.md` file for detailed setup instructions
- Look in the `streamlit/README_GUI.md` for alternative setup
- Create an issue on GitHub if you're stuck

---

## 🎨 Features Overview

### **🧠 AI-Powered**
- **Script Generation**: OpenAI creates engaging narratives
- **Image Creation**: Replicate generates cinematic visuals
- **Video Animation**: Adds motion and life to static images
- **Audio Generation**: Creates matching soundtracks and effects

### **🎛️ User-Friendly Interface**
- **Visual Storyboard**: See your entire video at a glance
- **Drag & Drop**: Reorder scenes by dragging
- **Real-time Preview**: See changes instantly
- **Sound Effects**: Interactive audio feedback

### **💾 Project Management**
- **Save & Load**: Keep your projects organized
- **Export Options**: Download in multiple formats
- **Batch Generation**: Create all content at once
- **Individual Control**: Fine-tune each scene separately

---

## 🚀 Deployment

Want to host your own version online?

### **Easy Option: Vercel**
```bash
# Install Vercel CLI
npm install -g vercel

# Deploy from the aivideo-app directory
cd aivideo-app
vercel
```

### **Other Platforms**
- **Netlify**: Drag & drop deployment
- **Railway**: GitHub integration
- **Render**: Automatic deployments

---

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

---

## 🌟 Contributing

Want to improve the app? 
1. Fork this repository
2. Make your changes
3. Submit a pull request

We welcome all contributions, from bug fixes to new features!

---

## 🔗 Links

- **🌐 Live Demo**: [https://flowly.studio/](https://flowly.studio/)
- **📚 Documentation**: See individual folder READMEs for technical details
- **🐛 Report Issues**: Use GitHub Issues for bugs or feature requests

---

*Made with ❤️ for creators who want to bring their stories to life with AI*
--