type Product = {
  name: string;
  brand: string;
  category: string;
};

export function generateListing(product: Product) {
  const title = `${product.brand} ${product.name}`;

  const description = `Selling a genuine ${product.name} by ${product.brand}.

Product Details:
• Brand: ${product.brand}
• Category: ${product.category}
• Genuine product
• Please review all photos for the item's cosmetic condition.
• Tested where possible before listing.

Package Includes:
• Item as shown in the photos.

If you have any questions, feel free to send a message before purchasing.`;

  return {
    title,
    description,
    condition: "Used - Good",
    category: product.category,
    itemSpecifics: {
      Brand: product.brand,
      Category: product.category,
      Condition: "Used - Good",
    },
  };
}