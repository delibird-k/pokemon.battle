/* ============================================================
   ULTIMATE AI V11 FINAL
   PART 1
   BATTLE ENGINE / REAL GAME BRIDGE
   ============================================================ */

(function () {
    "use strict";

    if (window.__AI_V11_ENGINE_100__) return;
    window.__AI_V11_ENGINE_100__ = true;

    const VERSION = "11.0.100";

    /* =========================================================
       数値安全化
       ========================================================= */

    function num(v, fallback = 0) {
        const n = Number(v);
        return Number.isFinite(n) ? n : fallback;
    }

    function clamp(v, min, max) {
        return Math.max(min, Math.min(max, v));
    }

    function clone(obj) {
        if (obj == null) return obj;

        try {
            return structuredClone(obj);
        } catch (e) {
            try {
                return JSON.parse(JSON.stringify(obj));
            } catch (e2) {
                return obj;
            }
        }
    }

    /* =========================================================
       実ゲーム変数との接続
       
       重要：
       DOMContentLoaded内部のlet変数はwindowに存在しない。
       そのため、直接windowだけを見るのではなく、
       実際のゲーム側の変数を安全に取得する。
       ========================================================= */

    function getRealTeam(side) {

        if (side === "player") {

            if (
                typeof playerTeam !== "undefined" &&
                Array.isArray(playerTeam)
            ) {
                return playerTeam;
            }

            if (
                typeof window.playerTeam !== "undefined" &&
                Array.isArray(window.playerTeam)
            ) {
                return window.playerTeam;
            }

            if (
                typeof playerPokemon !== "undefined" &&
                playerPokemon
            ) {
                return [playerPokemon];
            }

            return [];
        }

        if (
            typeof opponentTeam !== "undefined" &&
            Array.isArray(opponentTeam)
        ) {
            return opponentTeam;
        }

        if (
            typeof window.opponentTeam !== "undefined" &&
            Array.isArray(window.opponentTeam)
        ) {
            return window.opponentTeam;
        }

        if (
            typeof opponentPokemon !== "undefined" &&
            opponentPokemon
        ) {
            return [opponentPokemon];
        }

        return [];
    }

    function getRealActiveIndex(side) {

        if (side === "player") {

            if (
                typeof playerActiveIndex !== "undefined"
            ) {
                return num(playerActiveIndex, 0);
            }

            return num(
                window.playerActiveIndex,
                0
            );
        }

        if (
            typeof opponentActiveIndex !== "undefined"
        ) {
            return num(opponentActiveIndex, 0);
        }

        return num(
            window.opponentActiveIndex,
            0
        );
    }

    function getDifficulty() {

        if (
            typeof difficulty !== "undefined"
        ) {
            return difficulty;
        }

        return window.difficulty || "normal";
    }

    /* =========================================================
       HP
       ========================================================= */

    function hp(pokemon) {
        if (!pokemon) return 0;

        return clamp(
            num(
                pokemon.currentHp ??
                pokemon.hp ??
                pokemon.currentHP,
                0
            ),
            0,
            num(
                pokemon.maxHp ??
                pokemon.maxHP ??
                pokemon.hpMax,
                Infinity
            )
        );
    }

    function maxHp(pokemon) {
        if (!pokemon) return 1;

        return Math.max(
            1,
            num(
                pokemon.maxHp ??
                pokemon.maxHP ??
                pokemon.hpMax,
                pokemon.hp ?? 1
            )
        );
    }

    function hpRate(pokemon) {
        return hp(pokemon) / maxHp(pokemon);
    }

    function alive(pokemon) {
        return !!pokemon && hp(pokemon) > 0;
    }

    /* =========================================================
       PP
       ========================================================= */

    function pp(move) {

        if (!move) return 0;

        if (
            move.pp === undefined ||
            move.pp === null
        ) {
            return 1;
        }

        return Math.max(
            0,
            num(move.pp, 0)
        );
    }

    function usableMoves(pokemon) {

        if (
            !pokemon ||
            !Array.isArray(pokemon.moves)
        ) {
            return [];
        }

        return pokemon.moves.filter(
            move =>
                move &&
                pp(move) > 0
        );
    }

    /* =========================================================
       実ゲームから取得
       ========================================================= */

    function getTeam(side) {
        return getRealTeam(side);
    }

    function getActiveIndex(side) {
        return getRealActiveIndex(side);
    }

    function getActive(side) {

        const t = getTeam(side);

        const index =
            getActiveIndex(side);

        return t[index] || null;
    }

    function aliveCount(side) {

        return getTeam(side)
            .filter(alive)
            .length;
    }

    /* =========================================================
       タイプ
       ========================================================= */

    function types(pokemon) {

        if (!pokemon) return [];

        if (Array.isArray(pokemon.types)) {
            return pokemon.types;
        }

        const result = [];

        if (pokemon.type1) {
            result.push(pokemon.type1);
        }

        if (pokemon.type2) {
            result.push(pokemon.type2);
        }

        return result;
    }

    /* =========================================================
       能力値
       ========================================================= */

    function stageMultiplier(stage) {

        stage = clamp(
            num(stage, 0),
            -6,
            6
        );

        if (stage >= 0) {
            return (2 + stage) / 2;
        }

        return 2 / (2 - stage);
    }

    function statValue(pokemon, stat) {

        if (!pokemon) return 0;

        let value =
            num(
                pokemon[stat],
                0
            );

        const stages =
            pokemon.stages || {};

        value *= stageMultiplier(
            stages[stat] || 0
        );

        if (
            stat === "speed" &&
            (
                pokemon.status === "paralyzed" ||
                pokemon.status === "まひ"
            )
        ) {
            value *= 0.5;
        }

        return Math.max(
            1,
            value
        );
    }

    /* =========================================================
       優先度
       ========================================================= */

    function priority(move) {

        if (!move) return 0;

        return num(
            move.priority ??
            move.priorityValue ??
            0,
            0
        );
    }

    /* =========================================================
       ダメージ
       ========================================================= */

    function damage(move, attacker, defender) {

        if (
            !move ||
            !attacker ||
            !defender ||
            !alive(attacker) ||
            !alive(defender)
        ) {
            return 0;
        }

        /* 実ゲームのダメージ計算を最優先 */

        try {

            if (
                typeof getAIDamage ===
                "function"
            ) {

                const d =
                    num(
                        getAIDamage(
                            move,
                            attacker,
                            defender
                        ),
                        0
                    );

                if (d > 0) {
                    return Math.min(
                        hp(defender),
                        Math.floor(d)
                    );
                }
            }

        } catch (e) {}

        /* フォールバック計算 */

        const power =
            num(move.power, 0);

        if (power <= 0) {
            return 0;
        }

        const level =
            num(
                attacker.level,
                50
            );

        const category =
            String(
                move.category ??
                move.damageClass ??
                ""
            ).toLowerCase();

        const special =
            category.includes("special") ||
            category === "特殊";

        const attack =
            statValue(
                attacker,
                special
                    ? "specialAttack"
                    : "attack"
            );

        const defense =
            statValue(
                defender,
                special
                    ? "specialDefense"
                    : "defense"
            );

        let result =
            Math.floor(
                (
                    (
                        (
                            2 * level / 5
                        ) + 2
                    ) *
                    power *
                    attack /
                    Math.max(1, defense)
                ) / 50
            ) + 2;

        /* STAB */

        if (
            types(attacker)
                .includes(move.type)
        ) {
            result *= 1.5;
        }

        /* タイプ相性 */

        try {

            if (
                typeof calculateTypeEffectiveness ===
                "function"
            ) {

                const eff =
                    num(
                        calculateTypeEffectiveness(
                            move.type,
                            types(defender)
                        ),
                        1
                    );

                result *= eff;
            }

        } catch (e) {}

        return clamp(
            Math.floor(result),
            0,
            hp(defender)
        );
    }

    /* =========================================================
       基本技評価
       ========================================================= */

    function basicMoveScore(
        move,
        attacker,
        defender
    ) {

        if (
            !move ||
            !attacker ||
            !defender
        ) {
            return -Infinity;
        }

        const d =
            damage(
                move,
                attacker,
                defender
            );

        let score = 0;

        /* ダメージ */

        score += d * 3;

        /* KO */

        if (
            d >= hp(defender)
        ) {
            score += 10000;
        }

        /* 相手HP割合 */

        if (
            hp(defender) > 0
        ) {
            score +=
                (
                    d /
                    hp(defender)
                ) * 800;
        }

        /* 回復技 */

        const name =
            String(
                move.name || ""
            );

        const recoveryMoves = new Set([
            "じこさいせい",
            "はねやすめ",
            "なまける",
            "ねむる",
            "ミルクのみ",
            "タマゴうみ",
            "あさのひざし",
            "こうごうせい",
            "つきのひかり"
        ]);

        if (
            recoveryMoves.has(name)
        ) {
            score +=
                (1 - hpRate(attacker))
                * 1200;
        }

        /* 状態異常 */

        if (
            name === "でんじは" &&
            !defender.status
        ) {
            score += 500;
        }

        if (
            (
                name === "おにび" ||
                name === "どくどく"
            ) &&
            !defender.status
        ) {
            score += 450;
        }

        /* 積み技 */

        const setup = {
            "つるぎのまい": 700,
            "わるだくみ": 700,
            "りゅうのまい": 850,
            "めいそう": 650,
            "こうそくいどう": 500,
            "てっぺき": 450,
            "ドわすれ": 450
        };

        if (setup[name]) {

            score +=
                setup[name] *
                (
                    1 -
                    hpRate(defender)
                );

            score +=
                hpRate(attacker) *
                250;
        }

        /* 優先度 */

        score +=
            priority(move) * 180;

        return score;
    }

    /* =========================================================
       公開
       ========================================================= */

    window.AI_V11_ENGINE = {

        version: VERSION,

        num,
        clamp,
        clone,

        getTeam,
        getActive,
        getActiveIndex,
        getDifficulty,

        alive,
        aliveCount,

        hp,
        maxHp,
        hpRate,

        types,
        pp,
        usableMoves,

        stageMultiplier,
        statValue,

        priority,

        damage,
        basicMoveScore
    };

    console.log(
        "[AI V11 100] PART 1 LOADED"
    );

})();
/* ============================================================
   ULTIMATE AI V11 FINAL
   PART 2
   VIRTUAL BATTLE STATE / EVALUATION
   ============================================================ */

(function () {
    "use strict";

    if (!window.AI_V11_ENGINE) {
        console.error("[AI V11 100] PART 1 NOT FOUND");
        return;
    }

    if (window.__AI_V11_SEARCH_100__) return;
    window.__AI_V11_SEARCH_100__ = true;

    const E = window.AI_V11_ENGINE;

    const VERSION = "11.0.100";

    /* ---------------------------------------------------------
       設定
       --------------------------------------------------------- */

    const CONFIG = {
        normalDepth: 2,
        hardDepth: 3,

        maxRootMoves: 6,
        maxResponseMoves: 5,
        maxSwitches: 4,

        koBonus: 100000,
        hpWeight: 1600,
        teamWeight: 5000,
        damageWeight: 3,

        switchBase: 250
    };


    /* ---------------------------------------------------------
       安全なコピー
       --------------------------------------------------------- */

    function clonePokemon(pokemon) {
        return E.clone(pokemon);
    }

    function cloneTeam(team) {
        if (!Array.isArray(team)) return [];

        return team.map(function (pokemon) {
            return clonePokemon(pokemon);
        });
    }


    /* ---------------------------------------------------------
       仮想状態
       --------------------------------------------------------- */

    function createState() {

        const playerTeam = cloneTeam(E.getTeam("player"));
        const opponentTeam = cloneTeam(E.getTeam("opponent"));

        return {
            player: {
                team: playerTeam,
                active: E.getActiveIndex("player")
            },

            opponent: {
                team: opponentTeam,
                active: E.getActiveIndex("opponent")
            },

            turn: 0
        };
    }


    function side(state, name) {
        return state[name];
    }


    function getActive(state, name) {

        const s = side(state, name);

        if (!s || !Array.isArray(s.team)) {
            return null;
        }

        return s.team[s.active] || null;
    }


    function isAlive(pokemon) {
        return E.alive(pokemon);
    }


    function aliveCount(state, name) {

        const s = side(state, name);

        if (!s || !Array.isArray(s.team)) {
            return 0;
        }

        return s.team.filter(isAlive).length;
    }


    /* ---------------------------------------------------------
       状態評価
       COM側から見た評価
       --------------------------------------------------------- */

    function pokemonValue(pokemon) {

        if (!pokemon) return 0;

        if (!isAlive(pokemon)) {
            return -50000;
        }

        const hpRate = E.hpRate(pokemon);

        let value = 0;

        value += hpRate * CONFIG.hpWeight;

        value += 1200;

        if (pokemon.status) {
            value -= 500;
        }

        return value;
    }


    function teamValue(state, name) {

        const s = side(state, name);

        if (!s || !Array.isArray(s.team)) {
            return 0;
        }

        let value = 0;

        for (const pokemon of s.team) {
            value += pokemonValue(pokemon);
        }

        value += aliveCount(state, name) * CONFIG.teamWeight;

        return value;
    }


    function evaluateState(state) {

        const comValue =
            teamValue(state, "opponent");

        const playerValue =
            teamValue(state, "player");

        const comActive =
            getActive(state, "opponent");

        const playerActive =
            getActive(state, "player");

        let score =
            comValue -
            playerValue;


        /* 現在対面 */

        if (comActive && playerActive) {

            for (const move of E.usableMoves(comActive)) {

                const d =
                    E.damage(
                        move,
                        comActive,
                        playerActive
                    );

                score += d * 0.4;
            }

            for (const move of E.usableMoves(playerActive)) {

                const d =
                    E.damage(
                        move,
                        playerActive,
                        comActive
                    );

                score -= d * 0.3;
            }
        }


        /* 勝敗 */

        if (aliveCount(state, "player") === 0) {
            score += CONFIG.koBonus;
        }

        if (aliveCount(state, "opponent") === 0) {
            score -= CONFIG.koBonus;
        }

        return score;
    }


    /* ---------------------------------------------------------
       行動適用
       --------------------------------------------------------- */

    function applyMove(state, actorName, move) {

        const next = E.clone(state);

        const actor =
            getActive(next, actorName);

        const defenderName =
            actorName === "opponent"
                ? "player"
                : "opponent";

        const defender =
            getActive(next, defenderName);

        if (!actor || !defender || !move) {
            return next;
        }

        const damage =
            E.damage(
                move,
                actor,
                defender
            );

        if (damage > 0) {

            const current =
                E.hp(defender);

            defender.currentHp =
                Math.max(
                    0,
                    current - damage
                );

            /* ゲーム内で currentHP を使う場合にも対応 */

            if (
                Object.prototype.hasOwnProperty.call(
                    defender,
                    "currentHP"
                )
            ) {
                defender.currentHP =
                    defender.currentHp;
            }
        }

        return next;
    }


    /* ---------------------------------------------------------
       仮想交代
       --------------------------------------------------------- */

    function applySwitch(state, actorName, index) {

        const next = E.clone(state);

        const s =
            side(next, actorName);

        if (
            !s ||
            !Array.isArray(s.team) ||
            !s.team[index]
        ) {
            return next;
        }

        if (!isAlive(s.team[index])) {
            return next;
        }

        s.active = index;

        return next;
    }


    /* ---------------------------------------------------------
       交代候補
       --------------------------------------------------------- */

    function switchCandidates(state, actorName) {

        const s =
            side(state, actorName);

        if (!s || !Array.isArray(s.team)) {
            return [];
        }

        const current =
            s.active;

        const result = [];

        for (let i = 0; i < s.team.length; i++) {

            if (i === current) continue;

            const pokemon = s.team[i];

            if (!isAlive(pokemon)) continue;

            result.push(i);
        }

        return result
            .slice(0, CONFIG.maxSwitches);
    }


    /* ---------------------------------------------------------
       技候補
       --------------------------------------------------------- */

    function moveCandidates(state, actorName) {

        const actor =
            getActive(state, actorName);

        const defender =
            getActive(
                state,
                actorName === "opponent"
                    ? "player"
                    : "opponent"
            );

        if (!actor || !defender) {
            return [];
        }

        const moves =
            E.usableMoves(actor);

        return moves
            .map(function (move) {

                return {
                    move: move,

                    score:
                        E.basicMoveScore(
                            move,
                            actor,
                            defender
                        )
                };

            })
            .sort(function (a, b) {
                return b.score - a.score;
            })
            .slice(
                0,
                CONFIG.maxRootMoves
            )
            .map(function (x) {
                return x.move;
            });
    }


    /* ---------------------------------------------------------
       行動一覧
       --------------------------------------------------------- */

    function getActions(state, actorName) {

        const actions = [];

        const moves =
            moveCandidates(
                state,
                actorName
            );

        for (const move of moves) {

            actions.push({
                type: "move",
                move: move
            });
        }


        const switches =
            switchCandidates(
                state,
                actorName
            );

        for (const index of switches) {

            actions.push({
                type: "switch",
                index: index
            });
        }

        return actions;
    }


    /* ---------------------------------------------------------
       行動を仮想状態へ適用
       --------------------------------------------------------- */

    function applyAction(
        state,
        actorName,
        action
    ) {

        if (!action) {
            return E.clone(state);
        }

        if (action.type === "switch") {

            return applySwitch(
                state,
                actorName,
                action.index
            );
        }

        if (action.type === "move") {

            return applyMove(
                state,
                actorName,
                action.move
            );
        }

        return E.clone(state);
    }


    /* ---------------------------------------------------------
       COMが選択する最善手
       --------------------------------------------------------- */

    function bestImmediateMove(state) {

        const actor =
            getActive(
                state,
                "opponent"
            );

        const defender =
            getActive(
                state,
                "player"
            );

        if (!actor || !defender) {
            return null;
        }

        const moves =
            E.usableMoves(actor);

        let best = null;
        let bestScore = -Infinity;

        for (const move of moves) {

            const score =
                E.basicMoveScore(
                    move,
                    actor,
                    defender
                );

            if (score > bestScore) {

                bestScore = score;
                best = move;
            }
        }

        return best;
    }


    /* ---------------------------------------------------------
       ミニマックス
       COM = 最大化
       Player = 最小化
       --------------------------------------------------------- */

    function search(
        state,
        depth,
        maximizing,
        alpha,
        beta
    ) {

        if (depth <= 0) {
            return evaluateState(state);
        }

        if (
            aliveCount(state, "player") === 0 ||
            aliveCount(state, "opponent") === 0
        ) {
            return evaluateState(state);
        }


        const actorName =
            maximizing
                ? "opponent"
                : "player";


        let actions =
            getActions(
                state,
                actorName
            );


        if (!actions.length) {
            return evaluateState(state);
        }


        /*
         * 即時評価の高い順に並べる。
         * これによって alpha-beta pruning の効率を上げる。
         */

        actions.sort(function (a, b) {

            function actionScore(action) {

                if (action.type === "move") {

                    const actor =
                        getActive(
                            state,
                            actorName
                        );

                    const defender =
                        getActive(
                            state,
                            actorName === "opponent"
                                ? "player"
                                : "opponent"
                        );

                    return E.basicMoveScore(
                        action.move,
                        actor,
                        defender
                    );
                }

                return CONFIG.switchBase;
            }

            return (
                actionScore(b) -
                actionScore(a)
            );
        });


        if (maximizing) {

            let value = -Infinity;

            for (const action of actions) {

                const next =
                    applyAction(
                        state,
                        actorName,
                        action
                    );

                const score =
                    search(
                        next,
                        depth - 1,
                        false,
                        alpha,
                        beta
                    );

                value =
                    Math.max(
                        value,
                        score
                    );

                alpha =
                    Math.max(
                        alpha,
                        value
                    );

                if (beta <= alpha) {
                    break;
                }
            }

            return value;

        } else {

            let value = Infinity;

            for (const action of actions) {

                const next =
                    applyAction(
                        state,
                        actorName,
                        action
                    );

                const score =
                    search(
                        next,
                        depth - 1,
                        true,
                        alpha,
                        beta
                    );

                value =
                    Math.min(
                        value,
                        score
                    );

                beta =
                    Math.min(
                        beta,
                        value
                    );

                if (beta <= alpha) {
                    break;
                }
            }

            return value;
        }
    }


    /* ---------------------------------------------------------
       COMの最善行動
       --------------------------------------------------------- */

    function chooseAction(state, difficulty) {

        const depth =
            difficulty === "hard"
                ? CONFIG.hardDepth
                : CONFIG.normalDepth;


        const actions =
            getActions(
                state,
                "opponent"
            );


        if (!actions.length) {
            return null;
        }


        let bestAction = null;
        let bestScore = -Infinity;

        let alpha = -Infinity;
        const beta = Infinity;


        for (const action of actions) {

            const next =
                applyAction(
                    state,
                    "opponent",
                    action
                );

            const score =
                search(
                    next,
                    depth - 1,
                    false,
                    alpha,
                    beta
                );


            if (
                bestAction === null ||
                score > bestScore
            ) {

                bestScore = score;
                bestAction = action;
            }


            alpha =
                Math.max(
                    alpha,
                    bestScore
                );
        }


        return {
            action: bestAction,
            score: bestScore
        };
    }


    /* ---------------------------------------------------------
       外部公開
       --------------------------------------------------------- */

    window.AI_V11_SEARCH = {

        version: VERSION,

        CONFIG: CONFIG,

        createState: createState,

        evaluateState: evaluateState,

        moveCandidates: moveCandidates,

        switchCandidates: switchCandidates,

        getActions: getActions,

        applyAction: applyAction,

        search: search,

        chooseAction: chooseAction,

        bestImmediateMove: bestImmediateMove,

        getActive: getActive,

        aliveCount: aliveCount
    };


    console.log(
        "[AI V11 100] PART 2 LOADED / MINIMAX READY"
    );

})();
/* ============================================================
   ULTIMATE AI V11 FINAL
   PART 3
   MOVE SELECTION / SEARCH RESULT / PREDICTION
   ============================================================ */

(function () {
    "use strict";

    if (!window.AI_V11_ENGINE) {
        console.error("[AI V11 100] PART 1 NOT FOUND");
        return;
    }

    if (!window.AI_V11_SEARCH) {
        console.error("[AI V11 100] PART 2 NOT FOUND");
        return;
    }

    if (window.__AI_V11_DECISION_100__) return;
    window.__AI_V11_DECISION_100__ = true;

    const E = window.AI_V11_ENGINE;
    const S = window.AI_V11_SEARCH;

    const VERSION = "11.0.100";


    /* =========================================================
       基本ユーティリティ
       ========================================================= */

    function getOpponent() {
        return S.getActive(
            S.createState(),
            "opponent"
        );
    }

    function getPlayer() {
        return S.getActive(
            S.createState(),
            "player"
        );
    }


    function moveName(move) {
        return move && move.name
            ? String(move.name)
            : "";
    }


    function isDamagingMove(move) {
        return (
            move &&
            Number(move.power || 0) > 0
        );
    }


    /* =========================================================
       技の詳細評価
       ========================================================= */

    function analyzeMove(
        state,
        move
    ) {

        const attacker =
            S.getActive(
                state,
                "opponent"
            );

        const defender =
            S.getActive(
                state,
                "player"
            );

        if (!attacker || !defender || !move) {
            return {
                score: -Infinity,
                damage: 0,
                ko: false,
                move: move
            };
        }


        const damage =
            E.damage(
                move,
                attacker,
                defender
            );


        let score =
            E.basicMoveScore(
                move,
                attacker,
                defender
            );


        /* -----------------------------------------------------
           KO最優先
           ----------------------------------------------------- */

        const ko =
            damage >= E.hp(defender);


        if (ko) {
            score += 100000;
        }


        /* -----------------------------------------------------
           相手の残りHP
           ----------------------------------------------------- */

        if (E.hp(defender) > 0) {

            score +=
                (
                    damage /
                    E.hp(defender)
                ) * 2000;
        }


        /* -----------------------------------------------------
           自分が倒されそうな場合
           ----------------------------------------------------- */

        let enemyBestDamage = 0;

        for (
            const enemyMove
            of E.usableMoves(defender)
        ) {

            enemyBestDamage =
                Math.max(
                    enemyBestDamage,
                    E.damage(
                        enemyMove,
                        defender,
                        attacker
                    )
                );
        }


        if (
            enemyBestDamage >=
            E.hp(attacker)
        ) {

            /*
             * 自分が次ターン確実に倒されるなら、
             * 相手を大きく削る手を優先。
             */

            score +=
                damage * 1.5;
        }


        /* -----------------------------------------------------
           先制技
           ----------------------------------------------------- */

        if (
            E.priority(move) > 0
        ) {

            score += 300;

            if (
                enemyBestDamage >=
                E.hp(attacker)
            ) {
                score += 1200;
            }
        }


        /* -----------------------------------------------------
           状態異常
           ----------------------------------------------------- */

        const name =
            moveName(move);


        if (
            name === "でんじは" &&
            !defender.status
        ) {

            score +=
                700;

            if (
                E.statValue(
                    defender,
                    "speed"
                ) >
                E.statValue(
                    attacker,
                    "speed"
                )
            ) {
                score += 300;
            }
        }


        if (
            name === "おにび" &&
            !defender.status
        ) {

            score += 600;
        }


        if (
            (
                name === "どくどく" ||
                name === "どくのこな"
            ) &&
            !defender.status
        ) {

            score += 500;
        }


        /* -----------------------------------------------------
           回復
           ----------------------------------------------------- */

        const recoveryMoves = new Set([
            "じこさいせい",
            "はねやすめ",
            "なまける",
            "ねむる",
            "ミルクのみ",
            "タマゴうみ",
            "あさのひざし",
            "こうごうせい",
            "つきのひかり"
        ]);


        if (
            recoveryMoves.has(name)
        ) {

            score +=
                (
                    1 -
                    E.hpRate(attacker)
                ) * 2500;
        }


        return {
            score: score,
            damage: damage,
            ko: ko,
            enemyBestDamage: enemyBestDamage,
            move: move
        };
    }


    /* =========================================================
       ルート行動の探索
       ========================================================= */

    function evaluateRootMove(
        state,
        move,
        depth
    ) {

        const next =
            S.applyAction(
                state,
                "opponent",
                {
                    type: "move",
                    move: move
                }
            );


        const immediate =
            analyzeMove(
                state,
                move
            );


        let future =
            S.search(
                next,
                Math.max(
                    0,
                    depth - 1
                ),
                false,
                -Infinity,
                Infinity
            );


        /*
         * 即時評価 + 将来評価
         */

        let score =
            immediate.score +
            future;


        /*
         * KOは絶対優先
         */

        if (immediate.ko) {
            score += 100000;
        }


        return {
            move: move,
            score: score,
            immediate: immediate,
            future: future
        };
    }


    /* =========================================================
       COM最善技選択
       ========================================================= */

    function chooseMove(
        difficulty
    ) {

        const state =
            S.createState();


        const attacker =
            S.getActive(
                state,
                "opponent"
            );

        const defender =
            S.getActive(
                state,
                "player"
            );


        if (
            !attacker ||
            !defender
        ) {

            return null;
        }


        const moves =
            E.usableMoves(
                attacker
            );


        if (!moves.length) {
            return null;
        }


        let depth =
            difficulty === "hard"
                ? S.CONFIG.hardDepth
                : S.CONFIG.normalDepth;


        /*
         * 全技を評価
         */

        const results =
            moves.map(
                function (move) {

                    return evaluateRootMove(
                        state,
                        move,
                        depth
                    );

                }
            );


        /*
         * スコア順
         */

        results.sort(
            function (a, b) {
                return b.score - a.score;
            }
        );


        /*
         * 同点時はランダム性を少しだけ入れる。
         *
         * 完全ランダムではない。
         * ほぼ同評価の技だけから選ぶ。
         */

        const bestScore =
            results[0].score;


        const nearBest =
            results.filter(
                function (result) {

                    return (
                        result.score >=
                        bestScore - 80
                    );

                }
            );


        let selected =
            results[0];


        if (
            nearBest.length > 1
        ) {

            selected =
                nearBest[
                    Math.floor(
                        Math.random() *
                        nearBest.length
                    )
                ];
        }


        console.log(
            "[AI V11 100] MOVE",
            selected.move.name,
            "score=",
            selected.score
        );


        return selected.move;
    }


    /* =========================================================
       交代評価
       ========================================================= */

    function analyzeSwitch(
        state,
        index
    ) {

        const team =
            state.opponent.team;

        const candidate =
            team[index];

        const enemy =
            S.getActive(
                state,
                "player"
            );


        if (
            !candidate ||
            !E.alive(candidate) ||
            !enemy
        ) {

            return {
                index: index,
                score: -Infinity
            };
        }


        let score = 0;


        /* -----------------------------------------------------
           HP
           ----------------------------------------------------- */

        score +=
            E.hpRate(candidate) *
            1500;


        /* -----------------------------------------------------
           相手から受ける最大ダメージ
           ----------------------------------------------------- */

        let incoming = 0;

        for (
            const move
            of E.usableMoves(enemy)
        ) {

            incoming =
                Math.max(
                    incoming,
                    E.damage(
                        move,
                        enemy,
                        candidate
                    )
                );
        }


        score -=
            incoming * 4;


        /* -----------------------------------------------------
           候補から相手への最大ダメージ
           ----------------------------------------------------- */

        let outgoing = 0;

        for (
            const move
            of E.usableMoves(candidate)
        ) {

            outgoing =
                Math.max(
                    outgoing,
                    E.damage(
                        move,
                        candidate,
                        enemy
                    )
                );
        }


        score +=
            outgoing * 3;


        /* -----------------------------------------------------
           交代先から一撃KOできるなら大幅加点
           ----------------------------------------------------- */

        if (
            outgoing >= E.hp(enemy)
        ) {

            score += 50000;
        }


        /* -----------------------------------------------------
           タイプ相性
           ----------------------------------------------------- */

        if (incoming === 0) {

            score += 2500;
        }


        /* -----------------------------------------------------
           現在のポケモンが危険なら交代価値UP
           ----------------------------------------------------- */

        const current =
            S.getActive(
                state,
                "opponent"
            );


        if (current) {

            const currentHp =
                E.hpRate(current);


            if (currentHp < 0.3) {
                score += 1000;
            }

            if (currentHp < 0.15) {
                score += 1800;
            }
        }


        return {
            index: index,
            score: score,
            incoming: incoming,
            outgoing: outgoing,
            pokemon: candidate
        };
    }


    /* =========================================================
       最善交代先
       ========================================================= */

    function chooseSwitch() {

        const state =
            S.createState();


        const candidates =
            S.switchCandidates(
                state,
                "opponent"
            );


        if (!candidates.length) {
            return null;
        }


        const results =
            candidates.map(
                function (index) {

                    return analyzeSwitch(
                        state,
                        index
                    );

                }
            );


        results.sort(
            function (a, b) {
                return b.score - a.score;
            }
        );


        const best =
            results[0];


        if (!best) {
            return null;
        }


        console.log(
            "[AI V11 100] SWITCH",
            best.pokemon
                ? best.pokemon.name
                : best.index,
            "score=",
            best.score
        );


        return best.index;
    }


    /* =========================================================
       「今のまま戦う」vs「交代」を比較
       ========================================================= */

    function shouldSwitch() {

        const state =
            S.createState();


        const current =
            S.getActive(
                state,
                "opponent"
            );

        const enemy =
            S.getActive(
                state,
                "player"
            );


        if (!current || !enemy) {
            return false;
        }


        const switches =
            S.switchCandidates(
                state,
                "opponent"
            );


        if (!switches.length) {
            return false;
        }


        /*
         * 現在のHP
         */

        const currentHp =
            E.hp(current);


        /*
         * 相手の最大打点
         */

        let incoming = 0;

        for (
            const move
            of E.usableMoves(enemy)
        ) {

            incoming =
                Math.max(
                    incoming,
                    E.damage(
                        move,
                        enemy,
                        current
                    )
                );
        }


        /*
         * 今のまま戦った場合の最大打点
         */

        let outgoing = 0;

        for (
            const move
            of E.usableMoves(current)
        ) {

            outgoing =
                Math.max(
                    outgoing,
                    E.damage(
                        move,
                        current,
                        enemy
                    )
                );
        }


        /*
         * 一撃で倒されるなら交代を強く検討
         */

        if (
            incoming >= currentHp &&
            outgoing < E.hp(enemy)
        ) {

            return true;
        }


        /*
         * HP35%以下 + 大ダメージを受ける場合
         */

        if (
            E.hpRate(current) <= 0.35 &&
            incoming >=
                currentHp * 0.45
        ) {

            return true;
        }


        /*
         * 交代後の評価
         */

        let bestSwitch =
            -Infinity;


        for (
            const index
            of switches
        ) {

            const result =
                analyzeSwitch(
                    state,
                    index
                );

            bestSwitch =
                Math.max(
                    bestSwitch,
                    result.score
                );
        }


        /*
         * 現在ポケモンの戦闘価値
         */

        let currentScore =
            outgoing * 3;


        currentScore +=
            E.hpRate(current) *
            1200;


        /*
         * 交代先が明確に有利なら交代
         */

        if (
            bestSwitch >
            currentScore + 900
        ) {

            return true;
        }


        return false;
    }


    /* =========================================================
       公開
       ========================================================= */

    window.AI_V11_DECISION = {

        version: VERSION,

        chooseMove:
            chooseMove,

        chooseSwitch:
            chooseSwitch,

        shouldSwitch:
            shouldSwitch,

        analyzeMove:
            analyzeMove,

        analyzeSwitch:
            analyzeSwitch,

        evaluateRootMove:
            evaluateRootMove
    };


    console.log(
        "[AI V11 100] PART 3 LOADED / DECISION AI READY"
    );

})();
/* ============================================================
   ULTIMATE AI V11 FINAL
   PART 4
   GAME INTEGRATION / FINAL CONNECTION
   ============================================================ */

(function () {
    "use strict";

    if (window.__AI_V11_INTEGRATION_100__) return;
    window.__AI_V11_INTEGRATION_100__ = true;

    const E = window.AI_V11_ENGINE;
    const D = window.AI_V11_DECISION;

    if (!E || !D) {
        console.error(
            "[AI V11 100] ENGINE / DECISION NOT FOUND"
        );
        return;
    }


    /* =========================================================
       難易度取得
       ========================================================= */

    function getDifficultySafe() {

        try {
            if (
                typeof difficulty !== "undefined" &&
                difficulty
            ) {
                return difficulty;
            }
        } catch (e) {}

        return window.difficulty || "normal";
    }


    /* =========================================================
       旧AIを安全に退避
       ========================================================= */

    const oldGetOpponentMove =
        typeof window.getOpponentMove === "function"
            ? window.getOpponentMove
            : null;


    const oldShouldOpponentSwitch =
        typeof window.shouldOpponentSwitch === "function"
            ? window.shouldOpponentSwitch
            : null;


    const oldChooseBestOpponentSwitch =
        typeof window.chooseBestOpponentSwitch === "function"
            ? window.chooseBestOpponentSwitch
            : null;


    /* =========================================================
       V11 技選択
       ========================================================= */

    function v11GetOpponentMove() {

        const diff =
            getDifficultySafe();


        /*
         * Easyは従来AIのまま。
         *
         * V11はNormal / Hardに使用。
         */

        if (
            diff === "easy" ||
            diff === "かんたん"
        ) {

            if (oldGetOpponentMove) {

                try {
                    const oldMove =
                        oldGetOpponentMove();

                    if (oldMove) {
                        return oldMove;
                    }
                } catch (e) {

                    console.warn(
                        "[AI V11 100] OLD AI ERROR",
                        e
                    );
                }
            }
        }


        /* -----------------------------------------------------
           V11
           ----------------------------------------------------- */

        try {

            const selected =
                D.chooseMove(
                    diff
                );


            if (selected) {

                console.log(
                    "[AI V11 100] SELECTED:",
                    selected.name
                );

                return selected;
            }

        } catch (e) {

            console.error(
                "[AI V11 100] MOVE ERROR",
                e
            );
        }


        /* -----------------------------------------------------
           最終フォールバック
           ----------------------------------------------------- */

        if (oldGetOpponentMove) {

            try {

                const fallback =
                    oldGetOpponentMove();

                if (fallback) {
                    return fallback;
                }

            } catch (e) {}
        }


        /*
         * 旧AIも失敗した場合、
         * 現在のポケモンの使用可能技から選択。
         */

        try {

            const state =
                E.getTeam("opponent");

            const activeIndex =
                E.getActiveIndex(
                    "opponent"
                );

            const pokemon =
                state[activeIndex];


            if (
                pokemon &&
                Array.isArray(pokemon.moves)
            ) {

                const usable =
                    pokemon.moves.filter(
                        function (move) {

                            return (
                                move &&
                                (
                                    move.pp === undefined ||
                                    Number(move.pp) > 0
                                )
                            );

                        }
                    );


                if (usable.length) {

                    return usable[
                        Math.floor(
                            Math.random() *
                            usable.length
                        )
                    ];
                }
            }

        } catch (e) {

            console.error(
                "[AI V11 100] FALLBACK ERROR",
                e
            );
        }


        return null;
    }


    /* =========================================================
       V11 交代判断
       ========================================================= */

    function v11ShouldOpponentSwitch() {

        const diff =
            getDifficultySafe();


        /*
         * Easyは従来AI。
         */

        if (
            diff === "easy" ||
            diff === "かんたん"
        ) {

            if (oldShouldOpponentSwitch) {

                try {
                    return !!oldShouldOpponentSwitch();
                } catch (e) {}
            }

            return false;
        }


        try {

            return !!D.shouldSwitch();

        } catch (e) {

            console.error(
                "[AI V11 100] SWITCH CHECK ERROR",
                e
            );

            if (oldShouldOpponentSwitch) {

                try {
                    return !!oldShouldOpponentSwitch();
                } catch (e2) {}
            }

            return false;
        }
    }


    /* =========================================================
       V11 最善交代先
       ========================================================= */

    function v11ChooseBestOpponentSwitch() {

        const diff =
            getDifficultySafe();


        if (
            diff === "easy" ||
            diff === "かんたん"
        ) {

            if (
                oldChooseBestOpponentSwitch
            ) {

                try {
                    return oldChooseBestOpponentSwitch();
                } catch (e) {}
            }

            return null;
        }


        try {

            const index =
                D.chooseSwitch();


            if (
                index !== null &&
                index !== undefined
            ) {

                console.log(
                    "[AI V11 100] SWITCH TO INDEX:",
                    index
                );

                return index;
            }

        } catch (e) {

            console.error(
                "[AI V11 100] SWITCH ERROR",
                e
            );
        }


        /*
         * 旧AIへフォールバック
         */

        if (
            oldChooseBestOpponentSwitch
        ) {

            try {
                return oldChooseBestOpponentSwitch();
            } catch (e) {}
        }


        return null;
    }


    /* =========================================================
       本体へ接続
       ========================================================= */

    window.getOpponentMove =
        v11GetOpponentMove;

    window.shouldOpponentSwitch =
        v11ShouldOpponentSwitch;

    window.chooseBestOpponentSwitch =
        v11ChooseBestOpponentSwitch;


    /* =========================================================
       デバッグ用
       ========================================================= */

    window.AI_V11 = {

        version: "11.0.100",

        engine:
            E,

        decision:
            D,

        getOpponentMove:
            v11GetOpponentMove,

        shouldSwitch:
            v11ShouldOpponentSwitch,

        chooseSwitch:
            v11ChooseBestOpponentSwitch,

        test: function () {

            try {

                const state =
                    E.getTeam("opponent");

                console.log(
                    "[AI V11 100] OPPONENT TEAM",
                    state
                );

                console.log(
                    "[AI V11 100] ACTIVE",
                    E.getActive(
                        "opponent"
                    )
                );

                console.log(
                    "[AI V11 100] MOVE",
                    v11GetOpponentMove()
                );

                console.log(
                    "[AI V11 100] SHOULD SWITCH",
                    v11ShouldOpponentSwitch()
                );

            } catch (e) {

                console.error(
                    "[AI V11 100] TEST ERROR",
                    e
                );
            }
        }
    };


    console.log(
        "=========================================="
    );

    console.log(
        "[AI V11 100] PART 4 LOADED"
    );

    console.log(
        "[AI V11 100] GAME INTEGRATION COMPLETE"
    );

    console.log(
        "[AI V11 100] VERSION 11.0.100"
    );

    console.log(
        "=========================================="
    );

})();
