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
