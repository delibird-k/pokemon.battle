export function createBattleState(playerTeam, opponentTeam) {
  if (playerTeam.length !== 3 || opponentTeam.length !== 3) throw new Error("チームはそれぞれ3匹必要です");
  const prepare = team => team.map(pokemon => ({
    ...structuredClone(pokemon),
    currentHp: pokemon.maxHp,
    status: null,
    moves: pokemon.moves.map(move => ({ ...move, currentPp: move.pp }))
  }));
  return {
    phase: "battle",
    turn: 1,
    active: { player: 0, opponent: 0 },
    teams: { player: prepare(playerTeam), opponent: prepare(opponentTeam) },
    log: ["バトル開始！"],
    winner: null
  };
}

export function appendLog(state, message) {
  return { ...state, log: [...state.log, message].slice(-80) };
}

export function getActivePokemon(state, side) {
  return state.teams[side][state.active[side]];
}

export function getAlivePokemon(team) {
  return team.filter(pokemon => pokemon.currentHp > 0);
}
