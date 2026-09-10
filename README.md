# Open Money

App personal de finanzas (uso personal, no comercial). App móvil 100% local: sin backend, sin cuentas de usuario, sin nube y sin datos de mercado. Todos tus datos viven en SQLite dentro del móvil.

Idioma de la app: **español**. Idioma del código: **inglés**.

## En qué consiste

Open Money sirve para llevar el control del dinero del día a día:

- **Panel principal**: patrimonio neto en EUR, cuentas con su saldo y últimos movimientos, con acciones rápidas para registrar ingresos, gastos y transferencias.
- **Cuentas**: nombre libre + identificador opcional, divisa (EUR por defecto) y saldo inicial.
- **Movimientos**: ingresos, gastos y transferencias entre cuentas propias. Formulario rápido con fecha, importe, cuenta, categoría y notas. Lista agrupada por día con total diario, filtros por categoría, fechas, cuenta, tipo y búsqueda en notas, con resumen de resultados y suma neta.
- **Transferencias**: una sola entidad con dos patas (origen/destino).
- **Categorías**: catálogo base en español (~20 de gasto y ~6 de ingreso). CRUD completo. Al borrar una categoría en uso, sus movimientos pasan a «Sin categorizar»; si la usa una regla recurrente activa, el borrado se bloquea.
- **Multidivisa**: cuentas en cualquier divisa, EUR como moneda base fija. Tipos de cambio manuales contra EUR con fecha de actualización. Todos los agregados se convierten a EUR.
- **Pagos recurrentes**: reglas de ingreso/gasto/transferencia con frecuencia semanal, mensual, anual o cada N días. Se procesan al abrir la app (catch-up idempotente, sin ejecución en segundo plano). Al terminar muestra aviso «X movimientos recurrentes aplicados» con opción de deshacer el lote. Se pueden pausar, editar y borrar (solo afecta a futuras ejecuciones).
- **Estadísticas**: neto por periodo (mes / 6 meses / año), barras mensuales y desglose por categoría (donut), todo en EUR.
- **Copia de seguridad**: exportar copia completa en JSON, importar copia en JSON (validada en memoria antes de escribir) y exportar movimientos a CSV.
- **Datos de prueba** (solo builds de desarrollo): generar un dataset ficticio o borrar todos los datos desde Ajustes.

## Arquitectura acordada

- **App móvil**: React Native con Expo + TypeScript. Navegación con `expo-router`.
- **Datos**: 100% locales en SQLite (`expo-sqlite`). Sin backend ni nube.
- **Recurrencia**: procesada al abrir la app, no en segundo plano.
- **Gestor de paquetes**: `pnpm`.

### Stack técnico

- `expo` ~57, `expo-router` ~57, `react` 19, `react-native` 0.86
- `expo-sqlite` para persistencia, `expo-file-system` + `expo-sharing` + `expo-document-picker` para backup CSV/JSON
- `react-native-svg` para gráficos, `@expo/vector-icons` para iconos
- `jest` + `jest-expo` para tests (`better-sqlite3` como SQLite en Node), `eslint` (`eslint-config-expo`), `typescript` estricto

### Estructura del proyecto

```text
.
├── app/                    # App Expo (paquete `mobile`)
│   ├── app.json            # Config Expo (nombre, slug, Android package, splash)
│   ├── eas.json            # Perfiles EAS: development / preview (APK) / production
│   └── src/
│       ├── app/            # Rutas expo-router: (tabs)/panel, movimientos, stats, ajustes + modales
│       ├── components/     # UI presentacional (Card, Button, TransactionRow, gráficos…)
│       ├── db/             # client.ts, migrations.ts, seed.ts, sqlite-adapter.ts + repositories/
│       ├── hooks/          # Lógica de negocio (use-dashboard, use-transactions, use-recurring…)
│       ├── services/       # recurring-engine.ts, file-io.ts
│       ├── theme/          # tokens, palettes, theme.tsx
│       └── utils/          # money, dates, csv, backup, recurrence, stats…
├── apps/mobile/android/    # Proyecto Android nativo generado (gradle)
├── .specifications/        # Especificación funcional por historias de usuario (US-001…)
├── DESIGN.md               # Sistema de diseño
└── pnpm-workspace.yaml     # Workspace pnpm
```

## Requisitos

- Node.js 20+ LTS
- `pnpm` 11.9.0 (`corepack enable` o `npm i -g pnpm@11.9.0`)
- Para Expo Go: móvil con la app **Expo Go** instalada, en la misma Wi-Fi que el PC
- Para emulador / build local Android: Android Studio con SDK + un emulador creado, o móvil con depuración USB
- Para APK en la nube: cuenta de Expo + EAS CLI (`npx eas-cli`)

## Arranque rápido

```bash
# 1. Instalar dependencias (desde la raíz)
pnpm install

# 2. Arrancar el servidor de desarrollo
pnpm start
# equivale a: pnpm --filter mobile start  ->  expo start
```

Esto muestra un QR y un menú en terminal (`a` = Android, `w` = web, `j` = debugger).

### Opción A: probar con Expo Go (lo más rápido, móvil físico)

1. Ejecuta `pnpm start`.
2. Abre **Expo Go** en el móvil y escanea el QR del terminal.
3. La app carga con SQLite local y categorías semilla en español.

Notas:

- Móvil y PC deben estar en la misma red. Si el QR no conecta, prueba `pnpm --filter mobile tunnel` (`expo start --tunnel`).
- Expo Go vale para desarrollar UI y flujos. Para código nativo personalizado o builds release necesitas la Opción C/D.

### Opción B: emulador Android

1. Abre Android Studio → Device Manager y arranca un emulador (Pixel, API reciente).
2. Ejecuta `pnpm start` y pulsa `a` en el terminal, o directamente:

```bash
pnpm --filter mobile start -- --android
```

### Opción C: development build local (`expo run:android`)

Compila la app nativa en tu PC (necesita Android SDK). Es lo que hay en `apps/mobile/android/`:

```bash
pnpm android
# equivale a: pnpm --filter mobile android  ->  expo run:android
```

Útil cuando Expo Go no basta. La primera compilación tarda varios minutos.

### Opción D: generar APK (para instalar en el móvil sin PC)

Perfil `preview` ya configurado en `app/eas.json` como APK interno:

```bash
cd app
npx eas-cli build -p android --profile preview
```

Descargas el APK resultante en el móvil e instálalo. Para producción usa `--profile production` (AAB por defecto para Play Store).

## Scripts disponibles

Desde la raíz (`pnpm <script>`) o desde `app/` (`pnpm --filter mobile <script>`):

| Comando | Qué hace |
|---|---|
| `pnpm start` | `expo start`: servidor de desarrollo + QR |
| `pnpm --filter mobile tunnel` | `expo start --tunnel`: expone el dev server por túnel si la red local falla |
| `pnpm android` | `expo run:android`: compila y lanza development build local |
| `pnpm --filter mobile ios` | `expo run:ios` (requiere macOS) |
| `pnpm --filter mobile web` | `expo start --web` |
| `pnpm --filter mobile lint` | `expo lint` |
| `pnpm --filter mobile typecheck` | `tsc --noEmit` |
| `pnpm --filter mobile test` | `jest` (tests en `**/__tests__/**/*.test.ts`) |

## Tests, lint y tipos

```bash
# Tests (SQLite en Node con better-sqlite3)
pnpm --filter mobile test

# Lint
pnpm --filter mobile lint

# Chequeo de tipos estricto
pnpm --filter mobile typecheck
```

Los tests cubren migraciones, seeds, motor de recurrencia, backup (JSON/CSV), utilidades de dinero/fechas y repositorios.

## Datos de prueba

Solo en builds de desarrollo (`__DEV__`):

1. Ve a **Ajustes → Datos de prueba**.
2. **Generar datos**: borra lo actual y crea cuentas, movimientos y reglas de ejemplo.
3. **Borrar datos**: vacía la base local.

## Copias de seguridad

Desde **Ajustes → Copia de seguridad y exportación**:

- **Exportar copia (JSON)**: dump fiel del esquema (`accounts`, `categories`, `transactions`, `recurring_rules`, `exchange_rates`, `settings`) con `app: open-money`, `backupVersion`, `schemaVersion` y `exportedAt`. Se comparte con el diálogo del sistema para guardarla fuera del móvil.
- **Importar copia (JSON)**: se valida entera en memoria antes de tocar la base; un fichero inválido no modifica nada. Acepta copias antiguas (tablas legacy de inversiones se ignoran).
- **Exportar movimientos (CSV)**: exporta los movimientos para hoja de cálculo.

## Cómo funciona por dentro (resumen)

- **Arranque DB**: `SQLiteProvider` abre la base y `migrate()` aplica `MIGRATIONS` pendientes con `PRAGMA user_version`. En primera instalación se siembra el catálogo de categorías en español (`seed.ts`).
- **Recurrentes al abrir**: `use-recurring-processing` llama a `processRecurringOnOpen(db, hoy)`. El motor busca reglas vencidas (`nextExecution <= hoy`), genera las transacciones pendientes de golpe, avanza `nextExecution` y guarda snapshot del lote en `settings` (`recurring_last_batch`) para poder deshacerlo. Todo en transacción.
- **Divisas**: tasas manuales contra EUR en `exchange_rates`. Si falta una tasa, el agregado usa 1:1 y la UI avisa («Alguna divisa no tiene tasa de cambio guardada»).
- **Navegación**: pestañas Panel / Movimientos / Estadísticas / Ajustes + modales para cuenta, movimiento, categoría y regla recurrente.

## Problemas típicos

- **El QR no conecta**: misma Wi-Fi en PC y móvil, o usa `tunnel`. Desactiva VPN si la hay.
- **`pnpm install` falla con `better-sqlite3`**: es dependencia de tests (Node). Reinstala con `pnpm install --force` y acepta el build (`allowBuilds: better-sqlite3` ya está en `pnpm-workspace.yaml`).
- **`expo run:android` falla**: abre Android Studio una vez para aceptar licencias y tener un emulador/SDK válido; revisa `ANDROID_HOME`.
- **Import JSON no hace nada**: el fichero se valida antes de escribir; revisa que sea una copia exportada por la app (`app: "open-money"`).
