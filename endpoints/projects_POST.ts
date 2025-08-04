import { db } from "../helpers/db";
import { schema, OutputType } from "./projects_POST.schema";
import superjson from 'superjson';
import { type Transaction } from 'kysely';
import type { DB } from '../helpers/schema';

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
    .returning('id')
    .execute();

  if (!newProject || !newProject.id) {
    throw new Error("Failed to create project record.");
  }

  const projectId = newProject.id;

  if (files.length > 0) {
    const fileInserts = files.map(file => ({
      projectId,
      ...file,
    }));

    await trx
      .insertInto('projectFiles')
      .values(fileInserts)
      .execute();
  }

  return projectId;
}


export async function handle(request: Request) {
  try {
    const json = superjson.parse(await request.text());
    const { files, ...projectData } = schema.parse(json);

    const projectId = await db.transaction().execute(async (trx) => {
      return await saveProjectWithFiles(projectData, files, trx);
    });

    return new Response(superjson.stringify({ projectId } satisfies OutputType), {
      status: 201,
      headers: { 'Content-Type': 'application/json' },
    });
  } catch (error) {
    console.error("Error saving project:", error);
    const errorMessage = error instanceof Error ? error.message : "An unknown error occurred";
    return new Response(superjson.stringify({ error: `Failed to save project: ${errorMessage}` }), {
      status: 400,
      headers: { 'Content-Type': 'application/json' },
    });
  }
}