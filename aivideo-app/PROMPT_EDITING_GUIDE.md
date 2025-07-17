# 📝 Prompt Editing Guide

## 🎯 Where to Edit Prompts

All prompt presets are now stored in one easy-to-edit file:

**📁 Location**: `aivideo-app/data/prompt-presets.json`

## ✏️ How to Edit

### **1. Edit Existing Prompts**
Open `aivideo-app/data/prompt-presets.json` and modify any prompt:

```json
{
  "educational": {
    "name": "Educational Content",
    "description": "Clear, informative content that teaches something valuable",
    "prompt": "Your custom prompt here with {input} placeholder..."
  }
}
```

### **2. Add New Prompt Types**
Add a new entry to the JSON file:

```json
{
  "existing_prompts": "...",
  "your_new_type": {
    "name": "Display Name",
    "description": "What this prompt type does",
    "prompt": "Your prompt template with {input} placeholder"
  }
}
```

### **3. Remove Prompt Types**
Simply delete the entire block for the prompt type you don't want.

## 🔧 JSON Structure

Each prompt preset has three required fields:

- **`name`**: The display name shown in the app
- **`description`**: Brief explanation of what this prompt type does
- **`prompt`**: The actual prompt template (must include `{input}` placeholder)

## 📋 Current Prompt Types

- **conspiracy**: Mysterious documentary-style content
- **educational**: Clear, informative teaching content
- **motivational**: Inspiring and uplifting content
- **storytelling**: Narrative-driven stories
- **comedy**: Funny and entertaining content
- **review**: Product/service reviews
- **tutorial**: Step-by-step how-to content
- **lifestyle**: Daily life and lifestyle content

## 💡 Prompt Writing Tips

### **Essential Elements**:
1. **Hook**: Start with attention-grabbing opening (1-2 seconds)
2. **Structure**: Define number of scenes and total duration
3. **Style**: Specify tone, language, and approach
4. **Ending**: How to conclude the video

### **Use `{input}` Placeholder**:
This gets replaced with the user's input. For example:
- `"Create a video about {input}"` becomes `"Create a video about climate change"`

### **Example Template**:
```json
{
  "my_custom_type": {
    "name": "My Custom Style",
    "description": "What makes this style unique",
    "prompt": "Create a [style] script about {input}. Start with [hook type] (1-2 seconds). Build a [X-Y] scene script (~[duration] seconds) that [main goal]. Each scene should be [scene requirements]. [Specific style guidelines]. End with [ending type]."
  }
}
```

## 🚀 After Editing

1. **Save the file**
2. **Restart your development server** (`npm run dev`)
3. **Test your new prompts** in the app
4. **Deploy to Vercel** (automatic if using GitHub integration)

## 🛠️ Troubleshooting

### **App won't start after editing**:
- Check JSON syntax using [jsonlint.com](https://jsonlint.com)
- Make sure all commas and brackets are correct
- Ensure all strings are in double quotes

### **New prompt not showing**:
- Restart the development server
- Clear browser cache
- Check console for errors

### **Prompt not working as expected**:
- Test with the same input in different prompt types
- Check that `{input}` placeholder is included
- Verify prompt follows AI model guidelines

## 📚 Advanced: Multiple Language Support

You can add language variants:

```json
{
  "educational_spanish": {
    "name": "Contenido Educativo",
    "description": "Contenido educativo en español",
    "prompt": "Crea un guión educativo sobre {input}..."
  }
}
```

## 🔄 Sharing Prompts

**Export your prompts**:
Copy the `prompt-presets.json` file to share with others.

**Import new prompts**:
Replace your `prompt-presets.json` with someone else's file.

---

*Need help? Check the main README or create an issue on GitHub!* 