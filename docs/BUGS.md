# Баги и исправления

## Исправлено (2026-06-10)

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

### BITCOIN выглядел неправильно

**Причина:** устаревшие / процедурно сгенерированные спрайты вместо Funko-референса.

**Фикс:** пересборка из `bitcoin-funko-idle-raw.png` через `scripts/build-pokemon-idle-sheet.py`.

---

### Pokemons «скроллились» при анимации

**Причина:** keyframes `*-sprite-full` сдвигали спрайт по `translateY`; `overflow: visible` на слоте.

**Фикс:** убраны full-анимации с translateY; слот всегда `overflow: hidden`; только смена `background-position`.

Файл: `styles.css`

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

## Открытые / низкий приоритет

- `reconcileSaves` ограничивает баланс по `estimateMaxEarnedFromTaps` — при очень большом офлайн-прогрессе теоретически может занизить (античит)
- Дублирование констант между клиентом и `game-logic.js` — риск рассинхрона
