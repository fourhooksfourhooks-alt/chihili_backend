export function generateSKU(productId, variant) {
  // Use last 5 chars of productId to shorten
  const pid = productId.toString().slice(-5).toUpperCase();

  // Standardize color code (first 3 letters, uppercase)
  const colorCode = variant.attributes.color
    ? variant.attributes.color.slice(0, 3).toUpperCase()
    : "XXX";

  // Standardize size code
  const sizeCode = variant.attributes.size || "00";

  // Random 3-digit number for uniqueness
  const randomSuffix = Math.floor(Math.random() * 900 + 100); // 100-999

  return `${pid}-${colorCode}-${sizeCode}-${randomSuffix}`;
}
