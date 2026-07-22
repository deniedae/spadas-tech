export async function estimatePrice(product: {
  name: string;
  category: string;
}) {
  const name = product.name.toLowerCase();

  // Books
  if (product.category === "Books") {
    if (
      name.includes("harry potter") ||
      name.includes("lord of the rings") ||
      name.includes("hobbit")
    ) {
      return {
        suggestedPrice: 19.95,
        confidence: "High",
      };
    }

    return {
      suggestedPrice: 9.95,
      confidence: "Medium",
    };
  }

  // Games
  if (product.category === "Games") {
    return {
      suggestedPrice: 29.95,
      confidence: "Medium",
    };
  }

  // DVDs
  if (product.category === "DVDs") {
    return {
      suggestedPrice: 7.95,
      confidence: "Medium",
    };
  }

  return {
    suggestedPrice: 14.95,
    confidence: "Low",
  };
}