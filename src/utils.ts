const getBlockColour = (index: number, totalBlocks: number): string => {
  if (index < 0) {
    return "rgb(240, 248, 255)";
  }
  const val = 360 * ((index + 1) / (totalBlocks + 1));
  return `hsl(${val}, 80%, 80%)`;
};

export { getBlockColour };
