import { Navigate, useSearchParams } from 'react-router-dom';

/**
 * Static Orbitals markup lives in index.html. Deep links still open the observer.
 * Navigate from an effect (not a layout effect): the router subscribes to the
 * history in its own layout effect, so an earlier redirect is lost and leaves
 * the app blank.
 */
export function LandingPage() {
  const [params] = useSearchParams();

  if (params.has('f') || params.has('ra')) {
    return <Navigate to={{ pathname: '/explorer', search: `?${params.toString()}` }} replace />;
  }

  return null;
}
