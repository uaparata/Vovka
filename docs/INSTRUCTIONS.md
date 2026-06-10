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

### Шаг 1 — Funko Pop модель (референс)

Цель: **3D Funko Pop** в стиле Mullin/BITCOIN, не плоская PIL-графика.

1. Создай папку `Pokemons/<имя>-funko/` (пример: `nikita-funko/`).
2. Собери референсы лица/одежды (фото друга).
3. Сгенерируй **горизонтальный pose sheet** — N кадров в один ряд на белом фоне:
   - Каждый кадр: полное тело на чёрной круглой подставке Funko.
   - Позы под анимацию (idle → замах → удар → … → idle).
   - Для 7 кадров: 7 равных панелей слева направо.
4. Сохрани как `Pokemons/<имя>-funko/<имя>-poses-raw.png`.
5. Опционально: превью одной позы `*-preview.png` для каталога.

**Эталон:** `Pokemons/bitcoin-bts-funko/bitcoin-poses-raw.png`, `Pokemons/nikita-funko/nikita-poses-raw.png`.

**Не использовать для финала:** `scripts/generate-*-sprites.py` (процедурное рисование) — только для черновиков.

---

### Шаг 2 — Анимация из 7 (или 6) кадров

Технические параметры (единые для всех Pokemon):

| Параметр | Значение |
|----------|----------|
| Кадр | 320 × 900 px |
| Sheet | горизонтальная полоса `320 × N` |
| Idle | кадр 0 |
| CSS `background-size` | `calc(N * 100%) 100%` |
| CSS `steps()` | `steps(N - 1)` |

**Сборка (единый pipeline):**

```bash
python scripts/process-kirill-sprites.py      # Mullin — preview PNG
python scripts/process-bitcoin-sprites.py     # BITCOIN — idle raw + poses
python scripts/process-nikita-sprites.py      # Nikita — 7 кадров
python scripts/process-sasha-sprites.py       # Sasha — 7 кадров
python scripts/process-renato-sprites.py      # Renato — 7 кадров
```

Все скрипты используют `scripts/pokemon_sprite_common.py` (`CHAR_HEIGHT=300`, линия ног, удаление белой полоски).

Выход:
- `assets/pokemon/<id>-idle.png`
- `assets/pokemon/<id>-sheet.png`

Требуется: `pip install Pillow`.

**Не использовать:** `fix_center_seam()` на финале; процедурный `generate-*-sprites.py`.

---

### Шаг 3 — Интеграция в игру

1. **`POKEMONS`** — добавить объект в **оба** файла: `game.js` и `game-logic.js`:

```javascript
{
  id: 'nikita',                    // ключ в сейве
  name: 'Nikita',                  // имя в UI
  image: 'assets/pokemon/nikita-idle.png',
  spriteSheet: 'assets/pokemon/nikita-sheet.png',
  spriteFrames: 7,
  animMs: 770,
  animClass: 'play-punch-break',   // см. triggerPokemonUppercut
  fillsSlot: true,
  price: 80_000,
  upgradeBasePrice: 30_000,
  upgradePriceAtMax: 90_000_000_000,
  maxLevel: 100,
  perHourAtMax: 450_000_000,
  perHourCurve: 'cubic',
  punchIntervalMs: 2800,
  weapon: 'fists',
  desc: 'Бьёт экран — зинкоины за каждый удар',
}
```

2. **CSS** (`styles.css`):
   - Кадры: `.pokemon-sprite.is-sprite-anim` + `@keyframes pokemon-sprite-strip` (уже есть).
   - Движение тела: новый класс на **обёртке** `.pokemon-sprite-wrap.is-*-anim` (bounce / punch / saber).
   - **Не** анимировать `background-position` и `transform` на одном элементе.

3. **`game.js` → `triggerPokemonUppercut`:** по `animClass` вешать класс на wrap:
   - `play-uppercut` → `is-bounce-anim`
   - `play-punch-break` → `is-punch-anim`
   - `play-lightsaber` → `is-saber-anim`

4. **Кэш:** поднять `?v=` в `index.html` для `game.js` и `styles.css`. PNG подхватывают версию через `pokemonAssetUrl()`.

5. **`Pokemons/README.md`** — строка в таблице проектов.

---

## Анимация Pokemon (архитектура DOM)

```html
<div class="pokemon-sprite-wrap pokemon-sprite-wrap--fills-slot">
  <div class="pokemon-sprite" style="background-image: url(...)"></div>
</div>
```

| Слой | Что анимируется |
|------|-----------------|
| `.pokemon-sprite` | Только `background-position` 0%→100%, `steps(frames-1)` |
| `.pokemon-sprite-wrap` | Прыжок / выпад / покачивание (`transform`) |

Слот `.pokemon-slot` и `.pokemon-slot-stage` — всегда `overflow: hidden`.

Подробнее о баге «скролла»: [docs/BUGS.md](BUGS.md).

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

- Query `?v=26` в `index.html` для `game.js` и `styles.css`
- `pokemonAssetUrl(path)` добавляет `?v=` к PNG спрайтам
- На сервере `ASSET_VERSION` из Railway env подменяет `v=` в отдаваемом HTML
- Старые устройства: при несовпадении версии `ensureLatestAssets()` делает reload

## Тестирование вручную

- [ ] Гость: тап, покупка, перезагрузка — прогресс в localStorage
- [ ] Google: вход, выход, повторный вход — баланс и уровень на месте
- [ ] Pokemons: одинаковый размер Mullin/BITCOIN/Nikita на телефоне и десктопе
- [ ] Анимация: кадры переключаются на месте, без горизонтального «скролла»
- [ ] BITCOIN с мечом, Nikita с трещинами экрана
- [ ] Покупка Pokemon / улучшения с первого нажатия
- [ ] Вкладки меню с первого нажатия на телефоне
