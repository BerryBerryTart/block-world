declare module "./ai" {
  // Adjust these to your actual interfaces if you like
  interface AIMove {
    fromIdx: number;
    toIdx: number | null;
  }

  export function chooseAIMove(
    board: any, // or Board
    goalBoard: any, // or Board
    depth?: number,
    helperMode?: boolean
  ): AIMove | null;

  export function astar(board: any, goalBoard: any): AIMove[] | null;

  export function boardToState(board: Board): number[][];

  export function stateKey(state: number[][]): string;
}
export {};
