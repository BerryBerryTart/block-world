export interface Board {
  columns: Array<Column>;
}

export interface Column {
  blocks: Array<Block>;
}

export interface Block {
  id: number;
}

