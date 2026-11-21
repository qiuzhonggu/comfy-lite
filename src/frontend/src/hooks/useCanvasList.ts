import { ensureSampleSeeded } from "@/lib/sample";
import {
  createCanvas,
  deleteCanvas,
  exportCanvas,
  importCanvas,
  listCanvases,
  renameCanvas,
} from "@/lib/storage";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

export const CANVAS_LIST_KEY = ["canvases"] as const;

/** Local canvas list; seeds the sample canvas on first open */
export function useCanvasList() {
  return useQuery({
    queryKey: CANVAS_LIST_KEY,
    queryFn: async () => {
      await ensureSampleSeeded();
      return listCanvases();
    },
    staleTime: 0,
  });
}

function useInvalidateList() {
  const qc = useQueryClient();
  return () => {
    void qc.invalidateQueries({ queryKey: CANVAS_LIST_KEY });
  };
}

export function useCreateCanvas() {
  const invalidate = useInvalidateList();
  return useMutation({
    mutationFn: (name?: string) => createCanvas(name),
    onSuccess: () => {
      invalidate();
    },
  });
}

export function useRenameCanvas() {
  const invalidate = useInvalidateList();
  return useMutation({
    mutationFn: ({ id, name }: { id: string; name: string }) =>
      renameCanvas(id, name),
    onSuccess: () => {
      invalidate();
    },
  });
}

export function useDeleteCanvas() {
  const invalidate = useInvalidateList();
  return useMutation({
    mutationFn: (id: string) => deleteCanvas(id),
    onSuccess: () => {
      invalidate();
    },
  });
}

export function useImportCanvas() {
  const invalidate = useInvalidateList();
  return useMutation({
    mutationFn: (file: File) => importCanvas(file),
    onSuccess: () => {
      invalidate();
    },
  });
}

export function useExportCanvas() {
  return useMutation({
    mutationFn: (id: string) => exportCanvas(id),
  });
}
