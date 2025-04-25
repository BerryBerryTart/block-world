import { useState, useEffect, useRef, JSX } from "react";
import { Board, Block, Column, Graph, CurrentPlayer } from "./interfaces";
import cytoscape from "cytoscape";

import "./App.less";
import { getBlockColour } from "./utils";
import resetIcon from "./assets/reset.svg";
import { chooseAIMove, astar, boardToState, stateKey  } from "./ai";
import { ActionCard } from "./ActionCard/ActionCard";

// preserve exact left-to-right stacks (including empties)
function rawStateKey(stateArr: number[][]): string {
  // e.g. [ [], [2], [4], [3], [5], [1] ] → "||2|4|3|5|1"
  return stateArr.map(stack => stack.join(",")).join("|");
}


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
  const [actions, setActions] = useState<JSX.Element[]>([]);
  const [showGraph, setShowGraph] = useState<boolean>(false);
  const [manualControl, setManualControl] = useState<boolean>(false);
  const currentStateKey = useRef<string>("");
  const seenStates = useRef<Set<string>>(new Set());

  //number of blocks changed so reset game
  useEffect(() => {
    adjustGoalBoardCols();
    resetGame();
  }, [totalBlocks]);

  //number of columns changed so reset game
  useEffect(() => {
    const boardEl = document.getElementById("board");
    if (boardEl) {
      boardEl.style.gridTemplateColumns = `${"auto ".repeat(totalCols)}`;
    }
    resetGame();
  }, [totalCols]);

  //pregame setup etc
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
    setupCols().then(() => resetGame());
    cyRef.current = cytoscape({
      container: document.getElementById("cy"),
      elements: gameState.current,
      style: [
        // the stylesheet for the graph
        {
          selector: "node",
          style: {
            'background-color': '#636363',
            'border-color': '#666',
            'label': 'data(label)',
            'color': '#FFF',
            'text-valign': 'center',
            'text-halign': 'center',
          },
        },
        {
          selector: "edge",
          style: {
            width: 3,
            "line-color": "#636363",
            "target-arrow-color": "#636363",
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
    
    resetGame();
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
    // const source = blockBuffer.id.toString();
    // const target =
    //   targetCol.length === 0 ? "TABLE" : targetCol[0].id.toString();
    // gameState.current.push({
    //   data: {
    //     id: `${source}-${target}`,
    //     source,
    //     target,
    //   },
    // });

    boardClone.columns[dragItemPos.current].blocks.unshift(blockBuffer);

    // update state-space graph (full board→state key)
    const stateArr = boardToState({ columns: boardClone.columns });
    const newKey   = stateKey(stateArr);
    // 1) add node if unseen
    if (!seenStates.current.has(newKey)) {
      const rawKey = rawStateKey(stateArr);
      gameState.current.push({ data: { id: newKey, label: rawKey } });
      seenStates.current.add(newKey);
    }
    // 2) add edge from previous state → new state
    gameState.current.push({
      data: {
        id: `${currentStateKey.current}->${newKey}`,
        source: currentStateKey.current,
        target: newKey,
      }
    });
    // 3) advance our pointer
    currentStateKey.current = newKey;

    setBoard(boardClone);
    const hasWon = endGameCheck(boardClone);
    setMoveCount(moveCount + 1);
    // cyRef.current?.add(gameState.current);
    // only add the two new elements we just pushed:
    const newEles = gameState.current.slice(-2);
    cyRef.current?.add(newEles);
  
    // re-layout (breadthfirst works well for a tree-like state‐space)
    cyRef.current
      ?.layout({
        name:        "breadthfirst",
        directed:    true,
        padding:     20,
        animate:     true,
        animationDuration: 300,
        
      })
      .run();

    // finally, fit everything neatly into view again
    cyRef.current?.fit(cyRef.current.elements(), 30);

    if (!hasWon) {
      setCurrPlayer((prevState) => {
        if (prevState === CurrentPlayer.PLAYER_1) return CurrentPlayer.PLAYER_2;
        return CurrentPlayer.PLAYER_1;
      });
    }
  };

  //avoid closures by generating actions WHEN the board has rendered
  // useEffect(() => {
  //   if (
  //     !manualControl &&                       // still in “button” mode
  //     currPlayer === CurrentPlayer.PLAYER_2 && !endGame
  //   ) {
  //     handleAIClick(true);   // or false for permanent adversary
  //   }
  // }, [currPlayer, manualControl, endGame, board, goalBoard]);
  

  // //limit to four actions?
  // const generateActions = () => {
  //   const ACTION_LIMIT = 4;
  //   const boardCols = board.columns;
  //   const actionSet = new Set<string>();

  //   //generate all possible actions
  //   for (let fromIndex = 0; fromIndex < boardCols.length; fromIndex++) {
  //     const fCol = boardCols[fromIndex].blocks;
  //     if (fCol.length === 0) continue;
  //     for (let toIndex = 0; toIndex < boardCols.length; toIndex++) {
  //       if (fromIndex === toIndex) continue;
  //       const tCol = boardCols[toIndex].blocks;

  //       //no need to move one block from the table to the table
  //       if (fCol.length === 1 && tCol.length === 0) continue;
  //       const fromBlock = fCol[0].id;
  //       const toBlock = tCol[0]?.id ?? -1;
  //       actionSet.add(`${fromBlock}|${toBlock}`);
  //     }
  //   }

  //   //create action options
  //   const actionBuffer = Array.from(actionSet);
  //   const actionElements: JSX.Element[] = [];

  //   //[TODO]: Generate better options instead of doing it randomly
  //   shuffle(actionBuffer);
  //   for (let i = 0; i < Math.min(ACTION_LIMIT, actionBuffer.length); i++) {
  //     const a = actionBuffer[i].split("|");
  //     const f = Number(a[0]);
  //     const t = Number(a[1]);
  //     let fIndex = -1;
  //     let tIndex = -1;
  //     //find index for each
  //     for (let j = 0; j < boardCols.length; j++) {
  //       const blocks = boardCols[j].blocks;
  //       if (blocks[0]?.id === f && fIndex === -1) {
  //         fIndex = j;
  //       }
  //       if (blocks[0]?.id === t && tIndex === -1) {
  //         tIndex = j;
  //       }
  //       //finds table
  //       if (blocks.length === 0 && t === -1 && tIndex === -1) {
  //         tIndex = j;
  //       }
  //     }
  //     const el = (
  //       <ActionCard
  //         from={f}
  //         to={t}
  //         totalBlocks={totalBlocks}
  //         key={actionBuffer[i]}
  //         clickFunc={() => playAction(fIndex, tIndex, f, t)}
  //       />
  //     );
  //     actionElements.push(el);
  //   }
  //   setActions(actionElements);
  // };

  const handleAIClick = (helperMode: boolean) => {
    if (endGame) return;                       // game already over
    /* ask minimax for the best move (helper-AI, depth 4) */
    let mv: { fromIdx: number; toIdx: number | null } | null = null;
    if (helperMode) {
      const path = astar(board, goalBoard);
      if (!path || path.length === 0) {
        console.warn("Already at goal or no A* path found");
        return;
      }
      mv = path[0];
    } else {
      mv = chooseAIMove(board, goalBoard, /*depth=*/4, /*helperMode=*/false);
    if (!mv) {
      console.warn("Already at goal or minimax had no move");
      return;
    }
    }
    
    let destIdx = mv.toIdx;
    console.log("AI move: ", mv.fromIdx, mv.toIdx);
    if (destIdx === null) {
      destIdx = board.columns.findIndex(c => c.blocks.length === 0);
      if (destIdx === -1) {
        console.warn("AI wanted to use the table, but no empty column exists.");
        return;                              // skip the move
      }
    }
  
    /* source & target IDs for graph */
    const sourceId = board.columns[mv.fromIdx].blocks[0].id;
    const targetId =
      board.columns[destIdx].blocks[0]?.id ?? -1;   // -1 means TABLE
  
    playAction(mv.fromIdx, destIdx, sourceId, targetId)
  };  

  const playAction = (
    fromIndex: number,
    toIndex: number,
    source: number,
    target: number
  ) => {
    const boardClone = structuredClone(board);
    const blockBuffer = boardClone.columns[fromIndex].blocks.shift() as Block;
    boardClone.columns[toIndex].blocks.unshift(blockBuffer);

    //graph stuff
    // gameState.current.push({
    //   data: {
    //     id: `${source}-${target}`,
    //     source: source.toString(),
    //     target: target > 0 ? target.toString() : "TABLE",
    //   },
    // });

    // update state-space graph (using full state keys, not just blocks)
    const stateArr = boardToState({ columns: boardClone.columns });
    const newKey   = stateKey(stateArr);
    // add new node if first time seen
    if (!seenStates.current.has(newKey)) {
      const rawKey = rawStateKey(stateArr);
      gameState.current.push({ data: { id: newKey, label: rawKey } });
      seenStates.current.add(newKey);
    }
    // add edge from previous state → new state
    gameState.current.push({
      data: {
        source: currentStateKey.current,
        target: newKey,
        id: `${currentStateKey.current}->${newKey}`
      }
    });
    // advance current state pointer
    currentStateKey.current = newKey;

    setBoard(boardClone);
    const hasWon = endGameCheck(boardClone);
    setMoveCount(moveCount + 1);
    // cyRef.current?.add(gameState.current);
    // cyRef.current?.fit( cyRef.current.elements(), 50 );
    // only add the two new elements we just pushed:
    const newEles = gameState.current.slice(-2);
    cyRef.current?.add(newEles);
  
    // re-layout (breadthfirst works well for a tree-like state‐space)
    cyRef.current
      ?.layout({
        name:        "breadthfirst",
        directed:    true,
        padding:     20,
        animate:     true,
        animationDuration: 300
      })
      .run();

    // finally, fit everything neatly into view again
    cyRef.current?.fit(cyRef.current.elements(), 30);
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
    const startArr = boardToState({ columns: newCols });
    const canonKey = stateKey(startArr);
    const rawKey   = rawStateKey(startArr);
    currentStateKey.current = canonKey;
    seenStates.current.clear();
    seenStates.current.add(canonKey);
    gameState.current = [
      { data: { id: canonKey, label: rawKey } }
    ];
    //gameState.current = initGraph();
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
                draggable={blockIndex === 0 && !endGame && manualControl}
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
      <div id="gameContainer">
        <div id="cy" style={{ opacity: showGraph ? "1" : "0" }} />
        <div id="board">{board.columns && renderBoard()}</div>
        <div id="goal">
          <div id="goalBoard">{goalBoard.columns && renderBoard(false)}</div>
          <div id="goalText">GOAL STATE</div>
          <button
            className="controlButton"
            onClick={() => setManualControl((p) => !p)}
          >
            {manualControl ? "AI Move" : "Manual Move"}
          </button>
          <button
            className="controlButton"
            onClick={() => setShowGraph((p) => !p)}
          >
            {showGraph ? "Hide State Graph" : "Show State Graph"}
          </button>
          {showGraph && (
            <button
              className="controlButton"
              id="resetContainer"
              onClick={resetGraphView}
            >
              <img id="resetIcon" src={resetIcon} />
              <span>Reset Graph View</span>
            </button>
          )}
        </div>
        <div id="info">
          <div id="leftControls">
            <div className="infoText">Turn Count: {moveCount}</div>
            {!endGame ? (
              <div className="infoText">
                Player {currPlayer === CurrentPlayer.PLAYER_1 ? 1 : 2}'s Turn
              </div>
            ) : (
              <div className="infoText">
                Player {currPlayer === CurrentPlayer.PLAYER_1 ? 1 : 2} Wins!!!
              </div>
            )}
            {!endGame && (
              <button className="controlButton" onClick={resetGame}>
                RESET BOARD
              </button>
            )}
            {endGame && (
              <div id="endGameContainer">
                <button className="controlButton" onClick={resetGame}>
                  PLAY AGAIN?
                </button>
              </div>
            )}
          </div>
          <div id="middleControls">
            {endGame && <div id="endHeader">Game Over.</div>}
            {!manualControl && !endGame && (
                <>
                  <button
                    className="controlButton"
                    onClick={() => handleAIClick(true)}        // cooperative AI
                    disabled={false}
                  >
                    Helper AI
                  </button>
                  <button
                    className="controlButton"
                    onClick={() => handleAIClick(false)}       // adversarial AI
                    disabled={false}
                  >
                    Hinder AI
                  </button>
                </>
              )           
            }
            {!manualControl && !endGame && (
              <div id="moveHeader">Select an AI Mode</div>
            )}
          </div>

          <div id="controls">
            <label htmlFor="numBlocks">Total Blocks ({totalBlocks}): </label>
            <input
              type="range"
              name="numBlocks"
              step={1}
              min={3}
              max={10}
              value={totalBlocks}
              onChange={(e) => setTotalBlocks(parseInt(e.target.value))}
            />
            <label htmlFor="numCols">Total Cols ({totalCols}): </label>
            <input
              type="range"
              name="numCols"
              step={1}
              min={4}
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
