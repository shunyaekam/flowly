import streamlit as st
import os
from openai import OpenAI
from dotenv import load_dotenv
import json
import replicate
import asyncio
import requests
import re
from datetime import datetime
import tempfile
import shutil
from pathlib import Path

# Load environment variables
load_dotenv()

# Page config
st.set_page_config(
    page_title="AI Video Generator",
    page_icon="🎬",
    layout="wide",
    initial_sidebar_state="collapsed"
)

# Custom CSS for clean storyboard layout
st.markdown("""
<style>
/* Global styling */
.block-container {
    padding: 1rem 2rem;
    max-width: 100%;
}

/* Clean storyboard panel styling */
.storyboard-panel {
    background: white;
    border: 2px solid #e2e8f0;
    border-radius: 12px;
    margin: 8px;
    overflow: hidden;
    box-shadow: 0 2px 8px rgba(0,0,0,0.1);
    transition: all 0.3s ease;
    height: 100%;
}

.storyboard-panel:hover {
    border-color: #6366f1;
    box-shadow: 0 4px 12px rgba(99, 102, 241, 0.15);
}

/* Panel header */
.panel-header {
    background: linear-gradient(135deg, #6366f1 0%, #8b5cf6 100%);
    color: white;
    padding: 12px 16px;
    font-weight: 600;
    font-size: 16px;
    text-align: center;
    border-bottom: 2px solid #e2e8f0;
}

/* Status indicators */
.status-row {
    display: flex;
    justify-content: center;
    gap: 12px;
    padding: 8px;
    background: #f8fafc;
    border-bottom: 1px solid #e2e8f0;
    font-size: 18px;
}

.status-indicator {
    opacity: 0.4;
    transition: all 0.3s ease;
}

.status-indicator.completed {
    opacity: 1;
    transform: scale(1.1);
}

/* Content preview area */
.content-preview {
    min-height: 200px;
    display: flex;
    align-items: center;
    justify-content: center;
    background: #fafbfc;
    border-bottom: 1px solid #e2e8f0;
    position: relative;
}

.content-preview img, .content-preview video {
    max-width: 100%;
    max-height: 180px;
    border-radius: 6px;
}

.placeholder-text {
    color: #64748b;
    font-style: italic;
    text-align: center;
    padding: 20px;
}

/* Script text */
.script-text {
    padding: 12px 16px;
    font-size: 14px;
    line-height: 1.4;
    color: #334155;
    background: white;
    border-bottom: 1px solid #e2e8f0;
    min-height: 60px;
}

/* Generation controls */
.generation-controls {
    padding: 12px 16px;
    background: #f8fafc;
    display: flex;
    flex-direction: column;
    gap: 8px;
}

/* Compact buttons */
.stButton > button {
    width: 100%;
    height: 32px !important;
    min-height: 32px !important;
    padding: 4px 12px !important;
    font-size: 12px !important;
    font-weight: 500;
    border-radius: 6px;
    border: 1px solid #e2e8f0;
    background: white;
    color: #475569;
    transition: all 0.2s ease;
}

.stButton > button:hover {
    background: #6366f1;
    color: white;
    border-color: #6366f1;
    transform: translateY(-1px);
}

.stButton > button:disabled {
    opacity: 0.5;
    cursor: not-allowed;
    transform: none;
}

/* Text areas in expanders */
.stTextArea > div > div > textarea {
    border: 1px solid #e2e8f0;
    border-radius: 6px;
    font-size: 12px;
    min-height: 60px !important;
    background: white;
}

/* Expander styling */
.streamlit-expanderHeader {
    font-size: 12px !important;
    font-weight: 500;
    color: #64748b;
}

/* Hide streamlit elements */
.stDeployButton {
    display: none;
}

footer {
    display: none;
}

/* Responsive adjustments */
@media (max-width: 768px) {
    .status-row {
        font-size: 16px;
        gap: 8px;
    }
    
    .content-preview {
        min-height: 150px;
    }
}
</style>
""", unsafe_allow_html=True)

# Initialize session state
if "current_step" not in st.session_state:
    st.session_state.current_step = 0  # 0: input, 1: storyboard view with progressive content

if "initial_prompt" not in st.session_state:
    st.session_state.initial_prompt = ""

if "selected_format" not in st.session_state:
    st.session_state.selected_format = "conspiracy"

if "custom_topic_prompts" not in st.session_state:
    st.session_state.custom_topic_prompts = {}

if "show_advanced_settings" not in st.session_state:
    st.session_state.show_advanced_settings = False

if "generation_mode" not in st.session_state:
    st.session_state.generation_mode = "all_at_once"  # "all_at_once" or "one_by_one"

if "current_generation_step" not in st.session_state:
    st.session_state.current_generation_step = "none"  # "none", "images", "videos", "sounds", "complete"

if "individual_generation_index" not in st.session_state:
    st.session_state.individual_generation_index = 0

if "storyboard_data" not in st.session_state:
    st.session_state.storyboard_data = None

if "scene_states" not in st.session_state:
    st.session_state.scene_states = []

if "scene_data" not in st.session_state:
    st.session_state.scene_data = []

if "project_dir" not in st.session_state:
    st.session_state.project_dir = None

# Helper functions for scene state management
def initialize_scene_states(scenes):
    """Initialize scene states for each scene"""
    st.session_state.scene_states = []
    st.session_state.scene_data = []
    
    for i, scene in enumerate(scenes):
        # Scene state tracking
        scene_state = {
            "image_generated": False,
            "video_generated": False,
            "sound_generated": False
        }
        
        # Scene data with editable prompts and generated content
        scene_data = {
            "scene_text": scene["scene"],
            "scene_image_prompt": scene["scene_image_prompt"],
            "scene_video_prompt": scene["scene_video_prompt"],
            "scene_sound_prompt": scene["scene_sound_prompt"],
            "generated_image": None,
            "generated_video": None,
            "generated_sound": None
        }
        
        st.session_state.scene_states.append(scene_state)
        st.session_state.scene_data.append(scene_data)

def get_scene_state(index):
    """Get scene state for a specific scene"""
    if index < len(st.session_state.scene_states):
        return st.session_state.scene_states[index]
    return None

def update_scene_state(index, key, value):
    """Update scene state for a specific scene"""
    if index < len(st.session_state.scene_states):
        st.session_state.scene_states[index][key] = value

def get_scene_data(index):
    """Get scene data for a specific scene"""
    if index < len(st.session_state.scene_data):
        return st.session_state.scene_data[index]
    return None

def update_scene_data(index, key, value):
    """Update scene data for a specific scene"""
    if index < len(st.session_state.scene_data):
        st.session_state.scene_data[index][key] = value

def reset_from_step(index, step):
    """Reset a scene from a specific step, clearing all dependent steps"""
    scene_state = get_scene_state(index)
    scene_data = get_scene_data(index)
    
    if not scene_state or not scene_data:
        return
    
    if step == "image":
        # Reset image and all dependent steps
        update_scene_data(index, "generated_image", None)
        update_scene_data(index, "generated_video", None)
        update_scene_data(index, "generated_sound", None)
        update_scene_state(index, "image_generated", False)
        update_scene_state(index, "video_generated", False)
        update_scene_state(index, "sound_generated", False)
    
    elif step == "video":
        # Reset video and dependent steps
        update_scene_data(index, "generated_video", None)
        update_scene_data(index, "generated_sound", None)
        update_scene_state(index, "video_generated", False)
        update_scene_state(index, "sound_generated", False)
    
    elif step == "sound":
        # Reset sound only
        update_scene_data(index, "generated_sound", None)
        update_scene_state(index, "sound_generated", False)

# Topic Prompt Presets
TOPIC_PROMPTS = {
    "conspiracy": {
        "name": "Conspiracy Theory",
        "prompt": "Create a cinematic, intelligent, and scroll-stopping TikTok script based on this conspiracy theory {input}. Follow this format exactly: Start with a 1-sentence hook (max 2 seconds) using a question or intriguing fact (\"Why did...\", \"What if…\", \"Did you know that…\"). Then build a 7–9 scene script (~20–35 seconds total), written as immersive, voiceover-style narration — not camera directions. Each \"scene\" should be 1–2 sentences max and evoke a visual moment. The tone should feel like a Netflix doc: cinematic, calm, composed, and mysterious — never loud, never clickbait. The final line must leave the viewer wondering or imply the story isn't really over. Use real historical dates, locations, and terminology where possible to enhance realism."
    },
    "educational": {
        "name": "Educational Content",
        "prompt": "Create an engaging educational TikTok script about {input}. Start with a compelling hook question or surprising fact (1-2 seconds). Build a 6-8 scene script (~25-40 seconds) that teaches the audience something valuable. Use clear, conversational language with smooth transitions between concepts. Each scene should be 1-2 sentences that paint a clear visual picture. Make it informative but entertaining, like a good teacher explaining a fascinating topic."
    },
    "motivational": {
        "name": "Motivational/Inspirational",
        "prompt": "Create an inspiring and motivational TikTok script based on {input}. Start with a powerful hook that resonates emotionally (1-2 seconds). Build a 5-7 scene script (~20-30 seconds) that tells a compelling story of overcoming challenges or achieving success. Use uplifting language that motivates action. Each scene should be 1-2 sentences that create vivid, inspiring imagery. End with a call to action that empowers the viewer."
    },
    "storytelling": {
        "name": "Storytelling/Narrative",
        "prompt": "Create a captivating story-based TikTok script about {input}. Start with an intriguing hook that sets up the story (1-2 seconds). Build a 7-10 scene script (~30-45 seconds) that tells a complete narrative with beginning, middle, and end. Use vivid, descriptive language that makes viewers feel like they're experiencing the story. Each scene should be 1-2 sentences that advance the plot. Create emotional connection and satisfying resolution."
    }
}

# General Instructions
GENERAL_PROMPT = """Make sure not to use em dashes (use commas instead) and other punctuation that would confuse the script reader (who is a robot). Next, with the scene informations, generate prompts for the images, the videos (that will be made with the images) and the sound for the scenes. The prompts should be as long and detailed as possible or should be, since it needs to look alluring. Output all scenes (including the hook) with their corresponding prompts in the format and only respond with the finalized format. The format and example prompts are listed below, pay close attention."""

# Model Examples
MODEL_EXAMPLES = {
    "image_examples": [
        "A cinematic, photorealistic medium shot capturing the nostalgic warmth of a mid-2000s indie film. The focus is a young woman with a sleek, straight bob haircut in cool platinum white with freckled skin, looking directly and intently into the camera lens with a knowing smirk, her head is looking up slightly. She wears an oversized band t-shirt that says \"Seedream 3.0 on Replicate\" in huge stylized text over a long-sleeved striped top and simple silver stud earrings. The lighting is soft, golden hour sunlight creating lens flare and illuminating dust motes in the air. The background shows a blurred outdoor urban setting with graffiti-covered walls (the graffiti says \"seedream\" in stylized graffiti lettering), rendered with a shallow depth of field. Natural film grain, a warm, slightly muted color palette, and sharp focus on her expressive eyes enhance the intimate, authentic feel",
        "A cinematic, photorealistic medium shot capturing the rebellious energy of early 1990s grunge culture. The focus is a young woman with tousled, shoulder-length auburn hair with natural waves and freckled skin, looking directly and intently into the camera lens with a knowing smirk, her head is looking up slightly. She wears an oversized flannel shirt that says \"Seedream 3.0 on Replicate\" in huge stylized text over a band tee and simple hoop earrings. The lighting is moody, overcast daylight filtering through windows creating dramatic shadows. The background shows a blurred indoor coffee shop setting with vintage concert posters covering brick walls (one poster says \"seedream\" in bold concert lettering), rendered with a shallow depth of field. Natural film grain, a desaturated color palette with pops of deep reds and blues, and sharp focus on her expressive eyes enhance the raw, authentic underground feel."
    ],
    "video_examples": [
        "a woman points at the words",
        "a woman takes her hands out her pockets and gestures to the words with both hands, she is excited, behind her it is raining"
    ],
    "sound_examples": [
        "Generate a continuous printer printing sound with periodic beeps and paper movement, plus a cat pawing at the machine. Add subtle ambient room noise for authenticity, keeping the focus on printing, beeps, and the cat's interaction.",
        "Begin by creating a soft, steady background of light pacifier suckling. Add subtle, breathy rhythms to mimic a newborn's gentle mouth movements. Keep the sound smooth, natural, and soothing.",
        "Generate the sound of firecrackers lighting and exploding repeatedly on the ground, followed by fireworks bursting in the sky. Incorporate occasional subtle echoes to mimic an outdoor night ambiance, with no human voices present.",
        "Begin with the sound of hands scooping up loose plastic debris, followed by the subtle cascading noise as the pieces fall and scatter back down. Include soft crinkling and rustling to emphasize the texture of the plastic. Add ambient factory background noise with distant machinery to create an industrial atmosphere."
    ]
}

# Helper functions from original code
def safe_filename(s):
    """Sanitize filename"""
    s = re.sub(r'[^\w\-_\. ]', '_', s)
    return s[:50]

def download_file(url, filename):
    """Download file from URL"""
    response = requests.get(url, stream=True)
    if response.status_code == 200:
        with open(filename, 'wb') as f:
            for chunk in response.iter_content(chunk_size=8192):
                f.write(chunk)
        return True
    return False

def create_project_directory():
    """Create project directory for this session"""
    if st.session_state.project_dir is None:
        base_dir = 'final_videos'
        if not os.path.exists(base_dir):
            os.makedirs(base_dir)
        timestamp = datetime.now().strftime('project_%Y%m%d_%H%M%S')
        project_dir = os.path.join(base_dir, timestamp)
        os.makedirs(project_dir)
        st.session_state.project_dir = project_dir
    return st.session_state.project_dir

def generate_storyboard(user_input, format_type="conspiracy"):
    """Generate storyboard from initial prompt using OpenAI with advanced prompt structure"""
    try:
        # Check if OpenAI API key exists
        api_key = os.getenv("OPENAI_API_KEY")
        if not api_key:
            st.error("OpenAI API key not found. Please check your .env file.")
            return None
        
        client = OpenAI(api_key=api_key)
        
        # Get the topic prompt based on format type
        if format_type in TOPIC_PROMPTS:
            topic_prompt = TOPIC_PROMPTS[format_type]["prompt"].format(input=user_input)
        elif format_type in st.session_state.custom_topic_prompts:
            topic_prompt = st.session_state.custom_topic_prompts[format_type].format(input=user_input)
        else:
            topic_prompt = f"Create a video script about: {user_input}"
        
        # Build the comprehensive system prompt
        system_prompt = f"""You are an expert video storyboard creator. Your task is to create detailed storyboards for TikTok-style videos.

TOPIC PROMPT:
{topic_prompt}

GENERAL INSTRUCTIONS:
{GENERAL_PROMPT}

FORMAT:
{{
  "scenes": [
    {{
      "scene": "Scene script",
      "scene_image_prompt": "...",
      "scene_video_prompt": "...",
      "scene_sound_prompt": "..."
    }},
    ...
  ]
}}

MODEL EXAMPLES:

Image prompts should be detailed and cinematic like these examples:
{chr(10).join([f"{i+1}. {example}" for i, example in enumerate(MODEL_EXAMPLES["image_examples"])])}

Video prompts should be simple motion descriptions like these examples:
{chr(10).join([f"{i+1}. {example}" for i, example in enumerate(MODEL_EXAMPLES["video_examples"])])}

Sound prompts should be detailed audio descriptions like these examples:
{chr(10).join([f"{i+1}. {example}" for i, example in enumerate(MODEL_EXAMPLES["sound_examples"])])}

IMPORTANT: Your response must be ONLY valid JSON with no additional text, explanations, or markdown formatting."""
        
        response = client.chat.completions.create(
            model="gpt-4o",
            messages=[
                {"role": "system", "content": system_prompt},
                {"role": "user", "content": f"Input: {user_input}"}
            ],
            temperature=0.7
        )
        
        storyboard_json = response.choices[0].message.content
        
        # Debug: show what we got from OpenAI
        if not storyboard_json or storyboard_json.strip() == "":
            st.error("OpenAI returned empty response. Please check your API key and try again.")
            return None
        
        # Clean up the response (remove any markdown formatting)
        storyboard_json = storyboard_json.strip()
        if storyboard_json.startswith("```json"):
            storyboard_json = storyboard_json[7:]
        if storyboard_json.endswith("```"):
            storyboard_json = storyboard_json[:-3]
        storyboard_json = storyboard_json.strip()
        
        # Parse and validate JSON
        try:
            storyboard_data = json.loads(storyboard_json)
        except json.JSONDecodeError as e:
            st.error(f"Invalid JSON response from OpenAI: {str(e)}")
            st.error(f"Response received: {storyboard_json[:200]}...")
            return None
        
        # Validate structure
        if "scenes" not in storyboard_data:
            st.error("Invalid storyboard structure: missing 'scenes' key")
            return None
        
        if not isinstance(storyboard_data["scenes"], list):
            st.error("Invalid storyboard structure: 'scenes' must be a list")
            return None
        
        for i, scene in enumerate(storyboard_data["scenes"]):
            required_fields = ["scene", "scene_image_prompt", "scene_video_prompt", "scene_sound_prompt"]
            missing_fields = [field for field in required_fields if field not in scene]
            if missing_fields:
                st.error(f"Scene {i+1} missing required fields: {missing_fields}")
                return None
        
        return storyboard_data
        
    except Exception as e:
        st.error(f"Error generating storyboard: {str(e)}")
        if "api_key" in str(e).lower():
            st.error("This appears to be an API key issue. Please check your OpenAI API key in the .env file.")
        return None

# AI Generation Functions (from original code)
async def _generate_image(prompt):
    """Generate image using Replicate"""
    input = {
        "prompt": prompt,
        "aspect_ratio": "9:16",
        "safety_filter_level": "block_medium_and_above",
        "size": "big",
        "guidance_scale": 2.5
    }

    output = await replicate.async_run("bytedance/seedream-3", input=input)
    return output.url

async def _generate_video(prompt, image_url):
    """Generate video using Replicate"""
    output = await replicate.async_run("kwaivgi/kling-v2.1",
                                       input={
                                           "prompt": prompt,
                                           "start_image": image_url,
                                           "mode": "pro"
                                       })
    return output.url

async def _generate_sound(video_url, prompt):
    """Generate sound using Replicate"""
    output = await replicate.async_run(
        "zsxkib/thinksound:40d08f9f569e91a5d72f6795ebed75178c185b0434699a98c07fc5f566efb2d4",
        input={
            "caption": prompt,
            "cfg": 5,
            "num_inference_steps": 24,
            "video": video_url,
            "cot": prompt,
        })
    return output.url

def run_async_function(func, *args):
    """Helper function to run async functions in Streamlit"""
    try:
        loop = asyncio.get_event_loop()
    except RuntimeError:
        loop = asyncio.new_event_loop()
        asyncio.set_event_loop(loop)
    
    return loop.run_until_complete(func(*args))

# Main app
def main():
    st.title("🎬 AI Video Generator")
    
    # Route to appropriate view
    if st.session_state.current_step == 0:
        show_simple_input()
    elif st.session_state.current_step == 1:
        show_storyboard_view()

def show_simple_input():
    """Simple input interface with text box and dropdown"""
    
    # Center the interface
    col1, col2, col3 = st.columns([1, 2, 1])
    
    with col2:
        st.markdown("### Enter your concept")
        
        # Simple text input
        prompt = st.text_area(
            "Enter your concept",
            value=st.session_state.initial_prompt,
            height=100,
            placeholder="e.g., The Philadelphia Experiment, Ancient aliens built the pyramids, etc.",
            label_visibility="collapsed"
        )
        
        # Format dropdown
        format_options = {}
        for key, value in TOPIC_PROMPTS.items():
            format_options[key] = value["name"]
        
        # Add custom prompts
        for key, prompt_text in st.session_state.custom_topic_prompts.items():
            format_options[key] = f"Custom: {key}"
        
        selected_format = st.selectbox(
            "Select format",
            options=list(format_options.keys()),
            format_func=lambda x: format_options[x],
            index=list(format_options.keys()).index(st.session_state.selected_format) if st.session_state.selected_format in format_options else 0,
            label_visibility="collapsed"
        )
        
        st.session_state.selected_format = selected_format
        
        # Advanced settings button
        if st.button("⚙️ Advanced Settings"):
            st.session_state.show_advanced_settings = not st.session_state.show_advanced_settings
        
        # Advanced settings modal
        if st.session_state.show_advanced_settings:
            show_advanced_settings()
        
        # Generate button
        col_a, col_b = st.columns(2)
        
        with col_a:
            if st.button("🚀 Generate Storyboard", type="primary", use_container_width=True):
                if prompt.strip():
                    st.session_state.initial_prompt = prompt
                    
                    # Generate storyboard using OpenAI with selected format
                    with st.spinner("🤖 Generating storyboard..."):
                        storyboard_data = generate_storyboard(prompt, selected_format)
                        
                    if storyboard_data:
                        st.session_state.storyboard_data = storyboard_data
                        # Reset generation state
                        st.session_state.current_generation_step = "none"
                        initialize_scene_states(storyboard_data["scenes"])
                        st.session_state.current_step = 1
                        st.rerun()
                    else:
                        st.error("Failed to generate storyboard. Please try again or use the demo option.")
                else:
                    st.error("Please enter a prompt first!")
        
        with col_b:
            if st.button("🎬 Demo Storyboard", help="Use a demo storyboard for testing", use_container_width=True):
                if prompt.strip():
                    st.session_state.initial_prompt = prompt
                    
                    # Create demo storyboard based on format
                    if selected_format == "conspiracy":
                        demo_storyboard = {
                            "scenes": [
                                {
                                    "scene": "Did you know that the government has been hiding the truth about this for decades?",
                                    "scene_image_prompt": f"A cinematic, photorealistic wide shot of a mysterious government facility at dusk, with tall concrete walls and barbed wire fencing. The lighting is moody and dramatic, with artificial floodlights casting long shadows. Security cameras and warning signs are visible. The atmosphere is tense and secretive, shot with a desaturated color palette emphasizing grays and deep blues. High detail, 4K quality, professional cinematography.",
                                    "scene_video_prompt": "Slow, ominous zoom into the facility, with subtle camera shake to create tension",
                                    "scene_sound_prompt": "Generate low, mysterious ambient drone sounds with distant industrial noise and occasional electronic beeps, creating an atmosphere of secrecy and surveillance."
                                },
                                {
                                    "scene": "The official story never made sense, but the evidence was right there in plain sight.",
                                    "scene_image_prompt": f"A cinematic close-up shot of classified documents scattered across a dark wooden desk, with a vintage desk lamp casting dramatic shadows. The documents have heavy black redaction marks and official government stamps. Some pages are slightly yellowed with age. The lighting is film noir style, creating high contrast between light and shadow. Shot with shallow depth of field, emphasizing the mysterious nature of the documents.",
                                    "scene_video_prompt": "Camera slowly pans across the documents, with papers slightly rustling in a gentle breeze",
                                    "scene_sound_prompt": "Generate the subtle sound of papers rustling and shuffling, with quiet ambient office noise in the background. Add occasional pen clicks and the distant hum of fluorescent lights."
                                },
                                {
                                    "scene": "What they don't want you to know is that the truth is still out there, waiting to be discovered.",
                                    "scene_image_prompt": f"A cinematic medium shot of a lone investigator silhouetted against a window, looking out at a city skyline at night. The figure is backlit, creating a dramatic silhouette. City lights twinkle in the distance, and the atmosphere is contemplative and mysterious. The shot uses high contrast lighting with deep shadows and warm city lights. Professional cinematography with a sense of determination and mystery.",
                                    "scene_video_prompt": "The silhouette remains still while city lights twinkle and move subtly in the background, creating depth",
                                    "scene_sound_prompt": "Generate a contemplative, mysterious ambient soundscape with distant city traffic, occasional car horns, and a subtle wind sound. Add a hint of electronic ambience to suggest ongoing surveillance or mystery."
                                }
                            ]
                        }
                    else:
                        # Generic demo for other formats
                        demo_storyboard = {
                            "scenes": [
                                {
                                    "scene": "Opening hook that grabs attention immediately",
                                    "scene_image_prompt": f"A cinematic, photorealistic medium shot capturing attention with dramatic lighting and composition. The scene is related to: {prompt}. High detail, 4K quality, professional cinematography with warm color grading.",
                                    "scene_video_prompt": "Slow, engaging camera movement that draws the viewer in",
                                    "scene_sound_prompt": "Generate atmospheric ambient sounds that match the scene's mood and topic, creating immediate engagement."
                                },
                                {
                                    "scene": "Development of the main concept with key details",
                                    "scene_image_prompt": f"A cinematic wide shot showing the main concept in detail, related to: {prompt}. Dramatic lighting, detailed scene composition, professional cinematography with rich color palette.",
                                    "scene_video_prompt": "Dynamic camera movement showing key elements, smooth transitions",
                                    "scene_sound_prompt": "Generate detailed audio that enhances the visual narrative, with environmental sounds that match the scene context."
                                },
                                {
                                    "scene": "Compelling conclusion that leaves viewers wanting more",
                                    "scene_image_prompt": f"A cinematic close-up or medium shot that provides satisfying conclusion, related to: {prompt}. Warm, conclusion-appropriate lighting, detailed and polished visual composition.",
                                    "scene_video_prompt": "Smooth concluding camera movement, peaceful resolution motion",
                                    "scene_sound_prompt": "Generate satisfying conclusion audio with appropriate environmental sounds and subtle musical elements that provide closure."
                                }
                            ]
                        }
                    
                    st.session_state.storyboard_data = demo_storyboard
                    # Reset generation state
                    st.session_state.current_generation_step = "none"
                    initialize_scene_states(demo_storyboard["scenes"])
                    st.session_state.current_step = 1
                    st.success("Demo storyboard created!")
                    st.rerun()
                else:
                    st.error("Please enter a prompt first!")

def show_advanced_settings():
    """Advanced settings modal"""
    with st.container():
        st.markdown("#### 🔧 Advanced Settings")
        
        # Preview current format
        if st.session_state.selected_format in TOPIC_PROMPTS:
            st.markdown("**Current Format Preview:**")
            st.text_area(
                "Current Format Preview",
                value=TOPIC_PROMPTS[st.session_state.selected_format]["prompt"].replace("{input}", "[YOUR INPUT]"),
                height=100,
                disabled=True,
                label_visibility="collapsed"
            )
        
        # Add custom format
        st.markdown("**Add Custom Format:**")
        custom_name = st.text_input("Format Name:", placeholder="e.g., Horror Story")
        custom_prompt = st.text_area(
            "Custom Prompt (use {input} for user input):",
            height=100,
            placeholder="Create a horror story script about {input}. Start with..."
        )
        
        if st.button("💾 Save Custom Format"):
            if custom_name.strip() and custom_prompt.strip():
                if "{input}" in custom_prompt:
                    st.session_state.custom_topic_prompts[custom_name.lower().replace(" ", "_")] = custom_prompt
                    st.success(f"Custom format '{custom_name}' saved!")
                else:
                    st.error("Custom prompt must contain {input} placeholder!")
            else:
                st.error("Please enter both name and prompt!")
        
        # Model settings
        st.markdown("**Model Examples:**")
        with st.expander("View Current Examples"):
            st.markdown("**Image Examples:**")
            for i, example in enumerate(MODEL_EXAMPLES["image_examples"]):
                st.text_area(f"Image Example {i+1}:", value=example, height=80, disabled=True)
            
            st.markdown("**Video Examples:**")
            for i, example in enumerate(MODEL_EXAMPLES["video_examples"]):
                st.text_input(f"Video Example {i+1}:", value=example, disabled=True)
            
            st.markdown("**Sound Examples:**")
            for i, example in enumerate(MODEL_EXAMPLES["sound_examples"]):
                st.text_area(f"Sound Example {i+1}:", value=example, height=80, disabled=True)

def show_storyboard_view():
    """Main storyboard view with card-based flexible generation"""
    
    if st.session_state.storyboard_data is None:
        st.error("No storyboard data found. Please go back and create a storyboard first.")
        return
    
    scenes = st.session_state.storyboard_data["scenes"]
    
    # Compact top controls
    col1, col2, col3, col4 = st.columns([3, 1, 1, 1])
    
    with col1:
        st.markdown(f"**Prompt:** {st.session_state.initial_prompt[:80]}{'...' if len(st.session_state.initial_prompt) > 80 else ''}")
    
    with col2:
        st.empty()  # Spacer
    
    with col3:
        if st.button("🔙 Back", use_container_width=True):
            st.session_state.current_step = 0
            st.rerun()
    
    with col4:
        if st.button("💾 Save", type="primary", use_container_width=True):
            save_project()
    
    st.markdown("---")
    
    # Global generation controls
    show_global_generation_controls(scenes)
    
    st.markdown("---")
    
    # Responsive storyboard grid
    show_storyboard_grid(scenes)

def show_global_generation_controls(scenes):
    """Show global generation controls for all scenes"""
    
    # Calculate generation statistics
    total_scenes = len(scenes)
    images_generated = sum(1 for i in range(total_scenes) if get_scene_state(i) and get_scene_state(i)["image_generated"])
    videos_generated = sum(1 for i in range(total_scenes) if get_scene_state(i) and get_scene_state(i)["video_generated"])
    sounds_generated = sum(1 for i in range(total_scenes) if get_scene_state(i) and get_scene_state(i)["sound_generated"])
    
    # Compact header with statistics and controls
    col1, col2, col3, col4, col5, col6 = st.columns([1, 1, 1, 1, 1, 1])
    
    with col1:
        st.metric("Images", f"{images_generated}/{total_scenes}", label_visibility="visible")
    
    with col2:
        st.metric("Videos", f"{videos_generated}/{total_scenes}", label_visibility="visible")
    
    with col3:
        st.metric("Sounds", f"{sounds_generated}/{total_scenes}", label_visibility="visible")
    
    with col4:
        if st.button("🎨 All Images", use_container_width=True):
            generate_all_images_new(scenes)
    
    with col5:
        # Only enable if all images are generated
        videos_disabled = images_generated < total_scenes
        videos_help = "Generate all images first" if videos_disabled else "Generate all videos"
        if st.button("🎥 All Videos", use_container_width=True, disabled=videos_disabled, help=videos_help):
            generate_all_videos_new(scenes)
    
    with col6:
        # Only enable if all videos are generated
        sounds_disabled = videos_generated < total_scenes
        sounds_help = "Generate all videos first" if sounds_disabled else "Generate all sounds"
        if st.button("🔊 All Sounds", use_container_width=True, disabled=sounds_disabled, help=sounds_help):
            generate_all_sounds_new(scenes)

def generate_all_images_new(scenes):
    """Generate images for all scenes that don't have them"""
    
    with st.spinner("Generating images for all scenes..."):
        generated_count = 0
        for i in range(len(scenes)):
            scene_state = get_scene_state(i)
            scene_data = get_scene_data(i)
            
            if scene_state and scene_data and not scene_state["image_generated"]:
                try:
                    image_url = run_async_function(_generate_image, scene_data["scene_image_prompt"])
                    if image_url:
                        update_scene_data(i, "generated_image", image_url)
                        update_scene_state(i, "image_generated", True)
                        generated_count += 1
                except Exception as e:
                    st.error(f"Error generating image for scene {i+1}: {str(e)}")
    
    if generated_count > 0:
        st.success(f"Generated {generated_count} images!")
    else:
        st.info("All images already generated!")
    st.rerun()

def generate_all_videos_new(scenes):
    """Generate videos for all scenes that have images but no videos"""
    
    # Check if all images are generated first
    total_scenes = len(scenes)
    images_generated = sum(1 for i in range(total_scenes) if get_scene_state(i) and get_scene_state(i)["image_generated"])
    
    if images_generated < total_scenes:
        st.error(f"Please generate all images first! ({images_generated}/{total_scenes} images completed)")
        return
    
    with st.spinner("Generating videos for all scenes..."):
        for i in range(len(scenes)):
            scene_state = get_scene_state(i)
            scene_data = get_scene_data(i)
            
            if (scene_state and scene_data and 
                scene_state["image_generated"] and 
                not scene_state["video_generated"] and
                scene_data["generated_image"]):
                try:
                    video_url = run_async_function(_generate_video, scene_data["scene_video_prompt"], scene_data["generated_image"])
                    if video_url:
                        update_scene_data(i, "generated_video", video_url)
                        update_scene_state(i, "video_generated", True)
                except Exception as e:
                    st.error(f"Error generating video for scene {i+1}: {str(e)}")
    
    st.success("All videos generated!")
    st.rerun()

def generate_all_sounds_new(scenes):
    """Generate sounds for all scenes that have videos but no sounds"""
    
    # Check if all videos are generated first
    total_scenes = len(scenes)
    videos_generated = sum(1 for i in range(total_scenes) if get_scene_state(i) and get_scene_state(i)["video_generated"])
    
    if videos_generated < total_scenes:
        st.error(f"Please generate all videos first! ({videos_generated}/{total_scenes} videos completed)")
        return
    
    with st.spinner("Generating sounds for all scenes..."):
        for i in range(len(scenes)):
            scene_state = get_scene_state(i)
            scene_data = get_scene_data(i)
            
            if (scene_state and scene_data and 
                scene_state["video_generated"] and 
                not scene_state["sound_generated"] and
                scene_data["generated_video"]):
                try:
                    sound_url = run_async_function(_generate_sound, scene_data["generated_video"], scene_data["scene_sound_prompt"])
                    if sound_url:
                        update_scene_data(i, "generated_sound", sound_url)
                        update_scene_state(i, "sound_generated", True)
                except Exception as e:
                    st.error(f"Error generating sound for scene {i+1}: {str(e)}")
    
    st.success("All sounds generated!")
    st.rerun()



def show_storyboard_grid(scenes):
    """Display clean storyboard grid"""
    
    num_scenes = len(scenes)
    
    # Optimal grid layout for storyboard panels
    if num_scenes <= 3:
        cols_per_row = 3
        card_height = "420px"
    elif num_scenes <= 6:
        cols_per_row = 3  
        card_height = "380px"
    elif num_scenes <= 8:
        cols_per_row = 4
        card_height = "360px"
    else:
        cols_per_row = 4
        card_height = "340px"
    
    # Create the grid
    rows = (num_scenes + cols_per_row - 1) // cols_per_row
    scene_index = 0
    
    for row in range(rows):
        if scene_index >= num_scenes:
            break
        
        cols = st.columns(cols_per_row)
        
        for col_idx in range(cols_per_row):
            if scene_index >= num_scenes:
                break
                
            with cols[col_idx]:
                show_scene_card(scenes[scene_index], scene_index, card_height)
                scene_index += 1

def show_scene_card(scene, index, card_height="400px"):
    """Display clean storyboard panel like traditional storyboards"""
    
    scene_state = get_scene_state(index)
    scene_data = get_scene_data(index)
    
    if not scene_state or not scene_data:
        return
    
    # Calculate actual height for content areas
    height_px = int(card_height[:-2])
    
    # Main panel HTML
    panel_html = f"""
    <div class="storyboard-panel" style="height: {card_height};">
        <div class="panel-header">Scene {index + 1}</div>
        <div class="status-row">
            <span class="status-indicator {'completed' if scene_state['image_generated'] else ''}">🎨</span>
            <span class="status-indicator {'completed' if scene_state['video_generated'] else ''}">🎥</span>
            <span class="status-indicator {'completed' if scene_state['sound_generated'] else ''}">🔊</span>
        </div>
    </div>
    """
    
    st.markdown(panel_html, unsafe_allow_html=True)
    
    # Content preview area
    with st.container():
        preview_height = height_px - 200  # Leave room for other elements
        
        # Show the latest generated content or placeholder
        if scene_state["sound_generated"] and scene_data["generated_sound"]:
            st.markdown('<div class="content-preview">', unsafe_allow_html=True)
            try:
                st.video(scene_data["generated_sound"])
            except:
                st.markdown('<div class="placeholder-text">🔊 Sound Generated (Error Loading)</div>', unsafe_allow_html=True)
            st.markdown('</div>', unsafe_allow_html=True)
            
        elif scene_state["video_generated"] and scene_data["generated_video"]:
            st.markdown('<div class="content-preview">', unsafe_allow_html=True)
            try:
                st.video(scene_data["generated_video"])
            except:
                st.markdown('<div class="placeholder-text">🎥 Video Generated (Error Loading)</div>', unsafe_allow_html=True)
            st.markdown('</div>', unsafe_allow_html=True)
            
        elif scene_state["image_generated"] and scene_data["generated_image"]:
            st.markdown('<div class="content-preview">', unsafe_allow_html=True)
            try:
                st.image(scene_data["generated_image"], use_container_width=True)
            except:
                st.markdown('<div class="placeholder-text">🎨 Image Generated (Error Loading)</div>', unsafe_allow_html=True)
            st.markdown('</div>', unsafe_allow_html=True)
            
        else:
            st.markdown('<div class="content-preview"><div class="placeholder-text">📝 Ready for Generation</div></div>', unsafe_allow_html=True)
    
    # Script text
    st.markdown(f'<div class="script-text"><strong>Script:</strong><br>{scene_data["scene_text"]}</div>', unsafe_allow_html=True)
    
    # Generation controls
    st.markdown('<div class="generation-controls">', unsafe_allow_html=True)
    
    # Image generation
    col1, col2 = st.columns([3, 1])
    with col1:
        status_text = "✅ Image Ready" if scene_state["image_generated"] else "⏳ Generate Image"
        st.markdown(f'<small style="color: #64748b;">{status_text}</small>', unsafe_allow_html=True)
    with col2:
        button_text = "🔄" if scene_state["image_generated"] else "🎨"
        if st.button(button_text, key=f"gen_img_{index}", help="Generate/Regenerate Image"):
            if scene_state["image_generated"]:
                reset_from_step(index, "image")
            generate_individual_image(index)
    
    # Video generation
    col1, col2 = st.columns([3, 1])
    with col1:
        if scene_state["video_generated"]:
            status_text = "✅ Video Ready"
        elif scene_state["image_generated"]:
            status_text = "⏳ Generate Video"
        else:
            status_text = "⚠️ Need Image First"
        st.markdown(f'<small style="color: #64748b;">{status_text}</small>', unsafe_allow_html=True)
    with col2:
        button_text = "🔄" if scene_state["video_generated"] else "🎥"
        disabled = not scene_state["image_generated"]
        if st.button(button_text, key=f"gen_vid_{index}", disabled=disabled, help="Generate/Regenerate Video"):
            if scene_state["video_generated"]:
                reset_from_step(index, "video")
            generate_individual_video(index)
    
    # Sound generation
    col1, col2 = st.columns([3, 1])
    with col1:
        if scene_state["sound_generated"]:
            status_text = "✅ Sound Ready"
        elif scene_state["video_generated"]:
            status_text = "⏳ Generate Sound"
        else:
            status_text = "⚠️ Need Video First"
        st.markdown(f'<small style="color: #64748b;">{status_text}</small>', unsafe_allow_html=True)
    with col2:
        button_text = "🔄" if scene_state["sound_generated"] else "🔊"
        disabled = not scene_state["video_generated"]
        if st.button(button_text, key=f"gen_sound_{index}", disabled=disabled, help="Generate/Regenerate Sound"):
            if scene_state["sound_generated"]:
                reset_from_step(index, "sound")
            generate_individual_sound(index)
    
    st.markdown('</div>', unsafe_allow_html=True)
    
    # Expandable prompts section
    with st.expander("✏️ Edit Prompts", expanded=False):
        show_editable_prompts(scene_data, index)

def show_editable_prompts(scene_data, index):
    """Show editable prompts in a compact format"""
    
    # Image prompt
    st.markdown("**Image Prompt:**")
    new_image_prompt = st.text_area(
        "Image",
        scene_data["scene_image_prompt"],
        height=68,
        key=f"edit_img_prompt_{index}",
        label_visibility="collapsed"
    )
    if new_image_prompt != scene_data["scene_image_prompt"]:
        update_scene_data(index, "scene_image_prompt", new_image_prompt)
    
    # Video prompt
    st.markdown("**Video Prompt:**")
    new_video_prompt = st.text_area(
        "Video",
        scene_data["scene_video_prompt"],
        height=68,
        key=f"edit_vid_prompt_{index}",
        label_visibility="collapsed"
    )
    if new_video_prompt != scene_data["scene_video_prompt"]:
        update_scene_data(index, "scene_video_prompt", new_video_prompt)
    
    # Sound prompt
    st.markdown("**Sound Prompt:**")
    new_sound_prompt = st.text_area(
        "Sound",
        scene_data["scene_sound_prompt"],
        height=68,
        key=f"edit_sound_prompt_{index}",
        label_visibility="collapsed"
    )
    if new_sound_prompt != scene_data["scene_sound_prompt"]:
        update_scene_data(index, "scene_sound_prompt", new_sound_prompt)



def generate_individual_image(index):
    """Generate image for a specific scene"""
    scene_data = get_scene_data(index)
    if not scene_data:
        return
    
    with st.spinner(f"Generating image for scene {index + 1}..."):
        try:
            image_url = run_async_function(_generate_image, scene_data["scene_image_prompt"])
            if image_url:
                update_scene_data(index, "generated_image", image_url)
                update_scene_state(index, "image_generated", True)
                st.success(f"Image generated for scene {index + 1}!")
                st.rerun()
            else:
                st.error("Failed to generate image")
        except Exception as e:
            st.error(f"Error generating image: {str(e)}")

def generate_individual_video(index):
    """Generate video for a specific scene"""
    scene_data = get_scene_data(index)
    if not scene_data or not scene_data["generated_image"]:
        return
    
    with st.spinner(f"Generating video for scene {index + 1}..."):
        try:
            video_url = run_async_function(_generate_video, scene_data["scene_video_prompt"], scene_data["generated_image"])
            if video_url:
                update_scene_data(index, "generated_video", video_url)
                update_scene_state(index, "video_generated", True)
                st.success(f"Video generated for scene {index + 1}!")
                st.rerun()
            else:
                st.error("Failed to generate video")
        except Exception as e:
            st.error(f"Error generating video: {str(e)}")

def generate_individual_sound(index):
    """Generate sound for a specific scene"""
    scene_data = get_scene_data(index)
    if not scene_data or not scene_data["generated_video"]:
        return
    
    with st.spinner(f"Generating sound for scene {index + 1}..."):
        try:
            sound_url = run_async_function(_generate_sound, scene_data["generated_video"], scene_data["scene_sound_prompt"])
            if sound_url:
                update_scene_data(index, "generated_sound", sound_url)
                update_scene_state(index, "sound_generated", True)
                st.success(f"Sound generated for scene {index + 1}!")
                st.rerun()
            else:
                st.error("Failed to generate sound")
        except Exception as e:
            st.error(f"Error generating sound: {str(e)}")

def save_project():
    """Save the complete project"""
    
    # Check if there's any generated content to save
    has_content = False
    for i in range(len(st.session_state.scene_data)):
        scene_data = get_scene_data(i)
        if scene_data and (scene_data["generated_image"] or scene_data["generated_video"] or scene_data["generated_sound"]):
            has_content = True
            break
    
    if not has_content:
        st.error("No generated content to save. Please generate some content first.")
        return
    
    project_dir = create_project_directory()
    scenes = st.session_state.storyboard_data["scenes"]
    
    progress_bar = st.progress(0)
    status_text = st.empty()
    
    try:
        # Save storyboard data with current prompts
        enhanced_storyboard = {
            "scenes": [],
            "original_prompt": st.session_state.initial_prompt,
            "format_type": st.session_state.selected_format
        }
        
        for i, scene in enumerate(scenes):
            scene_data = get_scene_data(i)
            if scene_data:
                enhanced_scene = {
                    "scene": scene_data["scene_text"],
                    "scene_image_prompt": scene_data["scene_image_prompt"],
                    "scene_video_prompt": scene_data["scene_video_prompt"],
                    "scene_sound_prompt": scene_data["scene_sound_prompt"]
                }
                enhanced_storyboard["scenes"].append(enhanced_scene)
        
        storyboard_file = os.path.join(project_dir, "storyboard.json")
        with open(storyboard_file, 'w') as f:
            json.dump(enhanced_storyboard, f, indent=2)
        
        # Save original prompt
        prompt_file = os.path.join(project_dir, "original_prompt.txt")
        with open(prompt_file, 'w') as f:
            f.write(st.session_state.initial_prompt)
        
        # Calculate total files to save
        total_files = 0
        for i in range(len(scenes)):
            scene_data = get_scene_data(i)
            if scene_data:
                if scene_data["generated_image"]:
                    total_files += 1
                if scene_data["generated_video"]:
                    total_files += 1
                if scene_data["generated_sound"]:
                    total_files += 1
        
        saved_files = 0
        
        # Download and save all generated content
        for i, scene in enumerate(scenes):
            scene_data = get_scene_data(i)
            if not scene_data:
                continue
                
            scene_name = safe_filename(scene_data["scene_text"])
            
            # Save image
            if scene_data["generated_image"]:
                status_text.text(f"Saving image for scene {i+1}...")
                image_filename = os.path.join(project_dir, f"scene_{i+1}_{scene_name}_image.png")
                if download_file(scene_data["generated_image"], image_filename):
                    saved_files += 1
                progress_bar.progress(saved_files / total_files)
            
            # Save video (no sound)
            if scene_data["generated_video"]:
                status_text.text(f"Saving video for scene {i+1}...")
                video_filename = os.path.join(project_dir, f"scene_{i+1}_{scene_name}_video.mp4")
                if download_file(scene_data["generated_video"], video_filename):
                    saved_files += 1
                progress_bar.progress(saved_files / total_files)
            
            # Save final video with sound
            if scene_data["generated_sound"]:
                status_text.text(f"Saving final video with sound for scene {i+1}...")
                final_filename = os.path.join(project_dir, f"scene_{i+1}_{scene_name}_final.mp4")
                if download_file(scene_data["generated_sound"], final_filename):
                    saved_files += 1
                progress_bar.progress(saved_files / total_files)
        
        status_text.text("All files saved successfully!")
        st.success(f"✅ Project saved to: {project_dir}")
        
    except Exception as e:
        st.error(f"Error saving project: {str(e)}")

if __name__ == "__main__":
    main() 