import { useMutation, useQueryClient } from "@tanstack/react-query";
import { postProjectsGenerate, InputType } from "../endpoints/projects/generate_POST.schema";
import { useProjectsQueryKey } from "./useProjects";

export function useGenerateProject() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: InputType) => postProjectsGenerate(data),
    onSuccess: (data) => {
      // If the project was saved, invalidate the projects list to refetch it
      if (data.savedProject) {
        queryClient.invalidateQueries({ queryKey: [useProjectsQueryKey] });
      }
    },
  });
}