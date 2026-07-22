import Link from "next/link";
export default function Home() {
  return (
    <main className="min-h-screen bg-gradient-to-br from-slate-900 via-blue-900 to-slate-950 text-white">

      <div className="max-w-7xl mx-auto px-8">

        <nav className="flex justify-between items-center py-8">
          <h1 className="text-3xl font-bold">
            SpadasTechnology
          </h1>

          <div className="space-x-4">
            <Link
              href="/login"
              className="text-gray-300 hover:text-white"
            >
              Login
            </Link>

            <Link
              href="/signup"
              className="bg-blue-600 hover:bg-blue-700 px-5 py-2 rounded-xl"
            >
              Get Started
            </Link>
          </div>
        </nav>

        <section className="py-32 text-center">

          <h2 className="text-6xl font-extrabold leading-tight">
            AI Powered <br />
            Marketplace Selling
          </h2>

          <p className="text-xl text-gray-300 mt-8 max-w-3xl mx-auto">
            Generate listings with AI, manage inventory,
            track profits and grow your reselling business
            all in one platform.
          </p>

          <div className="mt-12 flex justify-center gap-6">

            <Link
              href="/signup"
              className="bg-blue-600 hover:bg-blue-700 px-8 py-4 rounded-2xl text-lg font-semibold"
            >
              Start Free
            </Link>

            <Link
              href="/login"
              className="border border-white/30 px-8 py-4 rounded-2xl hover:bg-white/10"
            >
              Login
            </Link>

          </div>

        </section>

        <section className="grid md:grid-cols-3 gap-8 pb-32">

          <div className="bg-white/10 rounded-2xl p-8 backdrop-blur">
            <h3 className="text-2xl font-bold">
              🤖 AI Listings
            </h3>

            <p className="text-gray-300 mt-4">
              Generate professional marketplace listings in seconds.
            </p>
          </div>

          <div className="bg-white/10 rounded-2xl p-8 backdrop-blur">
            <h3 className="text-2xl font-bold">
              📦 Inventory
            </h3>

            <p className="text-gray-300 mt-4">
              Manage every item you own from one dashboard.
            </p>
          </div>

          <div className="bg-white/10 rounded-2xl p-8 backdrop-blur">
            <h3 className="text-2xl font-bold">
              📈 Profit Tracking
            </h3>

            <p className="text-gray-300 mt-4">
              Know exactly how much money you're making.
            </p>
          </div>

        </section>

      </div>

    </main>
  );
}