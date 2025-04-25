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
  };
}

export interface MoveHistory {
  moveCount: number;
  move: string;
  player: CurrentPlayer;
}

export enum CurrentPlayer {
  PLAYER_1 = "P1",
  PLAYER_2 = "P2",
}

export enum GameMode {
  MANUAL = "MANUAL",
  CARD_CHOICE = "CARD_CHOICE",
  VS_AI = "VS_AI",
}

export enum AIStrategy {
  PLAY_TO_WIN = "P2W",
  PLAY_TO_STALL = "P2S",
}
