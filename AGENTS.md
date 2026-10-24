# AGENTS.md — Contexto completo de MiCampo

Este archivo es la fuente de verdad para cualquier persona o agente de IA (v0, Claude Code, Cursor, Codex, etc.) que quiera trabajar en este repo sin haber participado de las conversaciones previas. Leelo completo antes de escribir código.

Última actualización: 24/10/2026.

---

## 1. Qué es MiCampo

Copiloto conversacional para productores agropecuarios argentinos. El productor escribe como en WhatsApp ("tengo 150 ha de trigo en Ataliva, vendí 360 t a 190 y el jueves me cayó granizo") y MiCampo:

1. **Arma un legajo único** del productor a partir del lenguaje natural (ubicación, cultivo, hectáreas, etapa, contratos).
2. **Cruza señales**: clima hora por hora (Open-Meteo), estado del lote por zonas (NDVI de Sentinel-2), producción estimada contra lo ya vendido y precio de mercado.
3. **Decide con un semáforo** verde / amarillo / rojo, con reglas auditables:
   - cuándo entrar al lote (ventanas de pulverización o cosecha)
   - qué zonas recorrer
   - si conviene vender más o frenar (cobertura)
   - exposición a granizo y exceso de lluvia (seguro)
   - capacidad de financiación
4. **Deriva** con consentimiento explícito: arma la carpeta de financiación (destino: fyo) o la solicitud de seguro (aseguradora vía un productor asesor matriculado) y la guarda en Supabase.

Contexto de negocio: proyecto de hackatón, con demo **en vivo**. El canal es un chat web; más adelante, una app móvil unificada. La campaña actual tiene El Niño (exceso de lluvias).

### Principios que no se negocian

- **La IA nunca inventa números.** Todo número sale del motor determinístico (`lib/engine.ts`). El modelo solo decide qué herramienta llamar y explica el resultado.
- **Las reglas son auditables.** Todos los umbrales viven en `config/rules.ts`. Un agrónomo o el equipo de riesgo de fyo tienen que poder leerlos y ajustarlos.
- **Honestidad sobre los datos.** Cada dato se rotula como real o ilustrativo, y cada herramienta devuelve un campo `source`.
- **Consentimiento antes de compartir.** Ninguna derivación se guarda sin `consent: true` (lo exige también un `check` en la base).
- **No es asesoramiento financiero.** MiCampo explica lo que dicen los datos; no contrata, no vende y no recomienda operaciones concretas.

---

## 2. Estado general

| Fase | Estado | Detalle |
| --- | --- | --- |
| 1. Esquema Supabase + 3 casos | Hecha | Tablas `cases` y `referrals`, RLS, casos `green`, `yellow`, `red` y `scratch` |
| 2. Motor de reglas + clima en vivo con respaldo | Hecha y verificada | Los 3 casos dan el semáforo esperado con Open-Meteo en vivo |
| 3. Agente con herramientas + chat | Hecha | Incluye el modo "Desde cero" (legajo vacío, geocodificación, clima diferido) |
| 4. Panel del legajo | Hecha (esqueleto) | Funciona, pero la UI se va a reescribir |
| 5. Derivaciones con consentimiento | Hecha | API, guardado y vista imprimible (`/referral/[id]`); falta la prueba de punta a punta en navegador (fase 6) |
| 6. Verificación en navegador + README | Pendiente | |

**Repo:** público, `surco-ai` (nombre técnico heredado; el producto se llama MiCampo). **Deploy:** Vercel, proyecto `surco-ai` (team `geomus-projects`), URL `https://surco-ai-ar.vercel.app`. La URL vieja `estrategia-para-hackaton-shipp.vercel.app` redirige con un 308.

---

## 3. Stack

- **Next.js 16** (App Router, Turbopack) + React 19.2 + TypeScript estricto
- **Tailwind CSS v4** (tokens en `app/globals.css`, sin `tailwind.config`) + shadcn/ui
- **AI SDK 7** (`ai`, `@ai-sdk/react`): `ToolLoopAgent`, `useChat`, `DefaultChatTransport`
- **Vercel AI Gateway**: modelo como string `provider/model`, sin paquete de proveedor ni claves
- **Supabase** (Postgres) vía `@supabase/supabase-js`, **solo desde el servidor** con la service role key
- **zod** para todos los esquemas de entrada; **SWR** para datos en el cliente
- Gestor de paquetes: **pnpm**

> Atención: el AI SDK 7 cambió APIs respecto de la v5/v6 (por ejemplo `isStepCount` en lugar de `stepCountIs`). No escribas de memoria: consultá `node_modules/ai/docs/`.

---

## 4. Arquitectura y mapa de archivos

```
config/rules.ts            Umbrales auditables (NDVI, cobertura, ventanas, seguro, rindes por defecto)
lib/types.ts               Tipos de dominio (FarmProfile, Zone, Contract, Signals, FieldTask...)
lib/profile.ts             Esquema zod del legajo, applyProfileChanges, missingProfileFields, isProfileReady, scaleZones
lib/engine.ts              Motor determinístico: computeSignals(profile, weather, boardPrice, task, scenario)
lib/weather.ts             Open-Meteo con timeout + respaldo en data/weather-cache/*.json; weatherSourceLabel
lib/geo.ts                 geocodeArgentina (Open-Meteo Geocoding, filtrado a AR)
lib/cases.ts               Lectura de casos desde Supabase; findNearbyDemoField (croquis prestado <= 40 km)
lib/agent.ts               createFarmAgent: ToolLoopAgent + 7 herramientas + instrucciones del sistema
lib/referral.ts            Destinos y etiquetas de derivación; tipo del resumen guardado
lib/bcra.ts                Central de Deudores del BCRA (solo con CUIT propio y consentimiento)
lib/supabase/admin.ts      Cliente Supabase de servidor (service role). Nunca importarlo en el cliente
lib/format.ts              Formateo de números/fechas es-AR
app/api/chat/route.ts      POST: corre el agente y devuelve el stream de UI
app/api/signals/route.ts   POST: señales para el panel a partir del legajo
app/api/referrals/route.ts POST: guarda una derivación (exige consent: true; BCRA opcional)
app/page.tsx               Página única
app/referral/[id]/page.tsx Vista imprimible de una derivación (lee Supabase en el servidor; + print-button.tsx)
components/farm-workspace.tsx  Selector de caso + layout chat/panel; dueño del estado del legajo
components/chat-panel.tsx      Chat (useChat); aplica la salida de updateProfile al legajo
components/signals-panel.tsx   Panel de señales (SWR contra /api/signals)
components/coverage-gauge.tsx  Barra vendido vs. rango de cosecha (elemento visual distintivo)
components/field-sketch.tsx    Croquis esquemático de zonas (NO es un mapa geográfico)
components/referral-card.tsx   Borrador de derivación + checkbox de consentimiento + envío
data/weather-cache/*.json      Pronóstico real guardado, como respaldo si Open-Meteo no responde
```

### Flujo de datos

1. El **legajo vive en el cliente** (`farm-workspace.tsx`) y viaja en el body de cada request a `/api/chat` y `/api/signals`.
2. En `/api/chat`, el agente se crea por request con el legajo en su clausura. `updateProfile` devuelve el legajo actualizado y el cliente lo aplica cuando la parte de la herramienta queda en `output-available`.
3. El panel recalcula vía SWR cuando cambia el legajo.
4. El clima se pide **una vez por request**, y solo si el legajo está completo (`isProfileReady`).
5. Las derivaciones se guardan en `referrals` desde el servidor.

### Herramientas del agente (`lib/agent.ts`)

| Herramienta | Para qué |
| --- | --- |
| `updateProfile` | Extrae datos del lenguaje natural, geocodifica y, si no hay zonas, presta el croquis de un caso de demo cercano |
| `fieldWindows` | Días aptos para pulverizar o cosechar (`task: spray \| harvest`) |
| `zonesToInspect` | Zonas con NDVI bajo respecto del histórico |
| `coverageAndSale` | Producción en rango, cobertura y señal de venta; acepta un escenario "¿y si...?" |
| `insuranceExposure` | Exposición a granizo y lluvia |
| `dailyCheck` | Resumen proactivo ("chequeo de mañana") |
| `prepareReferral` | Borrador de la carpeta de financiación o seguro; requiere consentimiento en la UI |

Si el legajo está incompleto, todas las herramientas de cálculo devuelven `{ missing, note }` en lugar de inventar.

---

## 5. Datos: qué es real y qué es ilustrativo

| Dato | Estado actual | Fuente |
| --- | --- | --- |
| Pronóstico y ventanas | **Real, en vivo** | Open-Meteo (con caché de respaldo real) |
| Geocodificación | **Real** | Open-Meteo Geocoding |
| Granizo del 22/10/2026 en Ataliva | **Real** (verificado) | Medios locales |
| NDVI por zona | **Ilustrativo** | Valores precargados en los casos |
| Precio pizarra | Cargado a mano (USD 215/t por defecto) | Editable en la UI; verificar contra la Bolsa de Comercio de Rosario |
| Rinde de referencia | **Supuesto** | `DEFAULT_YIELD_T_HA` en `config/rules.ts` |
| Hectáreas, contratos, alias | **Sintético** | Casos de demo |
| Deudas BCRA | Real, solo con CUIT propio y consentimiento | API pública Central de Deudores |

### Casos de demo (tabla `cases`)

| id | Productor | Situación | Semáforo esperado |
| --- | --- | --- | --- |
| `green` | Productor A · Pergamino | 120 ha trigo sano, 200 t vendidas | Verde |
| `yellow` | Productor B · Marcos Juárez | Bajo anegado, cobertura del 73% | Amarillo |
| `red` | Productor C · Ataliva | Granizo del 22/10, cobertura del 88%, contratos 13% abajo del mercado | Rojo |
| `scratch` | Legajo vacío | Para la demo "desde cero" | Depende de la charla |

### Esquema Supabase

```sql
cases(id text pk, name text, description text, profile jsonb, created_at timestamptz)
  -- RLS: lectura pública
referrals(id uuid pk, case_id text fk -> cases.id, kind text check in ('financing','insurance'),
          destination text, consent boolean check (consent = true), summary jsonb, created_at timestamptz)
  -- RLS activado, sin políticas públicas: solo escribe/lee el servidor con service role
```

Las claves JSON de `profile` están en camelCase (`referenceYieldTHa`, `ndviCurrent`, `ndviBaseline`, `recentHail`, `eventNote`, `zones[]`, `contracts[]` con `tons`, `priceUsdT` y `delivery`).

---

## 6. Guion de la demo en vivo (3–4 min)

1. Abrir el caso **"Desde cero"**. Escribir: *"Tengo 150 ha de trigo en Ataliva, vendí 360 t a 190 y el jueves me cayó granizo."*
2. El agente llama a `updateProfile` y luego a `dailyCheck`. El panel se completa: zonas a recorrer, rango de cosecha y cobertura en rojo.
3. Preguntar: *"¿Vendo más?"* Respuesta esperada: no, ya cubrió la mayor parte del rango pesimista.
4. Preguntar: *"¿Puedo pulverizar el martes?"* Ventanas con clima real.
5. Preguntar: *"¿Y si llueven 80 mm más?"* Escenario contra el caso base.
6. *"Necesito financiar la cosecha."* Aparece el borrador y el productor tilda el consentimiento. La carpeta se guarda y queda el link.
7. Cierre: los casos verde y amarillo para mostrar que el semáforo no siempre da rojo.

**Plan B:** si falla la IA, el panel (`/api/signals`) sigue funcionando sin el modelo. Si falla Open-Meteo, entra el caché. Igual conviene grabar un video de respaldo de 2 minutos.

**Posicionamiento:** hoy el productor mezcla WhatsApp con el agrónomo y el acopio, la planilla del corredor y apps de satélite o precios que muestran datos sueltos. MiCampo **cruza esos datos, decide y deriva**. No afirmes nada sobre funciones de productos de terceros.

---

## 7. Pendientes (en orden de prioridad)

1. **Prueba de punta a punta en navegador** del guion de la demo, también en mobile. Incluye imprimir la carpeta desde `/referral/[id]`.
2. **Precio de Rosario real**: reemplazar el valor fijo por una fuente pública, con respaldo manual.
3. **NDVI real** de Sentinel-2 para al menos el lote de Ataliva. Mostrar la fecha de la imagen y la nubosidad.
4. **Rindes del MAGyP** por departamento en lugar de `DEFAULT_YIELD_T_HA`.
5. **Reescritura de la UI** (lo hace otro miembro del equipo). Respetá el contrato: el legajo en el cliente y las APIs de la sección 4.
6. Encabezados de seguridad en `next.config` (`X-Content-Type-Options`, `Referrer-Policy`, HSTS).
7. Rate limiting en `/api/chat`: es público y consume créditos de IA.

---

## 8. Criterios e instrucciones para trabajar en el repo

### Código

- **Identificadores en inglés** (variables, funciones, archivos, tablas, claves JSON). **Textos de UI y del agente en español rioplatense.**
- TypeScript estricto. Validá toda entrada externa con zod en el borde (rutas de API, herramientas).
- Lógica de negocio en `lib/`, umbrales en `config/rules.ts`. **Nunca pongas umbrales ni números mágicos en componentes ni en el prompt.**
- Si agregás una señal: regla en `rules.ts`, cálculo puro en `engine.ts`, herramienta en `agent.ts` (con `source`) y, recién después, la UI.
- Las herramientas del agente siempre devuelven `source` y respetan `pending()` si falta información.
- Supabase **solo desde el servidor**. No expongas la service role key ni crees políticas RLS de escritura pública.
- Las llamadas externas llevan timeout (`AbortSignal.timeout`) y respaldo o error claro. La demo no puede colgarse.
- No uses `localStorage` para datos de negocio.
- Comentarios solo para explicar un "por qué" que el código no dice.

### IA y costos

- El modelo se define en `lib/agent.ts` (`AGENT_MODEL`). Por defecto es `nvidia/nemotron-3.5-lightning-free` (gratis en el free tier de AI Gateway, soporta tool-use), sobreescribible con la variable `AI_MODEL`. Otros modelos (Claude, GPT, Gemini) requieren comprar créditos pagos.
- En Vercel y en v0 la autenticación del AI Gateway es automática (OIDC). **No agregues claves de proveedor.** En local hace falta `AI_GATEWAY_API_KEY` o `vercel env pull`.
- Mantené `stopWhen: isStepCount(8)` o menos, y el prompt corto. Cada paso reenvía el contexto completo.

### UI

- La UI actual es un **esqueleto** y se va a reescribir. No inviertas en pulirla.
- Tokens de color en `app/globals.css`. Semáforo: verde, ámbar, rojo. No uses colores directos (`bg-white`, etc.).
- El croquis de zonas es esquemático. Si alguna vez hace falta un mapa real, usá Leaflet o Mapbox; **nunca dibujes geografía a mano en SVG**.
- Mobile-first: la meta es una app móvil unificada con el chat web.

### Git y colaboración

- Nunca hagas push directo a `main`. Trabajá en una rama `feat/...` o `fix/...` y abrí un Pull Request.
- Cada merge a `main` se despliega solo en Vercel.
- Commits en imperativo y en inglés (`Add printable referral view`). Para coautoría, agregá `Co-authored-by: Nombre <email>` al final del mensaje.
- Desde v0: importá el repo en un chat nuevo y elegí tu propia rama.

### Verificación antes de abrir un PR

```bash
pnpm install
pnpm exec tsc --noEmit
pnpm dev
# señales de un caso (sin IA):
curl -s localhost:3000/api/signals -H 'content-type: application/json' \
  -d '{"caseId":"red"}' | jq '.signals.level'
```

Después recorré el guion de la sección 6 en el navegador.

### Lo que NO hay que hacer

- Que el modelo calcule o estime números por su cuenta.
- Presentar datos ilustrativos como reales.
- Guardar o compartir datos de terceros sin consentimiento. No uses CUIT ni datos de productores reales sin permiso escrito.
- Prometer en la UI cotizaciones de seguro o aprobación de crédito: MiCampo arma la solicitud; decide la entidad.
- Commitear secretos o archivos `.env*`.

---

## 9. Variables de entorno

| Variable | Dónde se usa | Notas |
| --- | --- | --- |
| `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY` | `lib/supabase/admin.ts` | Las inyecta la integración de Supabase en Vercel |
| `AI_MODEL` | `lib/agent.ts` | Opcional. Por defecto `nvidia/nemotron-3.5-lightning-free` |
| `AI_GATEWAY_API_KEY` | AI SDK | Solo en local. En Vercel se usa OIDC automáticamente |

Para desarrollo local con acceso al proyecto: `vercel link` y después `vercel env pull .env.local`.
