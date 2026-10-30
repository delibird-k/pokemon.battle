// 初期動作確認用CPU。正式移植時に旧版AIを互換テストしながら置き換える。
export function chooseRandomMove(pokemon) {
  const available = pokemon.moves.map((move, index) => ({ move, index })).filter(entry => entry.move.currentPp > 0);
  if (!available.length) return null;
  return available[Math.floor(Math.random() * available.length)].index;
}
