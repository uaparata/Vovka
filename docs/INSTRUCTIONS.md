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

## Добавить нового Pokemon

1. Положить референс в `Pokemons/` или `assets/pokemon/*-raw.png`
2. Обработать скриптом (скопировать `process-kirill-sprites.py` / `build-pokemon-idle-sheet.py`)
3. Добавить запись в `POKEMONS` в **обоих** файлах: `game.js` и `game-logic.js`
4. При необходимости — CSS-анимация в `styles.css` (`play-*`, `steps(5)` для 6 кадров)
5. Обновить `?v=` в `index.html` для сброса кэша

## Сборка спрайтов

```bash
python scripts/build-pokemon-idle-sheet.py    # Mullin + BITCOIN из Funko idle
python scripts/process-bitcoin-sprites.py     # BITCOIN из горизонтального raw sheet
python scripts/process-kirill-sprites.py      # Mullin из raw sheet
```

Требуется: `pip install Pillow` (модуль `sprite_seam_fix` в `scripts/`).

Параметры кадра: 320×900, 6 кадров, `background-size: 600%` в CSS.

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

- Query `?v=22` в `index.html` для `game.js` и `styles.css`
- На сервере `ASSET_VERSION` из Railway env подменяет `v=` в отдаваемом HTML

## Тестирование вручную

- [ ] Гость: тап, покупка, перезагрузка — прогресс в localStorage
- [ ] Google: вход, выход, повторный вход — баланс и уровень на месте
- [ ] Pokemons: анимация без смещения слота, BITCOIN с мечом
- [ ] Покупка Pokemon / улучшения с первого нажатия
- [ ] Вкладки меню с первого нажатия на телефоне
