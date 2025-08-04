import { schema, OutputType } from "./generate_POST.schema";
import superjson from 'superjson';
import { db } from "../../helpers/db";
import { type Transaction } from 'kysely';
import type { DB } from '../../helpers/schema';

const LYZR_API_URL = 'https://agent-prod.studio.lyzr.ai/v3/inference/chat/';
const REQUEST_TIMEOUT_MS = 25000; // 25 seconds to stay under 30s serverless limit

function getLyzrApiKey(): string {
  // Read environment variable directly each time (ES modules don't cache env vars)
  const apiKey = process.env.LYZR_NEW_API_KEY;
  const expectedNewKey = 'sk-default-C4HCTvi4DF5CO3fnUKUp8BHUELioofP1';
  
  console.log("New API Key retrieval (ES modules):", {
    hasApiKey: !!apiKey,
    apiKeyLength: apiKey?.length || 0,
    apiKeyPrefix: apiKey?.substring(0, 8) + '...' || 'undefined',
    timestamp: new Date().toISOString(),
    environmentCheck: 'Fresh read from process.env.LYZR_NEW_API_KEY each call'
  });
  
  if (!apiKey) {
    console.error("LYZR_NEW_API_KEY environment variable is not set or empty:", {
      allEnvKeys: Object.keys(process.env).filter(key => key.includes('LYZR')),
      timestamp: new Date().toISOString()
    });
    throw new Error("AI service is not configured. Missing new API key.");
  }
  
  // Enhanced logging to verify the exact API key being used
  console.log("DETAILED API KEY VERIFICATION:", {
    keyFound: true,
    exactLength: apiKey.length,
    first20Characters: apiKey.substring(0, 20),
    last4Characters: apiKey.substring(apiKey.length - 4),
    fullKeyMasked: apiKey.substring(0, 20) + '...' + apiKey.substring(apiKey.length - 4),
    expectedNewKeyLength: expectedNewKey.length,
    expectedFirst20: expectedNewKey.substring(0, 20),
    expectedLast4: expectedNewKey.substring(expectedNewKey.length - 4),
    isExpectedNewKey: apiKey === expectedNewKey,
    keyStartsWithExpectedPrefix: apiKey.startsWith('sk-default-'),
    keyEndsWithExpectedSuffix: apiKey.endsWith('UELioofP1'),
    timestamp: new Date().toISOString()
  });
  
  console.log("New API Key successfully retrieved:", {
    keyFound: true,
    keyLength: apiKey.length,
    timestamp: new Date().toISOString()
  });
  
  return apiKey;
}

function generateSessionId(agentId: string): string {
  // Generate random alphanumeric string matching pattern like "9mjujpgcahk"
  const chars = 'abcdefghijklmnopqrstuvwxyz0123456789';
  let randomSuffix = '';
  for (let i = 0; i < 11; i++) {
    randomSuffix += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return `${agentId}-${randomSuffix}`;
}

function parseGeneratedFiles(aiResponse: string): OutputType['files'] {
  console.log("Attempting to parse AI response:", aiResponse.substring(0, 500) + "...");
  
  const files: OutputType['files'] = [];
  
  // More flexible regex that handles different comment formats and spacing
  const codeBlockRegex = /```(\w+)\s*(?:(?:\/\/|\/\*|<!--)\s*([^\n\r*]+?)(?:\s*\*\/|-->)?)?\s*\n([\s\S]*?)```/g;

  let match;
  let matchCount = 0;
  
  while ((match = codeBlockRegex.exec(aiResponse)) !== null) {
    matchCount++;
    const [fullMatch, lang, comment, content] = match;
    console.log(`Found code block ${matchCount}:`, { lang, comment: comment?.trim(), contentLength: content?.length });
    
    // Determine file path based on language and comment
    let filePath = '';
    if (comment && comment.trim()) {
      filePath = comment.trim();
    } else {
      // Default file names based on language
      switch (lang.toLowerCase()) {
        case 'html':
          filePath = 'index.html';
          break;
        case 'css':
          filePath = 'style.css';
          break;
        case 'javascript':
        case 'js':
          filePath = 'script.js';
          break;
        default:
          filePath = `file.${lang}`;
      }
    }
    
    const fileContent = content.trim();
    
    if (fileContent) {
      files.push({ 
        filePath, 
        fileContent, 
        fileType: lang.toLowerCase() 
      });
      console.log(`Added file: ${filePath} (${lang}, ${fileContent.length} chars)`);
    }
  }

  // If no code blocks found, try to extract content directly
  if (files.length === 0) {
    console.log("No code blocks found, attempting direct content extraction...");
    
    // Try to find HTML content
    const htmlMatch = aiResponse.match(/<!DOCTYPE html>[\s\S]*?<\/html>/i);
    if (htmlMatch) {
      files.push({
        filePath: 'index.html',
        fileContent: htmlMatch[0].trim(),
        fileType: 'html'
      });
      console.log("Found HTML content directly");
    }
    
    // Try to find CSS content (basic heuristic)
    const cssMatch = aiResponse.match(/(?:body|html|\.[\w-]+|\#[\w-]+)\s*\{[\s\S]*?\}/);
    if (cssMatch) {
      // Extract CSS-like content
      const cssContent = aiResponse.match(/(?:body|html|\.[\w-]+|\#[\w-]+)[\s\S]*?(?=(?:<!DOCTYPE|<script|$))/);
      if (cssContent) {
        files.push({
          filePath: 'style.css',
          fileContent: cssContent[0].trim(),
          fileType: 'css'
        });
        console.log("Found CSS content directly");
      }
    }
    
    // Try to find JavaScript content
    const jsMatch = aiResponse.match(/(?:function|const|let|var|document\.|console\.)[\s\S]*?(?=(?:<!DOCTYPE|body\s*\{|$))/);
    if (jsMatch) {
      files.push({
        filePath: 'script.js',
        fileContent: jsMatch[0].trim(),
        fileType: 'javascript'
      });
      console.log("Found JavaScript content directly");
    }
  }

  if (files.length === 0) {
    console.error("Could not parse any files from AI response. Full response:", aiResponse);
    throw new Error("The AI did not return any recognizable code. Please try a different prompt or check the AI service response format.");
  }

  console.log(`Successfully parsed ${files.length} files:`, files.map(f => `${f.filePath} (${f.fileType})`));
  return files;
}

async function saveProjectWithFiles(
  projectData: {
    prompt: string;
    title: string;
    description: string | null;
  },
  files: {
    filePath: string;
    fileContent: string;
    fileType: string;
  }[],
  trx: Transaction<DB>
) {
  const [newProject] = await trx
    .insertInto('projects')
    .values(projectData)
    .returningAll()
    .execute();

  if (!newProject || !newProject.id) {
    throw new Error("Failed to create project record.");
  }

  if (files.length > 0) {
    const fileInserts = files.map(file => ({
      projectId: newProject.id,
      ...file,
    }));

    await trx
      .insertInto('projectFiles')
      .values(fileInserts)
      .execute();
  }

  return newProject;
}

export async function handle(request: Request) {
  try {
    const apiKey = getLyzrApiKey();
    const json = JSON.parse(await request.text());
    const { prompt, saveProject, title } = schema.parse(json);

    // Optimized, more concise system prompt to reduce processing time
    const systemPrompt = `Create a functional single-page website. Respond with HTML, CSS, and JavaScript in separate code blocks:

\`\`\`html
<!-- index.html -->
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Website Title</title>
    <link rel="stylesheet" href="style.css">
</head>
<body>
    <!-- Content here -->
    <script src="script.js"></script>
</body>
</html>
\`\`\`

\`\`\`css
/* style.css */
body { margin: 0; font-family: Arial, sans-serif; }
/* Your styles */
\`\`\`

\`\`\`javascript
// script.js
document.addEventListener('DOMContentLoaded', function() {
    // Your code
});
\`\`\`

Make it responsive and modern. User request: "${prompt}"`;

    console.log("Sending request to Lyzr AI with optimized prompt length:", systemPrompt.length);

    // Create AbortController for timeout handling
    const abortController = new AbortController();
    const timeoutId = setTimeout(() => {
      abortController.abort();
    }, REQUEST_TIMEOUT_MS);

    let aiResponse;
    try {
      aiResponse = await fetch(LYZR_API_URL, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-api-key': apiKey,
        },
        body: JSON.stringify({
          agent_id: "689057a385a7ba76147f7820",
          session_id: generateSessionId("689057a385a7ba76147f7820"),
          user_id: "cedodee7893@efpaper.com",
          message: systemPrompt,
        }),
        signal: abortController.signal,
      });
    } catch (error) {
      clearTimeout(timeoutId);
      
      // Handle timeout specifically
      if (error instanceof Error && error.name === 'AbortError') {
        console.error("Request timed out after", REQUEST_TIMEOUT_MS, "ms:", error);
        throw new Error(`Request timed out after ${REQUEST_TIMEOUT_MS / 1000} seconds. The AI service is taking too long to generate your website. Please try again with a simpler, more specific prompt (e.g., "Create a simple landing page with hero section" instead of detailed requirements).`);
      }
      
      // Handle other fetch errors
      console.error("Fetch error:", error);
      throw new Error(`Failed to connect to AI service: ${error instanceof Error ? error.message : 'Unknown network error'}. Please try again in a moment.`);
    }

    clearTimeout(timeoutId);

    if (!aiResponse.ok) {
      const errorText = await aiResponse.text();
      console.error("Lyzr AI API Error:", {
        status: aiResponse.status,
        statusText: aiResponse.statusText,
        errorText
      });

      // Handle specific HTTP status codes with retry suggestions
      if (aiResponse.status === 429) {
        throw new Error(`AI service is currently rate limited (status: ${aiResponse.status}). Please wait a moment and try again with a simpler prompt.`);
      } else if (aiResponse.status >= 500) {
        throw new Error(`AI service is experiencing issues (status: ${aiResponse.status}). Please try again later or use a more focused prompt to reduce processing time.`);
      } else {
        throw new Error(`AI service failed with status: ${aiResponse.status}. ${errorText || 'Unknown error'}. Try simplifying your prompt if the issue persists.`);
      }
    }

    const aiData = await aiResponse.json();
    console.log("Lyzr AI API Response structure:", {
      keys: Object.keys(aiData || {}),
      type: typeof aiData,
      hasChoices: 'choices' in (aiData || {}),
      hasMessage: aiData?.choices?.[0]?.message ? true : false,
      hasResponse: 'response' in (aiData || {}),
      hasContent: 'content' in (aiData || {}),
      hasData: 'data' in (aiData || {}),
      fullResponse: aiData
    });

    // Try different possible response structures
    let generatedContent = '';
    
    // Check OpenAI-style structure
    if (aiData?.choices?.[0]?.message?.content) {
      generatedContent = aiData.choices[0].message.content;
      console.log("Found content in OpenAI-style structure");
    }
    // Check direct response field
    else if (aiData?.response) {
      generatedContent = aiData.response;
      console.log("Found content in response field");
    }
    // Check direct content field
    else if (aiData?.content) {
      generatedContent = aiData.content;
      console.log("Found content in content field");
    }
    // Check data field
    else if (aiData?.data) {
      generatedContent = typeof aiData.data === 'string' ? aiData.data : JSON.stringify(aiData.data);
      console.log("Found content in data field");
    }
    // Check if the response itself is a string
    else if (typeof aiData === 'string') {
      generatedContent = aiData;
      console.log("Response is directly a string");
    }
    // Check for message field directly
    else if (aiData?.message) {
      generatedContent = aiData.message;
      console.log("Found content in message field");
    }

    if (!generatedContent || typeof generatedContent !== 'string') {
      console.error("Could not extract content from Lyzr AI response:", {
        aiData,
        generatedContent,
        contentType: typeof generatedContent
      });
      throw new Error("AI service returned an invalid response format. Please try again with a simpler, more focused prompt.");
    }

    console.log("Successfully extracted content, length:", generatedContent.length);
    console.log("Content preview:", generatedContent.substring(0, 200) + "...");

    const files = parseGeneratedFiles(generatedContent);
    let savedProject = null;

    if (saveProject) {
      savedProject = await db.transaction().execute(async (trx) => {
        return await saveProjectWithFiles({
          prompt,
          title,
          description: `Website generated from prompt: "${prompt}"`
        }, files, trx);
      });
      console.log("Project saved successfully:", savedProject?.id);
    }

    return new Response(superjson.stringify({ files, savedProject } satisfies OutputType), {
      headers: { 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error("Error generating project:", {
      error,
      message: error instanceof Error ? error.message : 'Unknown error',
      stack: error instanceof Error ? error.stack : undefined
    });
    
    let errorMessage = "An unknown error occurred";
    
    if (error instanceof Error) {
      errorMessage = error.message;
      
      // Add retry suggestions for timeout and processing errors
      if (errorMessage.includes('timed out') || errorMessage.includes('too long')) {
        errorMessage += " Consider using a simpler prompt like 'Create a basic landing page' or 'Build a simple portfolio website' for faster processing.";
      } else if (errorMessage.includes('rate limited') || errorMessage.includes('experiencing issues')) {
        errorMessage += " You can try again in a few moments with a more concise prompt to reduce processing time.";
      }
    }
    
    return new Response(superjson.stringify({ error: `Failed to generate project: ${errorMessage}` }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }
}