const fs = require('fs');

async function findAudioModels() {
  const apiKey = process.env.REPLICATE_API_TOKEN || fs.readFileSync('.env.local', 'utf8').split('\n').find(line => line.startsWith('REPLICATE_API_TOKEN=')).split('=')[1];
  
  console.log('🔍 Searching for audio models...');
  
  try {
    let cursor = null;
    let found = 0;
    let checked = 0;
    
    do {
      const url = `https://api.replicate.com/v1/models?${cursor ? `cursor=${cursor}&` : ''}limit=25`;
      const response = await fetch(url, {
        headers: {
          'Authorization': `Token ${apiKey}`,
          'Content-Type': 'application/json'
        }
      });
      
      const data = await response.json();
      
      for (const model of data.results) {
        checked++;
        const description = model.description?.toLowerCase() || '';
        const name = model.name?.toLowerCase() || '';
        
        // Look for audio-related models
        if (/\b(audio|music|sound|speech|voice|tts|text-to-speech|musicgen|audioldm|bark|elevenlabs)\b/.test(description) ||
            /\b(audio|music|sound|speech|voice|tts|musicgen|bark)\b/.test(name)) {
          
          const schema = model.latest_version?.openapi_schema;
          const inputProps = schema?.components?.schemas?.Input?.properties || {};
          const outputSchema = schema?.components?.schemas?.Output || {};
          
          console.log(`\n🎵 POTENTIAL AUDIO MODEL: ${model.name}`);
          console.log(`  Description: ${description.substring(0, 100)}...`);
          console.log(`  Run count: ${model.run_count || 0}`);
          console.log(`  Input props: ${Object.keys(inputProps).join(', ')}`);
          console.log(`  Output: ${outputSchema.type} ${outputSchema.format}`);
          
          found++;
          if (found >= 10) break;
        }
      }
      
      cursor = data.next?.split('cursor=')[1] || null;
      if (found >= 10) break;
      
      await new Promise(resolve => setTimeout(resolve, 100));
      
    } while (cursor && checked < 500);
    
    console.log(`\n📊 Checked ${checked} models, found ${found} potential audio models`);
    
  } catch (error) {
    console.error('❌ Error:', error.message);
  }
}

findAudioModels();