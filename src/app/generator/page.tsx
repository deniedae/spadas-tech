"use client";

import { useState } from "react";

export default function Generator() {
  const [product, setProduct] = useState("");
  const [listing, setListing] = useState<any>(null);
  const [loading, setLoading] = useState(false);

  async function generateListing() {
    setLoading(true);
    setListing(null);

    try {
      const res = await fetch("/api/generate", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          product: product,
        }),
      });

      const data = await res.json();

      console.log(data);

      setListing(data);

    } catch (error) {
      console.error(error);
      setListing({
        title: "Error",
        description: "Could not generate listing"
      });
    }

    setLoading(false);
  }

  return (
    <main className="p-8">
      <h1 className="text-4xl font-bold mb-2">
        🤖 AI Listing Generator
      </h1>

      <p className="mb-8">
        Create marketplace listings instantly.
      </p>


      <div className="border p-6 rounded-xl max-w-xl">

        <input
          className="w-full p-4 bg-gray-900 rounded"
          placeholder="Enter product..."
          value={product}
          onChange={(e)=>setProduct(e.target.value)}
        />

        <button
          onClick={generateListing}
          disabled={loading}
          className="mt-5 bg-blue-600 px-6 py-3 rounded"
        >
          {loading ? "Generating..." : "Generate Listing"}
        </button>

      </div>


      {listing && (
        <div className="mt-8 border p-6 rounded-xl max-w-xl">

          <h2 className="text-2xl font-bold">
            {listing.title}
          </h2>

          <p>
            {listing.price}
          </p>

          <p>
            {listing.description}
          </p>

        </div>
      )}

    </main>
  );
}