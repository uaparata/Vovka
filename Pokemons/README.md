# Pokemons

Папка для референсов и превью персонажей-«покемонов» (Funko Pop).

## Проекты

| Папка | Персонаж | Источник | Скрипт | В игре |
|-------|----------|----------|--------|--------|
| `kirill-mulin-funko/` | Mullin | `kirill-mulin-funko-preview.png` | `process-kirill-sprites.py` | `kirill-*.png` |
| `bitcoin-bts-funko/` | BITCOIN | `bitcoin-funko-idle-raw.png` + poses | `process-bitcoin-sprites.py` | `bitcoin-*.png` |
| `nikita-funko/` | Nikita | `nikita-poses-raw.png` | `process-nikita-sprites.py` | `nikita-*.png` |
| `sasha-funko/` | Renato (UI, девушка) | `sasha-poses-raw.png` | `recolor-sasha-hair.py` + `process-sasha-sprites.py` | `sasha-*.png` |
| `renato-funko/` | Sanya (UI, борода) | `renato-poses-raw.png` | `process-renato-sprites.py` | `renato-*.png` |
| `jackon-funko/` | Jackon | photo + idle + poses | `process-jackon-sprites.py` | `jackon-*.png` |
| `zhekon-funko/` | Zhekon | `zhekon-photo-ref.png` + idle + poses | `process-zhekon-sprites.py` | `zhekon-*.png` |

Общая нормализация размера: `scripts/pokemon_sprite_common.py` (`CHAR_HEIGHT=660`, общая линия ног).

Полная инструкция: [docs/INSTRUCTIONS.md](../docs/INSTRUCTIONS.md)  
Все баги UI: [docs/BUGS.md](../docs/BUGS.md)
