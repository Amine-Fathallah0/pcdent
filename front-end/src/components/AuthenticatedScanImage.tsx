import type { CSSProperties } from 'react';
import { useAuthenticatedFileUrl } from '../hooks/useAuthenticatedFileUrl';

interface AuthenticatedScanImageProps {
  src: string | null | undefined;
  alt: string;
  style?: CSSProperties;
  className?: string;
  fallback?: React.ReactNode;
}

const placeholderStyle = (style?: CSSProperties): CSSProperties => ({
  width: '100%',
  aspectRatio: '1',
  background: '#0F172A',
  borderRadius: 'var(--radius-md)',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  color: '#94A3B8',
  fontSize: 'var(--font-size-sm)',
  textAlign: 'center',
  padding: 'var(--space-12)',
  ...style,
});

/**
 * Displays a CT scan image fetched through the authenticated API.
 *
 * `src` should be the absolute URL returned by the backend (e.g.
 * `http://localhost:8000/ct-scans/42/file/`). The hook attaches the JWT,
 * receives the file as a blob, and renders it from a temporary object URL,
 * so the bytes are never accessible without authentication.
 */
export const AuthenticatedScanImage = ({
  src,
  alt,
  style,
  className,
  fallback,
}: AuthenticatedScanImageProps) => {
  const { objectUrl, loading, error } = useAuthenticatedFileUrl(src);

  if (!src) {
    return fallback ? <>{fallback}</> : null;
  }

  if (loading) {
    return <div style={placeholderStyle(style)}>Loading scan…</div>;
  }

  if (error || !objectUrl) {
    return <div style={placeholderStyle(style)}>Unable to load scan.</div>;
  }

  return <img src={objectUrl} alt={alt} style={style} className={className} />;
};

export default AuthenticatedScanImage;
