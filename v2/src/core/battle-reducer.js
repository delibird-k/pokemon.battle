import { calculateDamage } from "./damage.js";
import { appendLog, getActivePokemon } from "./battle-state.js";

export function battleReducer(state, action) {
  if (state.phase !== "battle") return state;
  switch (action.type) {
    case "USE_MOVE": {
      const attacker = getActivePokemon(state, action.side);
      const defenderSide = action.side === "player" ? "opponent" : "player";
      const defender = getActivePokemon(state, defenderSide);
      const move = attacker.moves[action.moveIndex];
      if (!move || move.currentPp <= 0 || attacker.currentHp <= 0) return state;
      const next = structuredClone(state);
      const usedMove = next.teams[action.side][next.active[action.side]].moves[action.moveIndex];
      usedMove.currentPp -= 1;
      const hit = Math.random() * 100 < (move.accuracy ?? 100);
      if (!hit) return appendLog(next, `${attacker.name}の${move.name}！ しかし攻撃は外れた！`);
      const result = calculateDamage({ attacker, defender, move, randomFactor: 0.925 });
      const target = next.teams[defenderSide][next.active[defenderSide]];
      target.currentHp = Math.max(0, target.currentHp - result.damage);
      let log = `${attacker.name}の${move.name}！ ${result.damage}ダメージ！`;
      if (result.effectiveness > 1) log += " 効果はばつぐんだ！";
      if (result.effectiveness > 0 && result.effectiveness < 1) log += " 効果はいまひとつのようだ…";
      const updated = appendLog(next, log);
      if (target.currentHp === 0) {
        const remaining = updated.teams[defenderSide].findIndex(p => p.currentHp > 0);
        if (remaining < 0) return { ...appendLog(updated, `${action.side === "player" ? "相手" : "あなた"}のチームは全員たおれた！`), phase: "result", winner: action.side };
        updated.active[defenderSide] = remaining;
        return appendLog(updated, `${target.name}はたおれた！${updated.teams[defenderSide][remaining].name}が出てきた！`);
      }
      if (action.side === "opponent") updated.turn += 1;
      return updated;
    }
    case "SWITCH": {
      const team = state.teams[action.side];
      const nextIndex = action.pokemonIndex;
      if (!Number.isInteger(nextIndex) || !team[nextIndex] || team[nextIndex].currentHp <= 0 || nextIndex === state.active[action.side]) return state;
      const next = structuredClone(state);
      const previous = next.teams[action.side][next.active[action.side]];
      next.active[action.side] = nextIndex;
      return appendLog(next, `${action.side === "player" ? "あなた" : "相手"}は${previous.name}をひっこめた！ ${team[nextIndex].name}、きみにきめた！`);
    }
    default:
      return state;
  }
}
