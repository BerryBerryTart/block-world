const getBlockColour = (index: number, totalBlocks: number): string => {
  if (index < 0) {
    return "rgb(240, 248, 255)";
  }
  const val = 360 * ((index + 1) / (totalBlocks + 1));
  return `hsl(${val}, 80%, 80%)`;
};

// preserve exact left-to-right stacks (including empties)
function rawStateKey(stateArr: number[][]): string {
  // e.g. [ [], [2], [4], [3], [5], [1] ] → "2|4|3|5|1"
  return stateArr
    .map((stack) => stack.join(","))
    .filter((el) => el !== "")
    .join("|");
}

export { getBlockColour, rawStateKey };
