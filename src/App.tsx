import { useState, useEffect, useRef } from "react";
import { Board, Block, Column, Graph, CurrentPlayer } from "./interfaces";
import cytoscape from "cytoscape";

import "./App.less";
import { getBlockColour } from "./utils";
import resetIcon from "./assets/reset.svg";

function App() {
  const [currPlayer, setCurrPlayer] = useState<CurrentPlayer>(
    CurrentPlayer.PLAYER_1
  );
  const [board, setBoard] = useState<Board>({} as Board);
  const [goalBoard, setGoalBoard] = useState<Board>({} as Board);
  const [moveCount, setMoveCount] = useState(0);
  const [endGame, setEndGame] = useState(false);
  const [totalBlocks, setTotalBlocks] = useState(5);
  const [totalCols, setTotalCols] = useState(6);
  const gameState = useRef<Graph[]>([]);
  const dragItemPos = useRef(0);
  const dragItemId = useRef(0);
  const prevDragPos = useRef(0);
  const cyRef = useRef<cytoscape.Core | undefined>(undefined);

  //number of blocks change so reset game
  useEffect(() => {
    adjustGoalBoardCols();
    resetGame();
  }, [totalBlocks]);

  useEffect(() => {
    const boardEl = document.getElementById("board");
    if (boardEl) {
      boardEl.style.gridTemplateColumns = `${"auto ".repeat(totalCols)}`;
    }
    resetGame();
  }, [totalCols]);

  useEffect(() => {
    const setupCols = async () => {
      const boardEl = document.getElementById("board");
      if (boardEl) {
        boardEl.style.gridTemplateColumns = `${"auto ".repeat(totalCols)}`;
      }
    };
    adjustGoalBoardCols();
    const setupBoard = async () => {
      const cols = randomiseBoard();
      setBoard({ columns: cols });
      const g = randomiseBoard(true);
      setGoalBoard({ columns: g });
    };
    setupCols().then(() => setupBoard());
    cyRef.current = cytoscape({
      container: document.getElementById("cy"),
      elements: gameState.current,
      style: [
        // the stylesheet for the graph
        {
          selector: "node",
          style: {
            "background-color": "#999",
            label: "data(id)",
            color: "#FFF",
          },
        },
        {
          selector: "edge",
          style: {
            width: 3,
            "line-color": "#ccc",
            "target-arrow-color": "#ccc",
            "target-arrow-shape": "triangle",
            "curve-style": "bezier",
          },
        },
      ],
      layout: {
        name: "circle",
        radius: 200,
      },
    });
  }, []);

  const adjustGoalBoardCols = () => {
    const goalEl = document.getElementById("goalBoard");
    if (goalEl) {
      const goalCols = Math.ceil(totalBlocks / 4);
      goalEl.style.gridTemplateColumns = `${"auto ".repeat(goalCols)}`;
      goalEl.style.width = `${goalCols * 50}px`;
    }
  };

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
    const targetCol = boardClone.columns[dragItemPos.current].blocks;

    //graph stuff
    const source = blockBuffer.id.toString();
    const target =
      targetCol.length === 0 ? "TABLE" : targetCol[0].id.toString();
    gameState.current.push({
      data: {
        id: `${source}-${target}`,
        source,
        target,
      },
    });
    boardClone.columns[dragItemPos.current].blocks.unshift(blockBuffer);
    setBoard(boardClone);
    const hasWon = endGameCheck(boardClone);
    setMoveCount(moveCount + 1);
    cyRef.current?.add(gameState.current);
    if (!hasWon) {
      setCurrPlayer((prevState) => {
        if (prevState === CurrentPlayer.PLAYER_1) return CurrentPlayer.PLAYER_2;
        return CurrentPlayer.PLAYER_1;
      });
    }
  };

  const isSorted = (arr: Array<Block>): boolean => {
    if (arr.length === 0) return true;
    for (let g = 0; g < goalBoard.columns.length; g++) {
      const gCol = goalBoard.columns[g].blocks;
      if (gCol.length !== arr.length) continue;
      let matches = true;
      for (let i = 0; i < gCol.length; i++) {
        if (gCol[i].id !== arr[i].id) {
          matches = false;
          break;
        }
      }
      if (matches) return true;
    }
    return false;
  };

  const endGameCheck = (boardClone: Board) => {
    let hasWon = false;
    for (let i = 0; i < boardClone.columns.length; i++) {
      const blocks = boardClone.columns[i].blocks;
      hasWon = isSorted(blocks);
      if (!hasWon) return;
    }
    if (hasWon) {
      setEndGame(true);
    }
    return hasWon;
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

  const randomiseBoard = (isGoalBoard = false): Array<Column> => {
    const cols: Array<Column> = [];
    const numCols = isGoalBoard ? Math.ceil(totalBlocks / 4) : totalCols;
    for (let i = 0; i < numCols; i++) {
      cols.push({ blocks: [] } as Column);
    }
    for (let i = 0; i < totalBlocks; i++) {
      const randCol = randInt(0, numCols - 1);
      cols[randCol].blocks.push({ id: i + 1 });
    }
    for (let i = 0; i < numCols; i++) {
      shuffle(cols[i].blocks);
    }
    return cols;
  };

  const initGraph = () => {
    const buffer: Graph[] = [];
    buffer.push({ data: { id: "TABLE" } });
    for (let i = 1; i <= totalBlocks; i++) {
      buffer.push({ data: { id: i.toString() } });
    }
    return buffer;
  };

  const resetGraphView = () => {
    cyRef.current?.fit(undefined, 30);
  };

  const resetGame = () => {
    setEndGame(false);
    const newCols = randomiseBoard();
    setBoard({ columns: newCols });
    const newGoal = randomiseBoard(true);
    setGoalBoard({ columns: newGoal });
    setMoveCount(0);
    cyRef.current?.elements().remove();
    gameState.current = initGraph();
    cyRef.current?.add(gameState.current);
    cyRef.current?.layout({ name: "circle" }).run();
    setCurrPlayer(CurrentPlayer.PLAYER_1);
  };

  const renderBoard = (isMainBoard = true) => {
    const targetBoard = isMainBoard ? board : goalBoard;
    return targetBoard.columns.map((el, index) => {
      return (
        <div
          key={`col-${index}`}
          className={isMainBoard ? "col" : "goal-col"}
          onDragEnter={(e) => dragEnter(e, index)}
        >
          {el.blocks.map((block, blockIndex) => {
            return (
              <div
                key={block.id}
                className={isMainBoard ? "block" : "goal-block"}
                draggable={blockIndex === 0 && !endGame}
                onDragStart={(e) => dragStart(e, index, block.id)}
                onDragEnd={drop}
                style={{
                  backgroundColor: getBlockColour(block.id, totalBlocks),
                }}
              >
                {block.id}
              </div>
            );
          })}
        </div>
      );
    });
  };

  return (
    <div>
      <div id="resetContainer" onClick={resetGraphView}>
        <img id="resetIcon" src={resetIcon} />
        <span>Reset Graph View</span>
      </div>

      <div id="gameContainer">
        <div id="cy" />
        <div id="board">{board.columns && renderBoard()}</div>
        <div id="goal">
          <div id="goalBoard">{goalBoard.columns && renderBoard(false)}</div>
          <div id="goalText">GOAL STATE</div>
        </div>
        <div id="info">
          <div>
            <div>Turn Count: {moveCount}</div>
            {!endGame ? (
              <div>
                Player {currPlayer === CurrentPlayer.PLAYER_1 ? 1 : 2}'s Turn
              </div>
            ) : (
              <div>
                Player {currPlayer === CurrentPlayer.PLAYER_1 ? 1 : 2} Wins!!!
              </div>
            )}
          </div>
          {!endGame && <button onClick={resetGame}>RESET BOARD</button>}
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
              min={3}
              max={20}
              value={totalBlocks}
              onChange={(e) => setTotalBlocks(parseInt(e.target.value))}
            />
            <label htmlFor="numCols">Total Cols ({totalCols}): </label>
            <input
              type="range"
              name="numCols"
              step={1}
              min={3}
              max={10}
              value={totalCols}
              onChange={(e) => setTotalCols(parseInt(e.target.value))}
            />
          </div>
        </div>
      </div>
    </div>
  );
}

export default App;
