import { getMediaUrl } from "@/lib/storage";
import { useEffect, useState } from "react";

export interface MediaUrlState {
  url: string | null;
  loading: boolean;
  missing: boolean;
}

/** Resolves a stored media id to a cached object URL */
export function useMediaUrl(mediaId: string | undefined | null): MediaUrlState {
  const [state, setState] = useState<MediaUrlState>({
    url: null,
    loading: !!mediaId,
    missing: false,
  });

  useEffect(() => {
    if (!mediaId) {
      setState({ url: null, loading: false, missing: false });
      return;
    }
    let cancelled = false;
    setState((s) => ({ ...s, loading: true }));
    getMediaUrl(mediaId)
      .then((url) => {
        if (!cancelled) setState({ url, loading: false, missing: !url });
      })
      .catch(() => {
        if (!cancelled) setState({ url: null, loading: false, missing: true });
      });
    return () => {
      cancelled = true;
    };
  }, [mediaId]);

  return state;
}
