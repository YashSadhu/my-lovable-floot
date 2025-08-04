import { z } from "zod";
import superjson from 'superjson';
import type { Selectable } from 'kysely';
import type { Projects } from '../helpers/schema';

// No input schema for a simple GET all request.

export type OutputType = Selectable<Projects>[];

export const getProjects = async (init?: RequestInit): Promise<OutputType> => {
  const result = await fetch(`/_api/projects`, {
    method: "GET",
    ...init,
    headers: {
      "Content-Type": "application/json",
      ...(init?.headers ?? {}),
    },
  });

  if (!result.ok) {
    const errorObject = superjson.parse(await result.text()) as { error?: string };
    throw new Error(errorObject.error || 'Failed to fetch projects');
  }
  return superjson.parse<OutputType>(await result.text());
};