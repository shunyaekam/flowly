const fs = require('fs');

async function testReplicatePrompts() {
  const apiKey = process.env.REPLICATE_API_TOKEN || fs.readFileSync('.env.local', 'utf8').split('\n').find(line => line.startsWith('REPLICATE_API_TOKEN=')).split('=')[1];
  
  console.log('🔍 Testing Replicate API for example prompts...');
  
  try {
    // Test a popular model to see what data we can get
    const modelId = 'black-forest-labs/flux-1.1-pro';
    const response = await fetch(`https://api.replicate.com/v1/models/${modelId}`, {
      headers: {
        'Authorization': `Token ${apiKey}`,
        'Content-Type': 'application/json'
      }
    });
    
    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }
    
    const model = await response.json();
    
    console.log('📋 Model data structure:');
    console.log('- Name:', model.name);
    console.log('- Description length:', model.description?.length || 0);
    console.log('- Has latest_version:', !!model.latest_version);
    console.log('- Has openapi_schema:', !!model.latest_version?.openapi_schema);
    
    if (model.latest_version?.openapi_schema) {
      const schema = model.latest_version.openapi_schema;
      console.log('\\n📄 OpenAPI Schema analysis:');
      console.log('- Has components:', !!schema.components);
      console.log('- Has schemas:', !!schema.components?.schemas);
      console.log('- Has Input schema:', !!schema.components?.schemas?.Input);
      
      if (schema.components?.schemas?.Input) {
        const input = schema.components.schemas.Input;
        console.log('- Input properties:', Object.keys(input.properties || {}));
        
        // Check for example values
        Object.entries(input.properties || {}).forEach(([key, prop]) => {
          if (prop.example || prop.examples || prop.default) {
            console.log(`  - ${key} example:`, prop.example || prop.examples || prop.default);
          }
        });
      }
    }
    
    // Also check the model's README or other fields
    console.log('\\n📚 Other potential prompt sources:');
    Object.keys(model).forEach(key => {
      if (typeof model[key] === 'string' && model[key].length > 100) {
        console.log(`- ${key}: ${model[key].substring(0, 100)}...`);
      }
    });
    
  } catch (error) {
    console.error('❌ Error:', error.message);
  }
}

testReplicatePrompts();