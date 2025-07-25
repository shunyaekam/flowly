# flowly

frictionless and flexible ai video generation.

live at [flowly.studio](https://flowly.studio)

## features

**visual storyboard editor**  
drag and connect scenes to define your video flow. reorder scenes by connecting edges between nodes.

**intelligent batch generation**  
automatically detects what content is missing and generates in the correct order (images → videos → audio).

**real-time cancellation**  
stop individual scenes or entire batch operations mid-generation via replicate api integration.

**adaptive scene navigation**  
navigate between scenes following your visual flow arrangement, not just array order.

**persistent project state**  
all scene data, positions, and generated content saved locally with export functionality.

**flexible prompt customization**  
edit general instructions and mode-specific prompts for different video styles.

**model selection**  
choose from multiple ai models for images, videos, and audio generation.

## installation

### for beginners

1. **install node.js**  
   download and install from [nodejs.org](https://nodejs.org) (choose the lts version)

2. **download the code**  
   click the green "code" button on this page, then "download zip". extract the folder.

3. **open terminal**  
   - **windows**: press `win + r`, type `cmd`, press enter
   - **mac**: press `cmd + space`, type `terminal`, press enter
   - **linux**: press `ctrl + alt + t`

4. **navigate to the folder**  
   type `cd ` (with a space) then drag the extracted folder into the terminal window. press enter.

5. **install dependencies**  
   ```
   npm install
   ```

6. **start the app**  
   ```
   npm run dev
   ```

7. **open your browser**  
   go to `http://localhost:3000`

8. **add your api keys**  
   click "settings" and add your replicate api key (required) and openai api key (optional).

### api keys

- **replicate**: sign up at [replicate.com](https://replicate.com), go to account settings, copy your api token
- **openai**: sign up at [platform.openai.com](https://platform.openai.com), create an api key

## experimental code

the `/Experimental Implementations` folder contains deprecated python scripts that were used for initial prototyping. these scripts tested various ai models and generation workflows before the main web application was built. they are no longer maintained but kept for reference.

## tech stack

- **next.js 15** - react framework
- **typescript** - type safety
- **zustand** - state management
- **react flow** - visual node editor
- **tailwind css** - styling
- **replicate api** - ai model hosting
- **openai api** - language models