import { db } from "../helpers/db";
import { OutputType } from "./projects_GET.schema";
import superjson from 'superjson';

export async function handle(request: Request) {
  try {
    const projects = await db
      .selectFrom('projects')
      .selectAll()
      .orderBy('createdAt', 'desc')
      .execute();

    return new Response(superjson.stringify(projects satisfies OutputType), {
      headers: { 'Content-Type': 'application/json' },
    });
  } catch (error) {
    console.error("Error fetching projects:", error);
    const errorMessage = error instanceof Error ? error.message : "An unknown error occurred";
    return new Response(superjson.stringify({ error: `Failed to fetch projects: ${errorMessage}` }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }
}