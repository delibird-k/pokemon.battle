import test from "node:test";
import assert from "node:assert/strict";
import { typeEffectiveness } from "../src/core/type-chart.js";
import { calculateDamage } from "../src/core/damage.js";
import { createBattleState } from "../src/core/battle-state.js";
import { battleReducer } from "../src/core/battle-reducer.js";

const pokemon = (id, name, types = ["normal"], hp = 100) => ({
  id, name, types, maxHp: hp, attack: 100, defense: 100,
  spAttack: 100, spDefense: 100, speed: 100,
  moves: [{ id: "hit", name: "たいあたり", type: "normal", category: "physical", power: 50, accuracy: 100, pp: 10 }]
});

test("タイプ相性: ほのお→くさは2倍", () => {
  assert.equal(typeEffectiveness("fire", ["grass"]), 2);
});

test("タイプ相性: でんき→じめんは無効", () => {
  assert.equal(typeEffectiveness("electric", ["ground"]), 0);
});

test("タイプ相性: 2タイプは倍率を掛け合わせる", () => {
  assert.equal(typeEffectiveness("ice", ["dragon", "flying"]), 4);
});

test("ダメージ: タイプ一致でダメージが増える", () => {
  const attacker = pokemon(1, "A", ["fire"]);
  const defender = pokemon(2, "B", ["grass"]);
  const move = { type: "fire", category: "special", power: 80 };
  const withStab = calculateDamage({ attacker, defender, move, randomFactor: 1 }).damage;
  const withoutStab = calculateDamage({ attacker: { ...attacker, types: ["water"] }, defender, move, randomFactor: 1 }).damage;
  assert.ok(withStab > withoutStab);
});

test("3匹以外のチームはバトル状態を作れない", () => {
  assert.throws(() => createBattleState([pokemon(1, "A")], [pokemon(2, "B")]));
});

test("攻撃でHPが減り、元の状態は変更されない", () => {
  const teamA = [pokemon(1, "A"), pokemon(2, "A2"), pokemon(3, "A3")];
  const teamB = [pokemon(4, "B"), pokemon(5, "B2"), pokemon(6, "B3")];
  const state = createBattleState(teamA, teamB);
  const next = battleReducer(state, { type: "USE_MOVE", side: "player", moveIndex: 0 });
  assert.ok(next.teams.opponent[0].currentHp < 100);
  assert.equal(state.teams.opponent[0].currentHp, 100);
  assert.equal(state.teams.player[0].moves[0].currentPp, 10);
  assert.equal(next.teams.player[0].moves[0].currentPp, 9);
});

test("交代先が倒れている場合は交代できない", () => {
  const teamA = [pokemon(1, "A"), pokemon(2, "A2"), pokemon(3, "A3")];
  const teamB = [pokemon(4, "B"), pokemon(5, "B2"), pokemon(6, "B3")];
  const state = createBattleState(teamA, teamB);
  state.teams.player[1].currentHp = 0;
  const next = battleReducer(state, { type: "SWITCH", side: "player", pokemonIndex: 1 });
  assert.equal(next.active.player, 0);
});
