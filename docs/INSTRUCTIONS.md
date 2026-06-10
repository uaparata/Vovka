# Инструкции для разработки

## Локальный запуск

1. `npm install`
2. Скопировать `.env.example` → `.env`
3. Заполнить Google OAuth (см. корневой `README.md`)
4. `npm start` → http://localhost:3000

Без `DATABASE_URL` данные пишутся в `data/store.json`.

## Деплой (Railway)

- PostgreSQL обязателен в проде
- Variables: `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET`, `SESSION_SECRET`, `BASE_URL`, `NODE_ENV=production`
- `DATABASE_URL` подставляется из Postgres
- `ASSET_VERSION` на проде = git commit / deployment id → HTML и спрайты обновляются у всех клиентов

---

## Как добавить нового Pokemon (полный пайплайн)

**Порядок строгий — не пропускать шаги:**

```
Фото человека
    ↓
Funko Pop (одна поза, idle)
    ↓
Pose sheet (7 кадров анимации в один ряд)
    ↓
scripts/process-<имя>-sprites.py  →  assets/pokemon/<id>-idle.png + <id>-sheet.png
    ↓
POKEMONS в game.js + game-logic.js  →  CSS  →  механика удара
```

Процедурный PIL (`generate-*-sprites.py`) — только черновик, **не** финал для релиза.

### Шаг 0 — Фото человека

1. Положи исходное фото в `Pokemons/<имя>-funko/<имя>-photo-ref.png`.
2. Фото должно быть чётким: лицо, причёска, одежда, пропорции — по ним делается Funko.
3. Для перекраски волос (как у Renato) — отдельный скрипт `recolor-*-hair.py` **до** сборки sheet.

---

### Шаг 1 — Funko Pop из фото (одна поза)

Цель: **3D Funko Pop** в стиле Mullin/BITCOIN, не плоская графика.

1. По фото сгенерируй **одну** полную фигурку:
   - Большая голова, чёрные круглые глаза, маленькое тело.
   - Чёрная круглая подставка Funko.
   - Белый или нейтральный фон.
   - Одежда и причёска как у человека на фото.
2. Сохрани как `Pokemons/<имя>-funko/<имя>-funko-idle-raw.png`.

**Эталоны:** `Pokemons/jackon-funko/jackon-funko-idle-raw.png`, `assets/pokemon/bitcoin-funko-idle-raw.png`.

**Инструменты:** AI image gen с reference на фото, или ручная 3D/рисунок.  
**Не использовать для финала:** `scripts/generate-*-sprites.py`.

---

### Шаг 2 — Pose sheet: 7 (или 6) кадров анимации

1. На основе **того же персонажа** из шага 1 сделай **горизонтальный ряд** из N равных панелей.
2. Каждая панель — полное тело + подставка, **одинаковый масштаб** персонажа.
3. Позы = одно действие от idle до финала (пример Jackon: очки → на лицо → пульт → дрон).
4. Сохрани как `Pokemons/<имя>-funko/<имя>-poses-raw.png`.

| Параметр | Значение |
|----------|----------|
| Кадров | 6 или 7 |
| Ряд | горизонтальный, панели **равной ширины** |
| Фон | белый / однотонный |
| Кадр после сборки | 320 × 900 px |

**Эталон:** `Pokemons/jackon-funko/jackon-poses-raw.png` (7 кадров FPV + дрон).

**BITCOIN — исключение:** pose sheet `1024×411` с **неровными** позами → в `process-bitcoin-sprites.py` заданы ручные `BITCOIN_POSE_BOUNDS`, не деление `width / 6`.

---

### Шаг 3 — Сборка спрайтов (Python)

```bash
pip install Pillow
python scripts/process-<имя>-sprites.py
```

Скрипт должен использовать `scripts/pokemon_sprite_common.py`:

| Константа | Значение | Назначение |
|-----------|----------|------------|
| `FRAME_W × FRAME_H` | 320 × 900 | один кадр |
| `CHAR_HEIGHT` | 660 | одинаковая высота всех Pokemon (заполняют слот) |
| `FEET_PAD` | 6 | общая линия ног |
| `MAX_WIDTH_RATIO` | 1.0 | не обрезать широкие позы (меч BITCOIN) |
| `strip_white_bottom()` | — | убрать белую полоску снизу |

Выход:
- `assets/pokemon/<id>-idle.png` — кадр 0 (или отдельный idle raw)
- `assets/pokemon/<id>-sheet.png` — полоса `320×N`

Примеры скриптов:
- `process-jackon-sprites.py` — 7 кадров, idle из `jackon-funko-idle-raw.png`
- `process-bitcoin-sprites.py` — 6 кадров, ручные bounds
- `process-sasha-sprites.py` — 7 кадров, equal split

**Не использовать:** `fix_center_seam()` на финале; `strip-sprite-bottom.py` без бэкапа.

---

### Шаг 4 — Интеграция в игру

1. **`POKEMONS`** — добавить объект в **оба** файла: `game.js` и `game-logic.js`:

```javascript
{
  id: 'jackon',                    // ключ в сейве (не менять после релиза)
  name: 'Jackon',                    // имя в UI
  image: 'assets/pokemon/jackon-idle.png',
  spriteSheet: 'assets/pokemon/jackon-sheet.png',
  spriteFrames: 7,
  animMs: 840,
  animClass: 'play-fpv-drone',     // см. triggerPokemonUppercut
  fillsSlot: true,                 // обязательно для крупного размера в ферме
  price: 140_000,
  upgradeBasePrice: 36_000,
  upgradePriceAtMax: 105_000_000_000,
  maxLevel: 100,
  perHourAtMax: 460_000_000,
  perHourCurve: 'cubic',
  punchIntervalMs: 2900,
  weapon: 'fists',
  desc: 'DJI FPV очки + запуск дрона — зинкоины за каждый полёт',
}
```

2. **CSS** (`styles.css`):
   - Кадры: `.pokemon-sprite.is-sprite-anim` + `@keyframes pokemon-sprite-strip`.
   - Движение тела: класс на **обёртке** `.pokemon-sprite-wrap.is-*-anim`.
   - **Не** анимировать `background-position` и `transform` на одном элементе.

3. **`game.js` → `triggerPokemonUppercut`:** по `animClass` вешать класс на wrap:
   - `play-uppercut` → `is-bounce-anim`
   - `play-punch-break` → `is-punch-anim`
   - `play-lightsaber` / `play-handbag` → `is-saber-anim`
   - `play-fpv-drone` → `is-fpv-anim`

4. **Кэш:** поднять `?v=` в `index.html`; PNG — через `pokemonAssetUrl()`.

5. **`Pokemons/README.md`** — строка в таблице.

---

### Шаг 5 — Размер в ферме и «выскакивание»

Pokemon должны **заполнять слот по ширине** и при прыжке быть **чуть крупнее**:

| CSS | Значение |
|-----|----------|
| `.pokemon-sprite-wrap` | `width: 108%`, `aspect-ratio: 320/900` — масштаб по ширине слота |
| `.pokemon-sprite-wrap--fills-slot` | `width: 118%`, `max-height: 240%` |
| `.is-idle-pop` | подъём до `-18%`, scale до `1.18` |
| `.is-bounce-anim` / `.is-saber-anim` | scale до `1.16` / `1.10` на пике прыжка |
| `.pokemon-slot.filled` | `overflow: visible` — голова не обрезается при анимации |
| `.pokemon-farm`, `.pokemon-farm-section` | `overflow: visible` |

В `buildPokemonFarm()` на wrap вешается `is-idle-pop`; при ударе снимается, после анимации возвращается.

**Если персонажи мелкие:** поднять `CHAR_HEIGHT` в `pokemon_sprite_common.py` (сейчас `660`), пересобрать все `process-*-sprites.py`, bump `?v=` в `index.html`.

---

### Шаг 6 — Слоты и деплой

- Ферма: **4 слота** (`MAX_POKEMON_SLOTS`).
- Pokemon **в запасе** не дают доход — только стоящие в слотах.
- **В бой** / **Убрать** — вкладка Pokemons, event delegation в `initShopPanels()`.
- `normalizePokemonDeployed()` **не** автозаполняет слоты.

---

## Анимация Pokemon (архитектура DOM)

```html
<div class="pokemon-sprite-wrap pokemon-sprite-wrap--fills-slot is-idle-pop">
  <div class="pokemon-sprite" style="background-image: url(...)"></div>
</div>
```

| Слой | Что анимируется |
|------|-----------------|
| `.pokemon-sprite` | Только `background-position` 0%→100%, `steps(frames-1)` |
| `.pokemon-sprite-wrap` | Прыжок / выпад / idle-pop (`transform`) |

Подробнее о багах: [docs/BUGS.md](BUGS.md).

---

## Правила сейвов (не ломать)

- `maxLevel` только растёт (`syncMaxLevel`).
- `isFreshResetSave` — сейв с нулевым прогрессом; при merge **игнорировать**, если есть сейв с прогрессом (`savesWithProgress`).
- При `/api/tick` на клиенте: `applySaveData(mergeSaveStates(state, save))`, не слепое `applySaveData(save)`.
- При входе: merge local + cloud, при необходимости `POST /api/save/reconcile`.

## UI / клики

- Списки улучшений и магазин Pokemon **перерисовываются** каждые 5 с и после тапа.
- Обработчики — **делегирование** на `#upgrades-list`, `#pokemon-shop-list`, `#pokemon-farm` (`initShopPanels`).
- Вкладки — `pointerdown` + `touch-action: manipulation` (`initTabs`).
- Покупки защищены флагом `shopActionBusy`.

## Версионирование ассетов

- Query `?v=` в `index.html` для `game.js` и `styles.css`
- `pokemonAssetUrl(path)` добавляет `?v=` к PNG спрайтам
- На сервере `ASSET_VERSION` из Railway env подменяет `v=` в отдаваемом HTML
- Старые устройства: при несовпадении версии `ensureLatestAssets()` делает reload

## Тестирование вручную

- [ ] Гость: тап, покупка, перезагрузка — прогресс в localStorage
- [ ] Google: вход, выход, повторный вход — баланс и уровень на месте
- [ ] Pokemons: одинаковый размер, заполняют слот, idle «выскакивают»
- [ ] Анимация: кадры на месте, без «половины головы» с соседнего кадра
- [ ] BITCOIN: меч без артефактов между кадрами
- [ ] Jackon: FPV очки + дрон, 7 кадров
- [ ] **Убрать** / **В бой** — слоты и доход только у стоящих в ферме
- [ ] Покупка Pokemon / улучшения с первого нажатия
- [ ] Вкладки меню с первого нажатия на телефоне
