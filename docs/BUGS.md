# Баги и исправления

## Исправлено (2026-06-10, ночь)

### Разный размер Pokemons + обрезанная голова BITCOIN + белая полоска снизу

**Симптомы:**
- Mullin, BITCOIN, Nikita, Sasha, Renato **разного размера** в слотах фермы.
- У **BITCOIN** срезана правая часть головы.
- У **Mullin** — шахматная прозрачность / чёрный шов по центру (checkerboard).
- У **Nikita** слишком мелкий относительно остальных.
- Под ногами персонажа — **белая горизонтальная полоска** (остаток белого фона / подставки Funko в PNG).

**Причины:**
| Баг | Причина |
|-----|---------|
| Разный размер | У каждого скрипта был свой `TARGET_CHAR_H` / `scale`; CSS `width:118%` без ограничения `height` — на части экранов голова обрезалась, на других персонаж казался мелким |
| BITCOIN: срез головы | `bitcoin-poses-raw.png` — узкие панели; равное деление sheet + inset **обрезало** край позы; idle брался из обрезанного кадра |
| Mullin: checkerboard / шов | `kirill-sheet-raw.png` с AI-швом по центру + `fix_center_seam()` рисовал **чёрную полосу**; прозрачные пиксели в игре = checkerboard |
| Nikita мелкий | `TARGET_CHAR_H=250` и большой bbox после crop — scale меньше, чем у BITCOIN |
| Белая полоска | Не удалённый белый фон / край подставки в нижних 5–10% кадра 320×900; виден через `background-position: bottom` |

**Фикс:**
- Единый модуль `scripts/pokemon_sprite_common.py`: `CHAR_HEIGHT=300`, общая линия ног (`FEET_PAD`), `strip_white_bottom()` + `trim_bottom_white_rows()`.
- **Mullin** — из чистого `kirill-mulin-funko-preview.png` (без raw sheet).
- **BITCOIN** — idle из `bitcoin-funko-idle-raw.png`; poses только для кадров 1–5 с расширенным crop.
- CSS: `.pokemon-sprite-wrap { height: 96%; max-width: 142% }` — влезает в слот без обрезки головы.
- Добавлены **Sasha** и **Renato** через тот же pipeline.

**Не использовать:** `fix_center_seam()` на финальных ассетах; `strip-sprite-bottom.py` без бэкапа.

---

## Исправлено (2026-06-10, вечер)

### Pokemons выглядят по-разному на разных устройствах + стали мелкими

**Симптом:** на телефонах и десктопе персонажи в ферме разного размера; Mullin/BITCOIN/Nikita «съёжились» в центре слота; на старых сессиях кэшировались старые PNG/CSS.

**Причины (комбо):**
1. CSS `height: 100%` + `width: auto` на `.pokemon-sprite` — спрайт масштабировался по высоте короткой сцены и становился крошечным.
2. Смена `aspect-ratio` слота с `2/3` на `3/4` и `min-height: 0` — слоты сжимались на узких экранах.
3. `scripts/strip-sprite-bottom.py` агрессивно вырезал нижние пиксели у готовых sheet — портились Mullin/BITCOIN.
4. Процедурный `generate-nikita-sprites.py` (PIL-рисование) вместо Funko pose sheet — Nikita выглядел «плоским».

**Фикс:**
- Вернули width-based масштаб: `.pokemon-sprite-wrap { width: 118%; aspect-ratio: 320/900 }`, слот `2/3`, `min-height: 128px`.
- Пересборка спрайтов из raw: `process-kirill-sprites.py`, `process-bitcoin-sprites.py`, `process-nikita-sprites.py`.
- Nikita: `Pokemons/nikita-funko/nikita-poses-raw.png` → game assets (7 кадров).
- `pokemonAssetUrl()` в `game.js` — `?v=` на PNG; сервер подменяет `v` через `ASSET_VERSION`.

Файлы: `styles.css`, `game.js`, `assets/pokemon/*`, `scripts/process-nikita-sprites.py`

---

### Pokemons «скроллятся» при анимации (горизонтальное проскальзывание)

**Симптом:** во время удара/меча спрайт визуально «едет» по горизонтали, как будто листается вся полоса sheet, а не дискретные кадры.

**Причина:** один элемент анимировал **и** `background-position` по промежуточным keyframes (16.666%, 33.333%…), **и** `transform: translateY/scale`. Браузер интерполирует `background-position` плавно между ключами → эффект скролла. Плюс `steps()` в JS конфликтовал с многоточечными keyframes.

**Фикс (правильная схема):**
- **Внутренний** `.pokemon-sprite` — только `pokemon-sprite-strip`: `from 0%` → `to 100%` + `steps(frames-1)`.
- **Внешний** `.pokemon-sprite-wrap` — отдельно bounce/lunge/sway (`translateY`, `scale`), без смены `background-position`.
- Слот и сцена **всегда** `overflow: hidden`.

Файлы: `styles.css`, `game.js` (`buildPokemonFarm`, `triggerPokemonUppercut`)

**Не делать снова:** не совмещать `translateY` и пошаговую смену кадров на одном DOM-узле.

---

## Исправлено (2026-06-10, утро)

### Аккаунт / прогресс сбрасывался при входе

**Симптом:** баланс, уровень, покемоны пропадали после Google-входа или периодически при tick.

**Причина:** `mergeSaves` / `mergeSaveStates` при наличии «пустого» сейва (`isFreshResetSave`) и сейва с прогрессом **возвращали пустой сейв**. Плюс `loadCloudSave` при пустом облаке вызывал `clearStaleLocalSaves` и затирал localStorage.

**Фикс:**
- `savesWithProgress()` — в merge участвуют только сейвы с реальным прогрессом
- `reconcileSaves`: если сервер пустой, а клиент нет — берём клиент
- `loadCloudSave`: всегда merge, reconcile только если `saveNeedsSync`
- tick: `applySaveData(mergeSaveStates(state, save))`
- `applySaveData`: `maxLevel` и `peakBalance` не уменьшаются

Файлы: `game-logic.js`, `game.js`

---

### Уровень Вовы сбрасывался

**Причина:** следствие сброса сейва + перезапись `maxLevel` из пустого облака.

**Фикс:** `syncMaxLevel` уже не понижает уровень; дополнительно `Math.max` при `applySaveData`.

---

### Валюта списывалась «сама»

**Причина:** часто из-за перезаписи сейва пустым серверным состоянием или reconcile с заниженным балансом после ложного reset.

**Фикс:** merge-логика выше; покупки по-прежнему только через API на сервере.

---

### BITCOIN выглядел неправильно (первый раз)

**Причина:** устаревшие / процедурно сгенерированные спрайты вместо Funko-референса.

**Фикс:** пересборка из `bitcoin-poses-raw.png` через `scripts/process-bitcoin-sprites.py`.

---

### Кнопки меню / покупка Pokemon не с первого раза

**Причина:** `render()` пересоздавал DOM и снимал `click`-обработчики; на touch `click` приходит с задержкой.

**Фикс:**
- Event delegation: `initShopPanels()`, `switchTab` + `pointerdown` на вкладках
- `shopActionBusy` против двойных покупок
- `touch-action: manipulation` на табах и карточках

Файлы: `game.js`, `styles.css`

---

## На что смотреть при регрессии

1. Любой новый код merge сейвов — не отдавать приоритет `isFreshResetSave`
2. Не вызывать `clearStaleLocalSaves` при загрузке облака
3. Не вешать `addEventListener('click')` внутри `render*()` без делегирования
4. `game.js` и `game-logic.js` — дублируют `POKEMONS`; менять оба
5. Анимация Pokemon: strip-кадры и bounce — **разные** элементы DOM
6. Не использовать процедурный PIL для финальных спрайтов — только Funko pose sheet
7. После смены PNG — bump `?v=` в `index.html` и проверить `pokemonAssetUrl()`

## Открытые / низкий приоритет

- `reconcileSaves` ограничивает баланс по `estimateMaxEarnedFromTaps` — при очень большом офлайн-прогрессе теоретически может занизить (античит)
- Дублирование констант между клиентом и `game-logic.js` — риск рассинхрона
