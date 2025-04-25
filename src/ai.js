/* ──────────────────────────────────────────────────────────────────────────
   Blocks-World AI helpers
   • successors            – generates every legal one-block move
   • heuristic             – admissible distance estimate
   • minimax / chooseAIMove– depth-limited helper / hinderer
   • astar                 – optimal solver (not used by React loop yet)
   Everything is pure JS; import with  `import { chooseAIMove } from "./ai.js"`
   ────────────────────────────────────────────────────────────────────────── */

/* ╭───────────────────   board ↔ internal state   ────────────────────────╮ */
/* React’s Board  →  number[][]   (column array, top block at index 0)       */
export function boardToState(board) {
    return board.columns.map(col => col.blocks.map(b => b.id));
  }
  
  /* Hash key that IGNORES table order but **does not** mutate the array.      */
export function stateKey(state) {
    // convert each stack to "3,1" etc., sort them, join with '|'
    return [...state].map(stk => stk.join(",")).sort().join("|");
  }
  
  /* ╭───────────────────   move generator   ────────────────────────────────╮ */
  function successors(state) {
    /* returns array of { state, from, to }
       to === null  ⇒ onto bare table (a new column is appended)              */
    const out = [];
    for (let i = 0; i < state.length; ++i) {
      const src = state[i];
      if (!src.length) continue;
      const blk = src[0];                            // top block
  
      /* 1. move onto bare table (create new column at end) */
      if (src.length > 1) {
        const next = state.map((stk, idx) =>
          idx === i ? stk.slice(1) : stk.slice()
        );
        const emptyIdx = next.findIndex(stk => stk.length === 0);
        if (emptyIdx >= 0) next[emptyIdx]=[blk];
        else next.push([blk]);         // no empty column
        out.push({ state: next, from: i, to: null });
      }
  
      /* 2. move onto another existing stack */
      for (let j = 0; j < state.length; ++j) {
        if (i === j) continue;
        const next = state.map((stk, idx) => {
          if (idx === i) return stk.slice(1);        // remove from src
          if (idx === j) return [blk, ...stk];       // add to dst (top = index 0)
          return stk.slice();
        });
        out.push({ state: next, from: i, to: j });
      }
    }
    return out;
  }
  
  /* ╭───────────────────   heuristic   ─────────────────────────────────────╮ */
  function heuristic(s, goal) {
    const want = new Map();
    goal.forEach((stk, idx) => stk.forEach(b => want.set(b, idx)));
  
    let cost = 0;
    s.forEach((stk, idx) => {
      stk.forEach((blk, h) => {
        if (want.get(blk) !== idx) { cost++; return; }
        const goalPrefix = goal[idx].slice(0, h + 1).join(",");
        const curPrefix  =       stk.slice(0, h + 1).join(",");
        if (goalPrefix !== curPrefix) cost++;
      });
    });
    return cost;
  }
  
  /* ╭───────────────────   depth-limited negamax   ─────────────────────────╮ */
  function minimax(state, goalArr, goalKey, depth, maxPlayer) {
    if (depth === 0 || stateKey(state) === goalKey) {
      return { score: -heuristic(state, goalArr), move: null };
    }
  
    let bestScore = maxPlayer ? -1e9 : 1e9;
    let bestMove  = null;
  
    for (const succ of successors(state)) {
      const child   = minimax(succ.state, goalArr, goalKey, depth - 1, !maxPlayer);
      const score   = -child.score;                 // swap perspective
      const better  = maxPlayer ? score > bestScore : score < bestScore;
      if (better) { bestScore = score; bestMove = succ; }
    }
    return { score: bestScore, move: bestMove };
  }
  
  /* ╭───────────────────   What React calls each AI turn   ─────────────────╮ */
  export function chooseAIMove(board, goalBoard, depth = 4, helperMode = true) {
    const curArr   = boardToState(board);
    const goalArr  = boardToState(goalBoard);
    const goalKey  = stateKey(goalArr);
  
    const { move } = minimax(curArr, goalArr, goalKey, depth, helperMode);
    if (!move) return null;                         // already at goal
    return { fromIdx: move.from, toIdx: move.to };  // toIdx === null ⇒ table
  }
  
  /* ╭───────────────────   OPTIMAL? SOLVER (A*)   ──────────────────────────╮ */
  export function astar(board, goalBoard) {
    const startArr = boardToState(board);
    const goalArr  = boardToState(goalBoard).slice(); 
    while (goalArr.length < startArr.length) goalArr.push([]);
    const goalKey  = stateKey(goalArr);
    console.log("A* goalArr and startArr:", goalArr, startArr);
  
    const frontier = new MinHeap();                         // [f, g, key, state]
    frontier.push([heuristic(startArr, goalArr), 0, stateKey(startArr), startArr]);
  
    const came = new Map();   // key → { parentKey, parentState, move }
    const gMap = new Map([[stateKey(startArr), 0]]);
  
    while (!frontier.empty()) {
      const [, gCur, curKey, curState] = frontier.pop();
      if (curKey === goalKey) {                 // reconstruct
        const path = [];
        let k = curKey;
        while (came.has(k)) {
          const { parentKey, move } = came.get(k);
          path.push(move);
          k = parentKey;
        }
        return path.reverse();
      }
  
      for (const succ of successors(curState)) {
        const nxtKey = stateKey(succ.state);
        const TentG  = gCur + 1;
        const knownG = gMap.get(nxtKey);
        if (knownG === undefined || TentG < knownG) {
          gMap.set(nxtKey, TentG);
          const f = TentG + heuristic(succ.state, goalArr);
          frontier.push([f, TentG, nxtKey, succ.state]);
          came.set(nxtKey, { parentKey: curKey, move: { fromIdx: succ.from, toIdx: succ.to } });
        }
      }
    }
    return null;                                   // unreachable (shouldn’t happen)
  }
  
  /* ╭───────────────────   tiny binary min-heap   ──────────────────────────╮ */
  class MinHeap {
    constructor() { this.data = []; }
    empty() { return this.data.length === 0; }
    push(x) {
      const a = this.data; a.push(x);
      for (let i = a.length - 1, p;
           (p = ((i - 1) >> 1)) >= 0 && a[i][0] < a[p][0]; ) {
        [a[i], a[p]] = [a[p], a[i]]; i = p;
      }
    }
    pop() {
      const a = this.data, top = a[0], last = a.pop();
      if (a.length) {
        a[0] = last;
        for (let i = 0, l; (l = (i << 1) + 1) < a.length; ) {
          const r = l + 1, s = r < a.length && a[r][0] < a[l][0] ? r : l;
          if (a[i][0] <= a[s][0]) break;
          [a[i], a[s]] = [a[s], a[i]]; i = s;
        }
      }
      return top;
    }
  }