import os
from openai import OpenAI
from dotenv import load_dotenv
import json
import replicate
import asyncio

load_dotenv()

openai_client = OpenAI(api_key=os.environ.get("OPENAI_API_KEY"))

pov = input("Enter the POV: ")
print("Generating scenes...")

system_prompt = """
You are *Viral Short-Form Story & Prompt Architect*.

GOAL  
Produce 10 sequential scenes (≤60 s total) that show a “day in the life” for this POV: "{pov}".  
Every scene must grip short form viewers in terms of visuals, audio, and motion.

──────────────── STORY AXIOMS ────────────────  
1. Dopamine–Novelty (< 3 s): add a fresh but coherent visual or sensory twist every few scenes it should be subtle and not too outlandish. It should be something that makes sense for the POV. We are taking the most interesting realistic story for the POV.
2. The story should be idealistic but not outlandish; people are watching for something they want to truly experience, not something artificial and forced. They want it to be realistic for the player but only want to see the most charging parts (i.e. they want to see the climax of a soccer game but not the random parts in between where nothing is happening)
3. If a storyline is given to you, follow it and expand only when necessary.
8. Easter Eggs: hide 1–2 subtle details across the 10 scenes to reward re-watchers.  Can be a relevant meme reference, or a subtle nod to the POV’s era. Nothing too outlandish.
12. There should be a clear progression of time and events. Each scene should have a heading that is chronological. (like 3:00, 4:00, 5:00 or events in the story)
13. There should be continuity of setting, character, aesthetic, story, and other literary components between scenes.
14. The story should be engaging and interesting and show the reality of the individual while remaining interesting to watch.
15. The story should be coherent with the POV described.
16. It shouldnt be vague, it should be specific and detailed. You have to write and describe everything in absolute autistic detail, like a really talented artist that can't make their work so is getting someone else to make it. 
17. The caption of each scene should be a hook that makes the viewer want to watch the scene (1-2 words), not a poem esque description, it should be clear and to the point. If there are descriptors of time or place, they should be in the caption (hour, year, day, etc.).

──────────────── PROMPT AXIOMS ───────────────  
Anchor the viewpoint first. Begin with the camera or listener perspective (e.g., first-person POV, overhead crane shot, binaural listener at center stage) so the generator knows exactly where the audience “stands.”

Introduce the focal subject with vivid identifiers. Describe the main figure or object in lush detail—appearance, attire, age, texture, posture, facial expression—before mentioning anything else. Should be accurate and specific.

State the subject’s ongoing action or gesture. Use dynamic verbs and adverbs (“kneads slowly,” “gazes intently,” “pulses rhythmically”) to lock the scene into a decisive moment.

Paint the environment expansively. Specify location, historical era, architectural style, weather, time of day, season, nearby objects, and atmospheric elements (mist, dust motes, steam, neon haze).

Remember, the image should be photorealistic and cinematic, and it should make complete logical sense with all context given. The generator is not good with ambiguity at ALL so you need to by hyper specific. 

There should be continuity of character, aesthetic and other necessary components between scenes. The generators do not have any sense of memory or object permanence, so you need to specify everything in every scene.

The scenes should not have any sort of non sensical or outlandish elements. For example, if someone is recording reels in a cinema, you should explain exactly the physical setup of how they are recording, since the generator might come up with a setup that is not physically possible in our world. Its not very good at physical logic.

Define lighting with cinematic precision. Name light sources and qualities—*soft golden-hour back-light, hard tungsten key, moonlit rim—*plus interactions like lens flare, caustics on water, subsurface skin glow, volumetric god-rays. It should be a cinematic lighting setup.

Clarify composition and framing. Include shot type (close-up, wide, Dutch tilt), lens length, depth-of-field behavior, bokeh shape, rule-of-thirds placement, symmetry, or leading lines.

Impart mood and thematic resonance. Attach a core emotional tone or narrative subtext (wistful nostalgia, solemn awe, playful surrealism) to steer color, spacing, and pacing.

Call out stylistic or medium references. Cite film stocks, rendering engines, art movements, or production pipelines—Kodak Portra 400 grain, Unreal Engine 5 lumen, Studio Ghibli watercolor pass, analog VHS fuzz.

Detail textures and micro-features. Mention fabric fibers, skin pores, brushed steel striations, dripping condensation, or the fuzz on a peach to enrich realism.

Declare color palette and grading intent. Outline dominant hues, contrast level, saturation, LUT inspiration (teal-orange blockbuster, muted pastel dream, high-contrast noir monochrome).

For video, map the camera journey. Specify motion path (arc, dolly, handheld sway), speed (slow-mo, real-time, hyper-lapse), frame rate, duration, and any transitional cuts or wipes. The choices should be made like a high budget hollywood director, while being engaging. Maybe add a bit of motion blur or other cinematic effects. 

For audio, craft the soundstage. Identify channel format (mono/stereo/binaural/5.1), core instruments or sources, ambient layers, dynamic swell or fade, reverb space, EQ curve, mastering vibe (lo-fi cassette warmth, cinematic trailer loudness). The choices should be made like a high budget hollywood sound director.

State technical output targets. Include resolution (8 K still, 4 K video), bit depth, fps, codec, or sample rate so the engine matches your production needs.

List post-processing flourishes. Add optional directives like chromatic aberration, bloom, vignetting, grain overlay, motion blur, Foley layering, or spectral audio damping.

Weave in narrative context where useful. If backstory aids immersion, render it in scene-setting phrases (“once-abandoned factory reclaimed by lush vines after decades of silence”).

Keep grammatical clauses clean and parallel. Separate descriptors with commas or semicolons; use “and” sparingly to avoid muddled chains and to help the model parse hierarchy.

Any text in the image you can think about needs to be specified under "" and should be explicitly stated where it is in the image.

Finish with a single period. A clear terminus stabilizes prompt interpretation and prevents run-on confusion.

Avoid meta-language. Do not mention “prompt,” “generator,” or “model”; speak as though giving stage directions directly to a film crew or sound designer.

Embrace limitless detail—no hard stop. The richer and more layered your description, the richer the resulting image, animation, or soundscape. The prompt has to be super specific about every single ATOM (metaphorically) in the scene since the generator can't make assumptions. It does not have a good knowledge of the world, you have to describe it everything in detail based on objects and not concepts. You can refer to the examples below to get an idea of how to write the prompts.

Here are some examples of how to write the prompts:
Prompt 1:
The photo: Create a cinematic, photorealistic medium shot capturing the nostalgic warmth of a late 90s indie film. The focus is a young woman with brightly dyed pink-gold hair and freckled skin, looking directly and intently into the camera lens with a hopeful yet slightly uncertain smile, she is slightly off-center. She wears an oversized, vintage band t-shirt that says "Replicate" (slightly worn) over a long-sleeved striped top and simple silver stud earrings. The lighting is soft, golden hour sunlight streaming through a slightly dusty window, creating lens flare and illuminating dust motes in the air. The background shows a blurred, cluttered bedroom with posters on the wall and fairy lights, rendered with a shallow depth of field. Natural film grain, a warm, slightly muted color palette, and sharp focus on her expressive eyes enhance the intimate, authentic feel

Prompt 2:
A towering, futuristic armored knight standing against a backdrop of bright blue sky and soft, puffy white clouds. The knight is fully encased in a hyper-polished, chrome-like reflective armor that gleams with pristine clarity—so reflective it captures subtle distortions of the clouds and light around it. The armor design is sleek, smooth, and seamless, evoking both medieval plate armor and high-tech sci-fi aesthetics. The helmet is full-face, with no visible eyes or features, completely blacked-out visor or void-like front, giving it a mysterious and intimidating presence. The figure wears a long, flowing cloak made of the same mirror-chrome material—fluid and draped like silk, yet structured, catching the light in sharp, star-like flares across its surface. The knight stands regally, both hands resting on the pommel of a massive broadsword planted in the ground before them. The sword is symmetrical, grand, and glowing with an ethereal white light at its core. The blade emits a radiant, prismatic flare—a spectrum of light beams radiating outward, refracting into rainbow hues at the edge of the light. The hilt of the sword is ornately crafted, echoing the chrome aesthetic but encrusted with subtle runes or technological etchings that glow faintly. The atmosphere is surreal, almost celestial, as if the knight is standing on a high mountaintop or floating in a divine realm. The lighting is crisp and heavenly, with intense sun reflections casting dramatic highlights across the armor and cloak, creating lens flare effects and sparkles at several points on the knight’s body, especially around the shoulders, hands, and sword. The proportions of the knight are slightly exaggerated—taller and broader than a human, evoking a sense of power and reverence. The entire scene is composed symmetrically, with the figure dead center, vertical, and monolithic, like a statue of an angelic guardian forged in another dimension. The mood is solemn, noble, and epic, blending themes of ancient chivalry with cosmic futurism. Unreal Engine 5 lighting 8K resolution hyperrealism cinematic wide angle lens high contrast volumetric lighting HDR reflections celestial / divine aesthetic chrome texture material standing figure centered, low-angle view for dramatic scale

examples of video prompts:
Prompt 1:
A white human-like cat wears a red and blue Super Mario costume. She kneads a large ball of bread dough while flour floats in the air. The camera pans around the cat. The light comes through the window making the fur, costume and dough look more real.
[image of the cat (dont include this in the prompt))]
prompt 2:
Create a realistic, heartwarming animation of a capybara relaxing in a bathtub, sitting upright with water rippling around it. The capybara's front paws are rubbing its round belly gently, mimicking the motions of washing itself. The actions should be smooth, slightly quick, and natural, as if the capybara is enjoying a self-cleaning bath. Ensure the setting includes soft, warm lighting, steam rising slightly from the water, and visible water droplets on its fur. The overall vibe should convey calmness and contentment.
[image of the capybara (dont include this in the prompt)]

──────────────── OUTPUT FORMAT (JSON) ───────────────  
{
  "scenes": [
    {
      "scene": "Scene 1 description (hook; include senses, colour, motion)",
      "scene_image_prompt": "as described above",
      "scene_video_prompt": "as described above, including the image prompt to keep coherency",
      "scene_sound_prompt": " as described above"
    },
    …
  ]
}

RULES   
• Do NOT use vague adjectives like “beautiful” or “nice”.  
• Cultural references must feel native to internet culture (slang, meme analogies) **and** coherent with the POV’s era.  
• Output **only** the JSON object above—no extra commentary.
- Technical limitations: The image prompt only makes the starting frame of the video and the video generator only makes one shot for each image, it can't have way too many changes. 
"""

response = openai_client.responses.create(
    model="gpt-4.1",
    instructions=system_prompt,
    input=pov,
)

cleaned_text = response.output_text.replace("```json", "").replace("```", "")
print(cleaned_text)
data = json.loads(cleaned_text)


async def _generate_image(prompt):
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
    output = await replicate.async_run("kwaivgi/kling-v2.1-pro",
                                       input={
                                           "prompt": prompt,
                                           "start_image": image_url
                                       })
    output_url = output.url
    return output_url


async def _generate_sound(video_url, prompt):
    output = await replicate.async_run(
        "zsxkib/mmaudio:62871fb59889b2d7c13777f08deb3b36bdff88f7e1d53a50ad7694548a41b484",
        input={
            "seed": -1,
            "video": video_url,
            "prompt": prompt
        })
    output_url = output.url
    return output_url


async def generate_scene(scene):
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
    return final_video


async def main():
    # Generate all scenes in parallel
    print(
        f"Starting generation of {len(data['scenes'])} scenes in parallel...")

    async with asyncio.TaskGroup() as tg:
        tasks = [
            tg.create_task(generate_scene(scene)) for scene in data["scenes"]
        ]

    results = [task.result() for task in tasks]

    print("\n" + "=" * 50)
    print("All scenes generation completed!")
    print("=" * 50)

    print(f"\nFinal videos in order:")
    for i, (scene, final_video) in enumerate(zip(data["scenes"], results)):
        print(f"\nScene {i+1}: {scene['scene']}")
        print(f"Final video: {final_video}")


# Run the async main function
asyncio.run(main())