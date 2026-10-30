// UIとゲームエンジンの動作確認専用データ。
// 正式移植時は旧版の全ポケモン・全技データに置き換える。
export const SAMPLE_POKEMON = [
  { id: 25, name: "ピカチュウ", types: ["electric"], maxHp: 110, attack: 90, defense: 55, spAttack: 90, spDefense: 60, speed: 110, sprite: "https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/25.png", moves: [
    { id: "thunderbolt", name: "10まんボルト", type: "electric", category: "special", power: 90, accuracy: 100, pp: 15 },
    { id: "quick-attack", name: "でんこうせっか", type: "normal", category: "physical", power: 40, accuracy: 100, pp: 30 }
  ]},
  { id: 6, name: "リザードン", types: ["fire", "flying"], maxHp: 153, attack: 104, defense: 98, spAttack: 129, spDefense: 105, speed: 120, sprite: "https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/6.png", moves: [
    { id: "flamethrower", name: "かえんほうしゃ", type: "fire", category: "special", power: 90, accuracy: 100, pp: 15 },
    { id: "air-slash", name: "エアスラッシュ", type: "flying", category: "special", power: 75, accuracy: 95, pp: 15 }
  ]},
  { id: 130, name: "ギャラドス", types: ["water", "flying"], maxHp: 170, attack: 145, defense: 99, spAttack: 80, spDefense: 120, speed: 101, sprite: "https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/130.png", moves: [
    { id: "waterfall", name: "たきのぼり", type: "water", category: "physical", power: 80, accuracy: 100, pp: 15 },
    { id: "ice-fang", name: "こおりのキバ", type: "ice", category: "physical", power: 65, accuracy: 95, pp: 15 }
  ]},
  { id: 445, name: "ガブリアス", types: ["dragon", "ground"], maxHp: 183, attack: 150, defense: 115, spAttack: 90, spDefense: 105, speed: 122, sprite: "https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/445.png", moves: [
    { id: "earthquake", name: "じしん", type: "ground", category: "physical", power: 100, accuracy: 100, pp: 10 },
    { id: "dragon-claw", name: "ドラゴンクロー", type: "dragon", category: "physical", power: 80, accuracy: 100, pp: 15 }
  ]},
  { id: 448, name: "ルカリオ", types: ["fighting", "steel"], maxHp: 145, attack: 135, defense: 90, spAttack: 140, spDefense: 90, speed: 110, sprite: "https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/448.png", moves: [
    { id: "aura-sphere", name: "はどうだん", type: "fighting", category: "special", power: 80, accuracy: 100, pp: 20 },
    { id: "meteor-mash", name: "コメットパンチ", type: "steel", category: "physical", power: 90, accuracy: 90, pp: 10 }
  ]},
  { id: 9, name: "カメックス", types: ["water"], maxHp: 158, attack: 103, defense: 120, spAttack: 105, spDefense: 125, speed: 88, sprite: "https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/9.png", moves: [
    { id: "surf", name: "なみのり", type: "water", category: "special", power: 90, accuracy: 100, pp: 15 },
    { id: "ice-beam", name: "れいとうビーム", type: "ice", category: "special", power: 90, accuracy: 100, pp: 10 }
  ]}
];
