import { useQuery, useQueryClient } from "@tanstack/react-query";
import { getProjects } from "../endpoints/projects_GET.schema";
import { postProjects } from "../endpoints/projects_POST.schema";

export const useProjectsQueryKey = "projects";

export function useProjects() {
  return useQuery({
    queryKey: [useProjectsQueryKey],
    queryFn: () => getProjects(),
  });
}