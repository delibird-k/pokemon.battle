import { typeEffectiveness } from "./type-chart.js";

export function calculateDamage({ attacker, defender, move, randomFactor = 1 }) {
  if (!attacker || !defender || !move) throw new TypeError("攻撃側・防御側・技が必要です");
  if (move.category === "status" || !move.power) return { damage: 0, effectiveness: 1, stab: 1 };
  const attackStat = move.category === "physical" ? attacker.attack : attacker.spAttack;
  const defenseStat = move.category === "physical" ? defender.defense : defender.spDefense;
  if (!(attackStat > 0) || !(defenseStat > 0)) throw new RangeError("攻撃・防御の実数値は正の数である必要があります");
  const level = attacker.level ?? 50;
  const base = Math.floor(Math.floor((2 * level / 5 + 2) * move.power * attackStat / defenseStat) / 50) + 2;
  const stab = attacker.types?.includes(move.type) ? 1.5 : 1;
  const effectiveness = typeEffectiveness(move.type, defender.types);
  const random = Math.max(0, Math.min(1, randomFactor));
  const damage = effectiveness === 0 ? 0 : Math.max(1, Math.floor(Math.floor(base * stab * effectiveness) * random));
  return { damage, effectiveness, stab };
}
