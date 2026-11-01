import { Link } from 'react-router-dom';

export function NotFoundPage({ what = 'page' }: { what?: string }) {
  return (
    <div className="mx-auto flex max-w-xl flex-col gap-4 px-6 py-20 text-center" role="alert">
      <h1 className="m-0 text-3xl font-semibold">That {what} is not in this field</h1>
      <p className="m-0 text-mist">Nothing was found at this address. It may have been removed, or the link may be wrong.</p>
      <Link to="/" className="text-sm">
        Back to the sky explorer
      </Link>
    </div>
  );
}
