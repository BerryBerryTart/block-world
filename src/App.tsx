import { useState, useEffect, useRef } from "react";
import { Board, Block, Column } from "./interfaces";

import "./App.less";

function App() {
  const [board, setBoard] = useState<Board>({} as Board);
  const [moveCount, setMoveCount] = useState(0);
  const [endGame, setEndGame] = useState(false);
  const [totalBlocks, setTotalBlocks] = useState(16);
  const [totalCols, setTotalCols] = useState(5);
  const dragItemPos = useRef(0);
  const dragItemId = useRef(0);
  const prevDragPos = useRef(0);

  //number of blocks change so reset game
  useEffect(() => {
    resetGame();
  }, [totalBlocks]);

  useEffect(() => {
    const boardEl = document.getElementById("board");
    if (boardEl) {
      boardEl.style.gridTemplateColumns = `${"auto ".repeat(totalCols)}`;
      resetGame();
    }
  }, [totalCols]);

  useEffect(() => {
    const setupCols = async () => {
      const boardEl = document.getElementById("board");
      if (boardEl) {
        boardEl.style.gridTemplateColumns = `${"auto ".repeat(totalCols)}`;
      }
    };
    const setupBoard = async () => {
      const cols = randomiseBoard();
      setBoard({ columns: cols });
    };
    setupCols().then(() => setupBoard());
  }, []);

  const randInt = (min: number, max: number): number => {
    return Math.floor(Math.random() * (max - min + 1)) + min;
  };

  const dragStart = (_: React.DragEvent, pos: number, id: number) => {
    dragItemPos.current = pos;
    dragItemId.current = id;
    prevDragPos.current = pos;
  };

  const dragEnter = (_: React.DragEvent, pos: number) => {
    dragItemPos.current = pos;
  };

  const drop = (_: React.DragEvent) => {
    if (dragItemPos.current === prevDragPos.current) return;
    const boardClone = structuredClone(board);
    const colRef = boardClone.columns[prevDragPos.current].blocks;
    const blockIndex = colRef.findIndex((el) => el.id === dragItemId.current);
    const blockBuffer = colRef.splice(blockIndex, 1)[0];
    boardClone.columns[dragItemPos.current].blocks.unshift(blockBuffer);
    setBoard(boardClone);
    endGameCheck(boardClone);
    setMoveCount(moveCount + 1);
  };

  const isSorted = (arr: Array<Block>): boolean => {
    if (arr.length < totalBlocks) return false;
    for (let i = 0; i < arr.length - 1; i++) {
      if (arr[i].id > arr[i + 1].id) {
        return false;
      }
    }
    return true;
  };

  const endGameCheck = (boardClone: Board) => {
    for (let i = 0; i < boardClone.columns.length; i++) {
      const blocks = boardClone.columns[i].blocks;
      if (isSorted(blocks)) {
        setEndGame(true);
        break;
      }
    }
  };

  //Fisher–Yates (aka Knuth) Shuffle
  function shuffle(array: Array<any>) {
    let currentIndex = array.length;

    // While there remain elements to shuffle...
    while (currentIndex != 0) {
      // Pick a remaining element...
      let randomIndex = Math.floor(Math.random() * currentIndex);
      currentIndex--;

      // And swap it with the current element.
      [array[currentIndex], array[randomIndex]] = [
        array[randomIndex],
        array[currentIndex],
      ];
    }
  }

  const randomiseBoard = (): Array<Column> => {
    const cols: Array<Column> = [];
    for (let i = 0; i < totalCols; i++) {
      cols.push({ blocks: [] } as Column);
    }
    for (let i = 0; i < totalBlocks; i++) {
      const randCol = randInt(0, totalCols - 1);
      cols[randCol].blocks.push({ id: i + 1 });
    }
    for (let i = 0; i < totalCols; i++) {
      shuffle(cols[i].blocks);
    }
    return cols;
  };

  const resetGame = () => {
    setEndGame(false);
    const newCols = randomiseBoard();
    setBoard({ columns: newCols });
    setMoveCount(0);
  };

  const getBlockColour = (index: number): string => {
    const floor = 96;
    const step = Math.floor((255 - floor) / totalBlocks);
    const val = (index * step + floor).toString(16);
    return `#${val}${val}${val}`;
  };

  return (
    <div id="gameContainer">
      <div id="board">
        {board.columns &&
          board.columns.map((el, index) => {
            return (
              <div
                key={`col-${index}`}
                className="col"
                onDragEnter={(e) => dragEnter(e, index)}
              >
                {el.blocks.map((block, blockIndex) => {
                  return (
                    <div
                      key={block.id}
                      className="block"
                      draggable={blockIndex === 0 && !endGame}
                      onDragStart={(e) => dragStart(e, index, block.id)}
                      onDragEnd={drop}
                      style={{ backgroundColor: getBlockColour(block.id) }}
                    >
                      {block.id}
                    </div>
                  );
                })}
              </div>
            );
          })}
      </div>
      <div id="info">
        <div>Move Count: {moveCount}</div>
        {!endGame && <button onClick={resetGame}>RESET</button>}
        {endGame && (
          <div id="endGameContainer">
            <div id="endHeader">Game Over.</div>
            <button onClick={resetGame}>PLAY AGAIN?</button>
          </div>
        )}
        <div id="controls">
          <label htmlFor="numBlocks">Total Blocks ({totalBlocks}): </label>
          <input
            type="range"
            name="numBlocks"
            step={1}
            min={5}
            max={20}
            value={totalBlocks}
            onChange={(e) => setTotalBlocks(parseInt(e.target.value))}
          />
          <label htmlFor="numBlocks">Total Cols ({totalCols}): </label>
          <input
            type="range"
            name="numBlocks"
            step={1}
            min={2}
            max={10}
            value={totalCols}
            onChange={(e) => setTotalCols(parseInt(e.target.value))}
          />
        </div>
      </div>
    </div>
  );
}

export default App;
