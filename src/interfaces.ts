export interface Board {
  columns: Array<Column>;
}

export interface Column {
  blocks: Array<Block>;
}

export interface Block {
  id: number;
}

export interface Graph {
  data: {
    id: string;
    source?: string;
    target?: string;
    label?: string;
  };
}

export enum CurrentPlayer {
  PLAYER_1 = "P1",
  PLAYER_2 = "P2",
}
