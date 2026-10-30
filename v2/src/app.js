import { SAMPLE_POKEMON } from "./data/sample.js";
import { createBattleState, getActivePokemon } from "./core/battle-state.js";
import { battleReducer } from "./core/battle-reducer.js";
import { chooseRandomMove } from "./ai/random.js";

const screens = ["home", "setup", "battle", "result"];
const state = { selected: [], battle: null };
const $ = selector => document.querySelector(selector);
const showScreen = name => screens.forEach(screen => { $("#screen-" + screen).hidden = screen !== name; });
const escapeHtml = value => String(value).replace(/[&<>"']/g, char => ({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[char]));

function renderTeamPicker() {
  $("#team-picker").innerHTML = SAMPLE_POKEMON.map(pokemon => {
    const selected = state.selected.includes(pokemon.id);
    return `<button class="pokemon-option ${selected ? "selected" : ""}" data-pokemon-id="${pokemon.id}" aria-pressed="${selected}">
      <img src="${pokemon.sprite}" alt=""><span><strong>${escapeHtml(pokemon.name)}</strong><small>${pokemon.types.join(" / ")}</small></span>
    </button>`;
  }).join("");
  $("#setup-status").textContent = `${state.selected.length} / 3匹 選択中`;
  $('[data-action="begin-battle"]').disabled = state.selected.length !== 3;
}

function renderBattle() {
  const battle = state.battle;
  const player = getActivePokemon(battle, "player");
  const opponent = getActivePokemon(battle, "opponent");
  $("#turn-label").textContent = `TURN ${battle.turn}`;
  $("#player-active-name").textContent = player.name;
  $("#opponent-active-name").textContent = opponent.name;
  $("#player-sprite").src = player.sprite; $("#player-sprite").hidden = false;
  $("#opponent-sprite").src = opponent.sprite; $("#opponent-sprite").hidden = false;
  for (const [side, pokemon] of [["player", player], ["opponent", opponent]]) {
    const ratio = Math.max(0, pokemon.currentHp / pokemon.maxHp * 100);
    $("#"+side+"-hp-bar").style.width = ratio + "%";
    $("#"+side+"-hp-text").textContent = `HP ${pokemon.currentHp} / ${pokemon.maxHp}`;
  }
  for (const side of ["player", "opponent"]) {
    $("#"+side+"-team").innerHTML = battle.teams[side].map((pokemon, index) => `<span class="team-dot ${pokemon.currentHp <= 0 ? "fainted" : ""}" title="${escapeHtml(pokemon.name)}"></span>`).join("");
  }
  $("#battle-log").innerHTML = battle.log.slice(-8).map(line => `<li>${escapeHtml(line)}</li>`).join("");
  $("#move-choices").innerHTML = player.moves.map((move, index) => `<button class="move-button" data-move-index="${index}" ${move.currentPp <= 0 ? "disabled" : ""}><strong>${escapeHtml(move.name)}</strong><small>${move.type} / 威力 ${move.power} / PP ${move.currentPp}</small></button>`).join("");
}

function dispatch(action) {
  state.battle = battleReducer(state.battle, action);
  if (state.battle.phase === "result") {
    $("#result-title").textContent = state.battle.winner === "player" ? "あなたの勝ち！" : "あなたの負け…";
    $("#result-message").textContent = "バトルが終了しました。";
    showScreen("result");
  } else renderBattle();
}

document.addEventListener("click", event => {
  const actionButton = event.target.closest("[data-action]");
  if (actionButton) {
    switch (actionButton.dataset.action) {
      case "start-local": state.selected = []; renderTeamPicker(); showScreen("setup"); break;
      case "back-home": showScreen("home"); break;
      case "begin-battle": {
        const team = state.selected.map(id => SAMPLE_POKEMON.find(pokemon => pokemon.id === id));
        const opponent = SAMPLE_POKEMON.filter(pokemon => !state.selected.includes(pokemon.id)).slice(0, 3);
        state.battle = createBattleState(team, opponent);
        showScreen("battle"); renderBattle(); break;
      }
      case "forfeit":
        $("#result-title").textContent = "降参しました";
        $("#result-message").textContent = "タイトルへ戻って、もう一度対戦できます。";
        showScreen("result"); break;
    }
  }
  const pokemonButton = event.target.closest("[data-pokemon-id]");
  if (pokemonButton) {
    const id = Number(pokemonButton.dataset.pokemonId);
    if (state.selected.includes(id)) state.selected = state.selected.filter(value => value !== id);
    else if (state.selected.length < 3) state.selected.push(id);
    renderTeamPicker();
  }
  const moveButton = event.target.closest("[data-move-index]");
  if (moveButton && state.battle?.phase === "battle") {
    dispatch({ type: "USE_MOVE", side: "player", moveIndex: Number(moveButton.dataset.moveIndex) });
    if (state.battle.phase === "battle") {
      const cpu = getActivePokemon(state.battle, "opponent");
      const moveIndex = chooseRandomMove(cpu);
      if (moveIndex !== null) dispatch({ type: "USE_MOVE", side: "opponent", moveIndex });
    }
  }
});

showScreen("home");
