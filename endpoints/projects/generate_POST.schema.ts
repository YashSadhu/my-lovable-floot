import { z } from "zod";
import superjson from 'superjson';
import type { Selectable } from 'kysely';
import type { Projects } from '../../helpers/schema';

export const schema = z.object({
  prompt: z.string().min(10, "Prompt must be at least 10 characters long."),
  saveProject: z.boolean().default(false),
  title: z.string().min(1, "A title is required to save the project.").optional().default('Untitled Project'),
});

export type InputType = z.infer<typeof schema>;

export type GeneratedFile = {
  filePath: string;
  fileContent: string;
  fileType: string;
};

export type OutputType = {
  files: GeneratedFile[];
  savedProject: Selectable<Projects> | null;
};

export const postProjectsGenerate = async (body: InputType, init?: RequestInit): Promise<OutputType> => {
  const validatedInput = schema.parse(body);
  const result = await fetch(`/_api/projects/generate`, {
    method: "POST",
    body: JSON.stringify(validatedInput),
    ...init,
    headers: {
      "Content-Type": "application/json",
      ...(init?.headers ?? {}),
    },
  });

  if (!result.ok) {
    const rawResponse = await result.json();
    
    let errorMessage = 'Failed to generate project';
    
    // Handle superjson-wrapped errors (status 500 from backend)
    if (rawResponse && typeof rawResponse === 'object' && 'json' in rawResponse) {
      try {
        const errorObject = superjson.deserialize(rawResponse) as { error?: string };
        if (errorObject.error) {
          errorMessage = errorObject.error;
          
          // Extract and provide user-friendly messages for specific API errors
          if (errorMessage.includes('Credits exhausted')) {
            throw new Error('AI service credits have been exhausted. Please try again later or contact support to increase your quota.');
          } else if (errorMessage.includes('status: 429')) {
            throw new Error('AI service is currently rate limited. Please wait a moment and try again.');
          } else if (errorMessage.includes('status: 401') || errorMessage.includes('authentication')) {
            throw new Error('AI service authentication failed. Please contact support to resolve this issue.');
          } else if (errorMessage.includes('status: 403')) {
            throw new Error('AI service access is forbidden. Please contact support to resolve this issue.');
          } else if (errorMessage.includes('status: 5')) {
            throw new Error('AI service is currently experiencing issues. Please try again later.');
          }
          
          // Return the detailed error message as-is for other cases
          throw new Error(errorMessage);
        }
      } catch (deserializationError) {
        // If superjson deserialization fails, use the original error message if available
        if (rawResponse.json && rawResponse.json.error) {
          errorMessage = rawResponse.json.error;
        }
      }
    }
    // Handle plain JSON errors (non-superjson format)
    else if (rawResponse && typeof rawResponse === 'object' && 'error' in rawResponse) {
      errorMessage = rawResponse.error as string || errorMessage;
    }
    // Handle timeout and other special error types
    else if (rawResponse && typeof rawResponse === 'object' && 'errorType' in rawResponse && 'errorMessage' in rawResponse) {
      const errorType = rawResponse.errorType as string;
      const errorMsg = rawResponse.errorMessage as string;
      
      if (errorType === 'Sandbox.Timedout') {
        throw new Error(`Request timed out: ${errorMsg}. The AI service took too long to generate your website. Please try again with a simpler prompt or try again later.`);
      } else {
        throw new Error(`AI service error (${errorType}): ${errorMsg}`);
      }
    }
    
    throw new Error(errorMessage);
  }

  const rawResponse = await result.json();
  
  // Check if the response is a timeout or error response (plain JSON)
  if (rawResponse && typeof rawResponse === 'object' && 'errorType' in rawResponse && 'errorMessage' in rawResponse) {
    const errorType = rawResponse.errorType as string;
    const errorMessage = rawResponse.errorMessage as string;
    
    if (errorType === 'Sandbox.Timedout') {
      throw new Error(`Request timed out: ${errorMessage}. The AI service took too long to generate your website. Please try again with a simpler prompt or try again later.`);
    } else {
      throw new Error(`AI service error (${errorType}): ${errorMessage}`);
    }
  }
  
  // Check if the response has the expected superjson structure
  if (!rawResponse || typeof rawResponse !== 'object' || !('json' in rawResponse)) {
    throw new Error('Invalid response format from AI service. Expected superjson format but received plain JSON.');
  }
  
  // Deserialize the superjson response
  try {
    const parsed = superjson.deserialize(rawResponse) as OutputType;
    
    // Validate that the parsed response has the expected structure
    if (!parsed || typeof parsed !== 'object' || !('files' in parsed) || !('savedProject' in parsed)) {
      throw new Error('Invalid response structure from AI service. Missing required fields.');
    }
    
    return parsed;
  } catch (error) {
    if (error instanceof Error && error.message.includes('Invalid response')) {
      throw error; // Re-throw our custom validation errors
    }
    throw new Error(`Failed to parse AI service response: ${error instanceof Error ? error.message : 'Unknown parsing error'}`);
  }
};