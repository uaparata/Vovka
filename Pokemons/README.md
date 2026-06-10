# Pokemons

Папка для референсов и превью персонажей-«покемонов» (Funko Pop).

## Проекты

| Папка | Персонаж | Raw poses | Скрипт сборки | В игре |
|-------|----------|-----------|---------------|--------|
| `kirill-mulin-funko/` | Mullin | `assets/pokemon/kirill-sheet-raw.png` | `process-kirill-sprites.py` | `kirill-*.png` |
| `bitcoin-bts-funko/` | BITCOIN | `bitcoin-poses-raw.png` | `process-bitcoin-sprites.py` | `bitcoin-*.png` |
| `nikita-funko/` | Nikita | `nikita-poses-raw.png` | `process-nikita-sprites.py` | `nikita-*.png` |

Открой `kirill-mulin-funko/index.html` в браузере, чтобы крутить 3D-модель Mullin.

## Быстрый цикл для нового персонажа

1. Положи **горизонтальный pose sheet** (6–7 Funko-поз) в `Pokemons/<name>-funko/`.
2. `python scripts/process-<name>-sprites.py`
3. Добавь в `POKEMONS` (`game.js` + `game-logic.js`).
4. CSS-обёртка для bounce/punch — см. [docs/INSTRUCTIONS.md](../docs/INSTRUCTIONS.md).

Полная инструкция: [docs/INSTRUCTIONS.md](../docs/INSTRUCTIONS.md)  
Известные баги UI: [docs/BUGS.md](../docs/BUGS.md)
