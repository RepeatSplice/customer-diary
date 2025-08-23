export default function NotFound() {
  return (
    <div className="h-full grid place-items-center">
      <div className="text-center max-w-md">
        <h1 className="text-3xl font-semibold">Page not found</h1>
        <p className="text-muted-foreground mt-2">
          The page you are looking for doesn’t exist or has been moved.
        </p>
        <a href="/dashboard" className="inline-block mt-4 underline">
          Back to dashboard
        </a>
      </div>
    </div>
  );
}
