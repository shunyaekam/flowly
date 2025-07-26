const fs = require('fs');
const path = require('path');

// Since we're using CommonJS in the script, we'll need to handle the TypeScript imports differently
async function syncModels() {
  console.log('🚀 Starting model sync...');
  const startTime = Date.now();

  const results = [];
  const allModels = [];

  // Get API keys from environment
  const replicateKey = process.env.REPLICATE_API_TOKEN;

  if (!replicateKey) {
    console.error('❌ REPLICATE_API_TOKEN not found in environment');
    process.exit(1);
  }

  try {
    // For now, we'll implement the sync logic directly here
    // Later this can be refactored to use the TypeScript classes
    
    console.log('🔄 Syncing Replicate models...');
    
    const models = [];
    let cursor = null;
    let fetched = 0;
    const maxModels = 1000; // Limit for initial implementation

    const headers = {
      'Authorization': `Token ${replicateKey}`,
      'Content-Type': 'application/json'
    };

    // Fetch models from Replicate API
    do {
      const url = `https://api.replicate.com/v1/models?${cursor ? `cursor=${cursor}&` : ''}limit=25`;
      
      const response = await fetch(url, { headers });
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      const data = await response.json();
      models.push(...data.results);

      cursor = data.next?.split('cursor=')[1] || null;
      fetched += data.results.length;

      console.log(`Fetched ${fetched} models...`);

      if (fetched >= maxModels) break;

      // Rate limiting
      await new Promise(resolve => setTimeout(resolve, 100));

    } while (cursor && fetched < maxModels);

    // Basic filtering and categorization
    const filteredModels = models.filter(model => {
      // Must have a valid schema and description
      return model.latest_version?.openapi_schema?.components?.schemas?.Input &&
             model.description &&
             model.description !== 'undefined' &&
             model.description.length > 10 &&
             (model.run_count || 0) >= 10;
    });

    // Simple categorization logic
    const categorizedModels = filteredModels.map(model => {
      const schema = model.latest_version?.openapi_schema;
      const inputProps = schema?.components?.schemas?.Input?.properties || {};
      const outputSchema = schema?.components?.schemas?.Output || {};
      const description = model.description?.toLowerCase() || '';
      const name = model.name.toLowerCase();

      let category = null;
      let confidence = 0.5;

      const defaultExample = model.default_example;

      // Must have prompt input
      if (!inputProps.prompt) {
        return null;
      }

      // Must have valid output format
      const hasValidOutput = (outputSchema.type === 'string' && outputSchema.format === 'uri') ||
                            outputSchema.type === 'array';
      
      if (!hasValidOutput) {
        return null;
      }

      // Check actual example output if available to determine type (PRIMARY METHOD)
      let exampleOutputType = null;
      if (defaultExample?.output && typeof defaultExample.output === 'string') {
        const outputUrl = defaultExample.output.toLowerCase();
        if (outputUrl.includes('.mp4') || outputUrl.includes('.mov') || outputUrl.includes('.webm')) {
          exampleOutputType = 'video';
        } else if (outputUrl.includes('.mp3') || outputUrl.includes('.wav') || outputUrl.includes('.m4a')) {
          exampleOutputType = 'audio';
        } else if (outputUrl.includes('.jpg') || outputUrl.includes('.png') || outputUrl.includes('.webp') || outputUrl.includes('.gif')) {
          exampleOutputType = 'image';
        }
      }

      // If we can determine from example output, use that (HIGH CONFIDENCE)
      if (exampleOutputType) {
        category = exampleOutputType;
        confidence = 0.9;
      } else {
        // Otherwise, use keyword-based categorization (FALLBACK)
        // Audio: Explicit audio keywords
        if (/\\b(audio|music|sound|speech|voice|tts|text-to-speech|musicgen|audioldm|bark)\\b/.test(description) ||
            /\\b(audio|music|sound|speech|voice|tts)\\b/.test(name)) {
          category = 'audio';
          confidence = 0.8;
        }
        // Video: Video keywords OR has video/image inputs (typical for video generation)
        else if (/\\b(video|animate|motion|clip|movie|footage|generate.*video)\\b/.test(description) ||
                 /\\b(video|animate|motion)\\b/.test(name) ||
                 (inputProps.start_image || inputProps.end_image || inputProps.video)) {
          category = 'video';
          confidence = 0.7;
        }
        // Image: Everything else (most common case)
        else {
          category = 'image';
          confidence = 0.6;
        }
      }

      if (!category || confidence < 0.4) return null;

      // Calculate quality score
      let qualityScore = 0;
      qualityScore += Math.log10((model.run_count || 1) + 1) * 10;
      if (model.description && model.description.length > 50) qualityScore += 20;
      if (['luma', 'stability-ai', 'openai', 'meta', 'bytedance'].includes(model.owner)) qualityScore += 15;

      return {
        id: `${model.owner}/${model.name}`,
        name: model.name,
        displayName: model.name.split('/').pop() || model.name,
        provider: 'replicate',
        category: category,
        endpoint: `${model.owner}/${model.name}`,
        version: model.latest_version?.id,
        defaultParams: {},
        inputMapping: {
          prompt: 'prompt',
          ...(inputProps.image ? { imageUrl: 'image' } : {}),
          ...(inputProps.start_image ? { imageUrl: 'start_image' } : {}),
          ...(inputProps.video ? { videoUrl: 'video' } : {})
        },
        outputMapping: { result: 'output' },
        metadata: {
          description: model.description || '',
          runCount: model.run_count || 0,
          confidence: confidence,
          qualityScore: qualityScore,
          createdAt: model.latest_version?.created_at,
          owner: model.owner,
          coverImage: model.cover_image_url,
          githubUrl: model.github_url,
          paperUrl: model.paper_url,
          licenseUrl: model.license_url,
          pricing: {
            tier: ['stability-ai', 'openai', 'meta'].includes(model.owner) ? 'premium' : 
                   (model.run_count || 0) > 10000 ? 'cheap' : 'free'
          },
          // Extract examples (store ALL model information as requested)
          examples: model.default_example && model.default_example.input && model.default_example.output ? [{
            input: model.default_example.input,
            output: model.default_example.output,
            prompt: model.default_example.input.prompt
          }] : undefined,
          // Extract parameter descriptions from OpenAPI schema
          parameterDescriptions: (() => {
            const descriptions = {};
            Object.entries(inputProps).forEach(([key, prop]) => {
              if (prop.description) {
                descriptions[key] = prop.description;
              }
            });
            return Object.keys(descriptions).length > 0 ? descriptions : undefined;
          })()
        }
      };
    }).filter(Boolean);

    // Sort by quality score
    categorizedModels.sort((a, b) => (b.metadata.qualityScore || 0) - (a.metadata.qualityScore || 0));

    allModels.push(...categorizedModels);

    const replicateResult = {
      provider: 'replicate',
      modelsFetched: models.length,
      modelsFiltered: categorizedModels.length,
      timeSeconds: (Date.now() - startTime) / 1000
    };

    results.push(replicateResult);

    const totalTime = (Date.now() - startTime) / 1000;

    // Create the cache file
    const cacheData = {
      lastSync: new Date().toISOString(),
      totalModels: allModels.length,
      syncResults: results,
      providers: results.reduce((acc, r) => {
        acc[r.provider] = {
          modelsFetched: r.modelsFetched,
          modelsFiltered: r.modelsFiltered,
          timeSeconds: r.timeSeconds,
          errors: r.errors
        };
        return acc;
      }, {}),
      models: allModels
    };

    // Write to file
    const cachePath = path.join(__dirname, '..', 'data', 'models-cache.json');
    fs.writeFileSync(cachePath, JSON.stringify(cacheData, null, 2));

    console.log(`✅ Sync complete! ${allModels.length} models in ${totalTime.toFixed(1)}s`);
    console.log('📊 Results:', results.map(r => `${r.provider}: ${r.modelsFiltered} models`).join(', '));

  } catch (error) {
    console.error('❌ Sync failed:', error);
    process.exit(1);
  }
}

syncModels();