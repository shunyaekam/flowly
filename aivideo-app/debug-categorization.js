const fs = require('fs');

async function debugCategorization() {
  const apiKey = process.env.REPLICATE_API_TOKEN || fs.readFileSync('.env.local', 'utf8').split('\n').find(line => line.startsWith('REPLICATE_API_TOKEN=')).split('=')[1];
  
  console.log('🔍 Debugging model categorization...');
  
  try {
    // Fetch a few models to analyze categorization
    const response = await fetch('https://api.replicate.com/v1/models?limit=50', {
      headers: {
        'Authorization': `Token ${apiKey}`,
        'Content-Type': 'application/json'
      }
    });
    
    const data = await response.json();
    console.log(`📊 Analyzing ${data.results.length} models...`);
    
    let totalModels = 0;
    let filteredModels = 0;
    let categorized = { image: 0, video: 0, audio: 0, uncategorized: 0 };
    
    data.results.forEach(model => {
      totalModels++;
      
      // Apply our current quality filters
      const hasValidSchema = !!model.latest_version?.openapi_schema?.components?.schemas?.Input;
      const hasDescription = model.description && model.description !== 'undefined' && model.description.length > 10;
      const hasReasonableRunCount = (model.run_count || 0) >= 10;
      
      if (!hasValidSchema || !hasDescription || !hasReasonableRunCount) {
        return; // Skip this model
      }
      
      filteredModels++;
      
      // Apply our current categorization logic
      const schema = model.latest_version?.openapi_schema;
      const inputProps = schema?.components?.schemas?.Input?.properties || {};
      const outputSchema = schema?.components?.schemas?.Output || {};
      const description = model.description?.toLowerCase() || '';
      const name = model.name.toLowerCase();
      
      let category = null;
      
      // Accept both string URI and array outputs
      const hasValidOutput = (outputSchema.type === 'string' && outputSchema.format === 'uri') ||
                            outputSchema.type === 'array';
      
      if (hasValidOutput && inputProps.prompt) {
        // Audio: Must have explicit audio keywords AND video/audio input
        if ((inputProps.video || inputProps.audio) && 
            /\\b(audio|music|sound|speech|voice|tts|text-to-speech)\\b/.test(description)) {
          category = 'audio';
        }
        // Video: Has image input OR video keywords (but not audio)
        else if ((inputProps.start_image || inputProps.image || inputProps.end_image || inputProps.video ||
                  /\\b(video|animate|motion|clip|movie|footage)\\b/.test(description)) &&
                 !/\\b(audio|music|sound|speech|voice|tts)\\b/.test(description)) {
          category = 'video';
        }
        // Image: Pure text-to-image (no image/video inputs)
        else if (!inputProps.start_image && !inputProps.image && !inputProps.end_image && !inputProps.video &&
                 (/\\b(image|text-to-image|generate|photo|picture|illustration|art)\\b/.test(description) ||
                  ['flux', 'sd', 'diffusion', 'dalle', 'midjourney'].some(keyword => name.includes(keyword)))) {
          category = 'image';
        }
      }
      
      if (category) {
        categorized[category]++;
        
        // Log examples for debugging
        if (categorized[category] <= 2) {
          console.log(`\\n${category.toUpperCase()} example:`, model.name);
          console.log('  Description:', description.substring(0, 100) + '...');
          console.log('  Input props:', Object.keys(inputProps));
          console.log('  Output:', outputSchema.type, outputSchema.format);
          console.log('  Run count:', model.run_count);
        }
      } else {
        categorized.uncategorized++;
        if (categorized.uncategorized <= 3) {
          console.log(`\\n❓ UNCATEGORIZED:`, model.name);
          console.log('  Description:', description.substring(0, 100) + '...');
          console.log('  Input props:', Object.keys(inputProps));
          console.log('  Output:', outputSchema.type, outputSchema.format);
        }
      }
    });
    
    console.log('\\n📈 Results:');
    console.log(`Total models checked: ${totalModels}`);
    console.log(`Passed quality filters: ${filteredModels}`);
    console.log(`Categorized:`, categorized);
    console.log(`Filter pass rate: ${((filteredModels/totalModels)*100).toFixed(1)}%`);
    
  } catch (error) {
    console.error('❌ Error:', error.message);
  }
}

debugCategorization();