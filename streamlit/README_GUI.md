# AI Video Generator - Streamlit GUI App

A user-friendly web-based GUI application for generating AI videos with images, motion, and sound using various AI models.

## Features

- **Step-by-step workflow**: Intuitive 6-step process from prompt to final video
- **OpenAI Storyboard Generation**: Automatically creates detailed storyboards from text prompts
- **AI Image Generation**: Creates images using Replicate's image generation models
- **AI Video Generation**: Converts images to videos with motion
- **AI Sound Generation**: Adds audio/sound effects to videos
- **Local Project Management**: Saves all generated content to organized local folders
- **Real-time Progress Tracking**: Visual progress bars for all generation steps
- **Content Editing**: Edit prompts and regenerate individual scenes
- **Project Preview**: Preview all content before saving

## Installation

1. **Install Dependencies**
   ```bash
   pip install -r requirements.txt
   ```

2. **Set up Environment Variables**
   Create a `.env` file in the project root with your API keys:
   ```
   OPENAI_API_KEY=your_openai_api_key_here
   REPLICATE_API_TOKEN=your_replicate_api_token_here
   ```

3. **Run the Application**
   ```bash
   streamlit run app.py
   ```

## Usage

### Step 1: Enter Your Video Concept
- Enter a detailed description of the video you want to create
- Example: "A dramatic story about a robot discovering emotions in a futuristic city"
- Click "Generate Storyboard" to proceed

### Step 2: Review Your Storyboard
- Review the automatically generated storyboard with multiple scenes
- Edit scene descriptions, image prompts, video prompts, and sound prompts
- Add or remove scenes as needed
- Click "Next: Generate Images" when satisfied

### Step 3: Generate Images
- Click "Generate All Images" to create images for each scene
- View generated images and their prompts
- Regenerate individual images if needed
- Proceed to video generation once all images are ready

### Step 4: Generate Videos
- Click "Generate All Videos" to create videos from the images
- View generated videos alongside their source images
- Regenerate individual videos if needed
- Proceed to sound generation once all videos are ready

### Step 5: Generate Sounds
- Click "Generate All Sounds" to add audio to your videos
- View final videos with sound effects
- Compare original videos with the sound-enhanced versions
- Regenerate individual sounds if needed

### Step 6: Save Your Project
- Review project summary and preview all content
- Click "Save to Local Repository" to download all files
- Access saved files in organized project folders
- Open project folder directly from the app
- Start a new project or go back to make changes

## Project Structure

When you save a project, it creates a timestamped folder in `final_videos/` with:

```
final_videos/
└── project_YYYYMMDD_HHMMSS/
    ├── original_prompt.txt          # Your original prompt
    ├── storyboard.json             # Complete storyboard data
    ├── scene_1_description_image.png    # Generated images
    ├── scene_1_description_video.mp4    # Videos without sound
    ├── scene_1_description_final.mp4    # Final videos with sound
    ├── scene_2_description_image.png
    ├── scene_2_description_video.mp4
    ├── scene_2_description_final.mp4
    └── ...
```

## API Requirements

### OpenAI API
- Used for generating storyboards from text prompts
- Requires GPT-4 access
- Set `OPENAI_API_KEY` in your `.env` file

### Replicate API
- Used for image generation: `bytedance/seedream-3`
- Used for video generation: `kwaivgi/kling-v2.1`
- Used for sound generation: `zsxkib/thinksound`
- Set `REPLICATE_API_TOKEN` in your `.env` file

## Navigation Features

- **Step Indicator**: Visual progress indicator at the top
- **Back/Next Buttons**: Navigate between steps
- **Smart Validation**: Next step only enables when current step is complete
- **Session State**: Maintains all data throughout the workflow
- **Error Handling**: Clear error messages and recovery options

## Tips for Best Results

1. **Detailed Prompts**: Use descriptive, specific prompts for better generation quality
2. **Consistent Style**: Maintain consistent visual style across scenes in your prompts
3. **Logical Flow**: Ensure scenes flow logically from one to the next
4. **Review Before Generation**: Double-check all prompts before starting generation
5. **Patience**: AI generation takes time, especially for videos and sounds

## Troubleshooting

- **API Errors**: Check your API keys and quotas
- **Generation Failures**: Try regenerating individual scenes
- **Performance**: Close other applications for better performance
- **Storage**: Ensure sufficient disk space for video files
- **Network**: Stable internet connection required for API calls

## System Requirements

- **Python**: 3.8 or higher
- **RAM**: 4GB minimum, 8GB recommended
- **Storage**: 1GB free space for project files
- **Internet**: Stable connection for API calls
- **Browser**: Modern web browser (Chrome, Firefox, Safari, Edge)

## Original CLI Version

The original command-line version (`main.py`) is still available for batch processing and advanced users who prefer CLI workflows.

## License

This project is licensed under the MIT License. See the LICENSE file for details. 