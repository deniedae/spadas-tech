import Link from "next/link";
import Head from "next/head";

export default function NotFound() {
  return (
    <>
      <Head>
        <title>404 - Page Not Found | Spadas AI</title>
      </Head>
      <main className="flex min-h-screen flex-col items-center justify-center gap-6 bg-muted/30 px-6 text-center">
        <p className="bg-gradient-to-r from-blue-600 via-blue-500 to-cyan-500 bg-clip-text text-7xl font-bold text-transparent select-none">
          404
        </p>
        <h1 className="text-xl font-semibold tracking-tight">Page not found</h1>
        <p className="max-w-sm text-sm text-muted-foreground">
          The page you&apos;re looking for doesn&apos;t exist or may have been moved.
        </p>
        <Link
          href="/dashboard"
          className="mt-4 inline-flex h-10 items-center rounded-xl bg-primary px-6 text-sm font-semibold text-primary-foreground transition-colors hover:bg-primary/90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/40"
        >
          Back to dashboard
        </Link>
      </main>
    </>
  );
}
