import os
from openai import OpenAI
from dotenv import load_dotenv
import json
import replicate
import asyncio
import requests  # Added for downloading videos
import re  # For safe filename
from datetime import datetime  # For timestamped run folders

load_dotenv()

# Function to load JSON from file or input
def load_scenes_json():
    """Load scenes JSON from file or user input"""
    print("Enter the path to your JSON file, or paste JSON directly:")
    user_input = input().strip()
    
    # Check if it's a file path
    if os.path.exists(user_input):
        with open(user_input, 'r') as f:
            return json.load(f)
    else:
        # Try to parse as JSON
        try:
            return json.loads(user_input)
        except json.JSONDecodeError:
            print("Invalid JSON. Please provide a valid JSON file path or JSON string.")
            return None

# Load scenes from JSON
print("Loading scenes from JSON...")
data = load_scenes_json()

if not data or 'scenes' not in data:
    print("Error: Invalid JSON format. Expected JSON with 'scenes' array.")
    exit(1)

print(f"Loaded {len(data['scenes'])} scenes from JSON")

# Ensure output directory exists for each run
def ensure_output_dir():
    base_dir = 'final_videos'
    if not os.path.exists(base_dir):
        os.makedirs(base_dir)
    timestamp = datetime.now().strftime('run_%Y%m%d_%H%M%S')
    run_dir = os.path.join(base_dir, timestamp)
    os.makedirs(run_dir)
    return run_dir

# Download video from URL
def download_video(url, filename):
    response = requests.get(url, stream=True)
    if response.status_code == 200:
        with open(filename, 'wb') as f:
            for chunk in response.iter_content(chunk_size=8192):
                f.write(chunk)
        print(f"Downloaded: {filename}")
    else:
        print(f"Failed to download {url}")

# Sanitize filename
def safe_filename(s):
    s = re.sub(r'[^\w\-_\. ]', '_', s)
    return s[:50]  # Limit length

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
    output_url = output.url
    print(f"File available at: {output_url}")
    return output_url

async def _generate_video(prompt, image_url):
    """Generate video using Replicate"""
    output = await replicate.async_run("kwaivgi/kling-v2.1",
                                       input={
                                           "prompt": prompt,
                                           "start_image": image_url,
                                           "mode": "pro"
                                       })
    output_url = output.url
    return output_url

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
    output_url = output.url
    return output_url

async def generate_scene(scene, idx, output_dir):
    """Generate complete scene with image, video, and sound"""
    print("***" * 10)
    print(scene["scene_image_prompt"])
    print("")
    print("Generating image...")
    image_url = await _generate_image(scene["scene_image_prompt"])
    print("Image generated: ", image_url)
    print("Generating video...")
    video_url = await _generate_video(scene["scene_video_prompt"], image_url)
    print("Video generated: ", video_url)
    print("Generating sound...")
    final_video = await _generate_sound(video_url, scene["scene_sound_prompt"])
    print("Sound generated: ", final_video)

    # Download the final video
    short_desc = safe_filename(scene["scene"]).replace(' ', '_')
    filename = os.path.join(output_dir, f"scene_{idx+1}_{short_desc}.mp4")
    download_video(final_video, filename)

    return final_video

async def main():
    """Main function to generate all scenes in parallel"""
    output_dir = ensure_output_dir()
    print(f"Starting generation of {len(data['scenes'])} scenes in parallel...")

    async with asyncio.TaskGroup() as tg:
        tasks = [
            tg.create_task(generate_scene(scene, idx, output_dir)) for idx, scene in enumerate(data["scenes"])
        ]

    results = [task.result() for task in tasks]

    print("\n" + "=" * 50)
    print("All scenes generation completed!")
    print("=" * 50)

    # Print scene descriptions in one line
    scene_descriptions = [scene['scene'] for scene in data["scenes"]]
    print(f"\nScene descriptions: {' '.join(scene_descriptions)}")
    
    # Print all video links
    print(f"\nVideo links:")
    for i, final_video in enumerate(results):
        print(f"{final_video}")

# Run the async main function
if __name__ == "__main__":
    asyncio.run(main())