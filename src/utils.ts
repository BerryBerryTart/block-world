const getBlockColour = (index: number, totalBlocks: number): string => {
  const val = 360 * ((index + 1) / (totalBlocks + 1))
  return `hsl(${val}, 80%, 80%)`;
};

export { getBlockColour };
