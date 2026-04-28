import { useEffect, useState } from 'react';
import api from '../lib/api';

interface AuthenticatedFileUrlState {
  objectUrl: string | null;
  loading: boolean;
  error: boolean;
}

/**
 * Fetches a private file (e.g. a CT scan) through the authenticated axios
 * client and exposes it as a `blob:` object URL safe to drop into <img src>.
 *
 * Why this exists: a plain <img src="..."> request never carries the JWT
 * Authorization header, so it can't reach an authenticated endpoint. Fetching
 * with axios + responseType:'blob' lets the request interceptor attach the
 * token; the resulting blob is wrapped in a temporary object URL.
 */
export function useAuthenticatedFileUrl(src: string | null | undefined): AuthenticatedFileUrlState {
  const [objectUrl, setObjectUrl] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(false);

  useEffect(() => {
    if (!src) {
      setObjectUrl(null);
      setLoading(false);
      setError(false);
      return;
    }

    let cancelled = false;
    let createdUrl: string | null = null;
    setLoading(true);
    setError(false);

    api
      .get<Blob>(src, { responseType: 'blob' })
      .then((response) => {
        if (cancelled) return;
        createdUrl = URL.createObjectURL(response.data);
        setObjectUrl(createdUrl);
        setLoading(false);
      })
      .catch(() => {
        if (cancelled) return;
        setError(true);
        setLoading(false);
      });

    return () => {
      cancelled = true;
      if (createdUrl) {
        URL.revokeObjectURL(createdUrl);
      }
    };
  }, [src]);

  return { objectUrl, loading, error };
}
