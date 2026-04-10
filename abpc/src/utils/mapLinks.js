export const buildMapsSearchUrl = (address) =>
  `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(address)}`;

export const buildMapsDirectionsUrl = (address, origin) => {
  const destination = encodeURIComponent(address);
  if (!origin) {
    return `https://www.google.com/maps/dir/?api=1&destination=${destination}`;
  }

  const encodedOrigin = encodeURIComponent(origin);
  return `https://www.google.com/maps/dir/?api=1&origin=${encodedOrigin}&destination=${destination}`;
};
