import { z } from "zod";
import superjson from 'superjson';

export const fileSchema = z.object({
  filePath: z.string().min(1, "File path cannot be empty."),
  fileContent: z.string(),
  fileType: z.string().min(1, "File type cannot be empty."),
});

export const schema = z.object({
  prompt: z.string().min(1, "Prompt is required."),
  title: z.string().min(1, "Title is required."),
  description: z.string().nullable().default(null),
  files: z.array(fileSchema),
});

export type InputType = z.infer<typeof schema>;

export type OutputType = {
  projectId: number;
};

export const postProjects = async (body: InputType, init?: RequestInit): Promise<OutputType> => {
  const validatedInput = schema.parse(body);
  const result = await fetch(`/_api/projects`, {
    method: "POST",
    body: superjson.stringify(validatedInput),
    ...init,
    headers: {
      "Content-Type": "application/json",
      ...(init?.headers ?? {}),
    },
  });

  if (!result.ok) {
    const errorObject = superjson.parse(await result.text()) as { error?: string };
    throw new Error(errorObject.error || 'Failed to save project');
  }
  return superjson.parse<OutputType>(await result.text());
};