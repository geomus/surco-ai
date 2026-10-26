# Resumen completo — Hackathon, MiCampo y estado del proyecto

> Documento preparado para compartir con un agente de búsqueda laboral, un nuevo colaborador o cualquier persona que necesite entender el proyecto sin acceso a este chat.
>
> **Producto actual:** MiCampo  
> **Nombre técnico heredado:** Surco AI / `surco-ai`  
> **Repo:** `geomus/surco-ai`  
> **URL productiva:** https://micampo-ar.vercel.app  
> **Fecha de referencia del proyecto:** octubre de 2026  
> **Última actualización de este resumen:** 26/10/2026

---

## 1. Contexto personal y origen

Este proyecto nació como respuesta a una **hackathon** con una consigna orientada a crear una solución con inteligencia artificial para el sector agropecuario. La idea inicial fue discutir una oportunidad de producto para productores argentinos y convertirla rápidamente en una demo funcional, presentable y técnicamente defendible.

El objetivo no era entrenar un modelo de machine learning propio en el tiempo disponible. La estrategia fue construir una aplicación **AI-first** utilizando un modelo existente, herramientas determinísticas, datos externos y una interfaz clara. El valor no está en decir simplemente “un chatbot para el agro”, sino en unir información que normalmente está dispersa:

- clima y pronóstico;
- estado del lote y zonas a recorrer;
- producción esperada;
- contratos y toneladas ya vendidas;
- precio de referencia;
- exposición a granizo y exceso de lluvia;
- necesidades de financiación;
- posibilidad de derivar una solicitud a una aseguradora o financiera.

La conversación original también exploró una versión más amplia del producto: un asistente que pudiera enviar notificaciones por WhatsApp sobre fumigaciones, siembra y otras tareas. Para el MVP de la hackathon se decidió **sacar WhatsApp** y concentrar el alcance en un chat web con un panel integral. Esto redujo el riesgo y permitió demostrar el núcleo de valor en pocas horas.

---

## 2. Evolución de la idea

### 2.1. Idea amplia inicial

La visión inicial era acompañar la transición del productor agropecuario tradicional hacia una operación más tecnológica:

- consultas conversacionales;
- notificaciones sobre labores;
- recordatorios de fumigación, siembra y cosecha;
- dashboard integral;
- integración futura con servicios financieros, seguros, acopios y corredores.

Durante el análisis se detectó que incluir WhatsApp, notificaciones, dashboard completo, múltiples integraciones y un modelo entrenado propio excedía el tiempo de la presentación.

### 2.2. Reformulación para el MVP

El MVP se reformuló como un **copiloto conversacional web para productores agropecuarios argentinos**, con cuatro capacidades concretas:

1. armar un legajo de explotación a partir del lenguaje natural;
2. cruzar señales externas y reglas de negocio;
3. explicar un semáforo de decisión;
4. preparar una derivación de financiación o seguro con consentimiento.

La propuesta se puede resumir así:

> **MiCampo cruza clima, estado del lote y posición comercial para ayudar al productor a decidir cuándo entrar, cuánto vender y cómo activar una cobertura o financiación.**

### 2.3. Diferenciación

El producto no pretende ser otra app que muestre datos aislados. La diferenciación buscada es:

- **unificar información** que el productor suele tener repartida entre WhatsApp, el agrónomo, el acopio, el corredor, una planilla y aplicaciones satelitales;
- **convertir datos en una decisión explicable**;
- **reducir carga administrativa** al preparar la información necesaria para un seguro o una financiación;
- **conectar al productor con terceros**, sin prometer que MiCampo aprueba créditos, vende seguros o ejecuta operaciones.

La posible integración con fyo apareció como una oportunidad comercial para financiación y derivación. En el MVP se representa como destino de una carpeta de financiación, no como una integración real con APIs de fyo.

---

## 3. Producto construido

MiCampo permite que un productor escriba algo parecido a:

> “Tengo 150 hectáreas de trigo en Ataliva, vendí 360 toneladas a 190 y el jueves me cayó granizo.”

El sistema toma esa información y arma o actualiza un **legajo** con:

- ubicación;
- cultivo;
- hectáreas;
- rinde de referencia;
- zonas del lote;
- estado de NDVI por zona;
- toneladas ya vendidas;
- contratos;
- precios pactados;
- eventos climáticos recientes;
- etapa o tarea operativa.

Con el legajo, el sistema puede responder preguntas como:

- ¿Cuándo puedo pulverizar?
- ¿Puedo cosechar el martes?
- ¿Qué zonas tengo que recorrer?
- ¿Cuánto tengo cubierto?
- ¿Conviene vender más o frenar?
- ¿Qué pasa si llueven 80 mm más?
- ¿Cuál es mi exposición a granizo o exceso de lluvia?
- Necesito financiar la cosecha.
- Quiero preparar una solicitud de seguro.

La salida principal es un semáforo:

- **Verde:** situación relativamente controlada.
- **Amarillo:** requiere seguimiento o una acción preventiva.
- **Rojo:** exposición o decisión relevante que necesita atención.

El semáforo no es una opinión libre del modelo. Lo calcula un motor determinístico con reglas auditables.

---

## 4. Principios de producto y seguridad

Estos principios se definieron durante el proyecto y deben mantenerse:

### 4.1. La IA no inventa números

El modelo no calcula coberturas, rendimientos, NDVI ni exposición por su cuenta. Decide qué herramienta llamar y explica el resultado. Los números salen de `lib/engine.ts` y de las fuentes configuradas.

### 4.2. Reglas auditables

Los umbrales de negocio viven en `config/rules.ts`. Un agrónomo o un equipo de riesgo debería poder leerlos y modificarlos sin buscar números mágicos en componentes o prompts.

### 4.3. Honestidad sobre los datos

Cada herramienta debe indicar `source`. La UI debe distinguir entre:

- datos reales en vivo;
- datos reales cacheados;
- datos cargados manualmente;
- datos sintéticos de demo;
- supuestos o valores de referencia.

### 4.4. Consentimiento antes de derivar

MiCampo no debe guardar ni compartir una derivación sin `consent: true`. La base de datos también tiene una restricción para evitar guardar consentimientos falsos.

### 4.5. No es asesoramiento financiero

MiCampo explica señales y prepara solicitudes. No contrata seguros, no vende commodities, no aprueba créditos y no recomienda operaciones financieras concretas.

### 4.6. Privacidad

No se deben usar CUIT ni datos de productores reales sin autorización escrita. La consulta al BCRA, cuando existe, debe ser únicamente con CUIT propio y consentimiento.

---

## 5. Arquitectura técnica actual

### Stack

- Next.js 16 con App Router y Turbopack.
- React 19.2.
- TypeScript estricto.
- Tailwind CSS v4.
- shadcn/ui.
- pnpm.
- AI SDK 7 (`ai`, `@ai-sdk/react`).
- Vercel AI Gateway.
- Supabase Postgres vía `@supabase/supabase-js`.
- Zod para validación.
- SWR para sincronización de datos del panel.
- Open-Meteo para clima y geocodificación.

### Mapa de archivos relevantes

```text
config/rules.ts              Umbrales auditables del negocio
lib/types.ts                 Tipos de dominio
lib/profile.ts               Esquema zod y funciones del legajo
lib/engine.ts                Motor determinístico de señales
lib/weather.ts               Open-Meteo, timeout y caché de respaldo
lib/geo.ts                   Geocodificación limitada a Argentina
lib/cases.ts                 Lectura de casos desde Supabase
lib/agent.ts                 ToolLoopAgent y herramientas
lib/referral.ts              Destinos y tipos de derivaciones
lib/bcra.ts                  Central de Deudores del BCRA
lib/supabase/admin.ts        Cliente servidor con service role key
lib/format.ts                Formateo es-AR
app/api/chat/route.ts        Endpoint del agente
app/api/signals/route.ts     Endpoint determinístico de señales
app/api/referrals/route.ts   Guardado de derivaciones
app/page.tsx                 Página principal
app/referral/[id]/page.tsx   Vista imprimible de derivaciones
components/farm-workspace.tsx Dueño del legajo y layout principal
components/chat-panel.tsx   Chat y actualización del legajo
components/signals-panel.tsx Panel de señales con SWR
components/coverage-gauge.tsx Medidor de cobertura
components/field-sketch.tsx Croquis esquemático del lote
components/referral-card.tsx Consentimiento y envío
AGENTS.md                    Contexto técnico para agentes
README.md                    Resumen corto del repo
```

### Flujo de datos

1. El legajo vive en el cliente, principalmente en `farm-workspace.tsx`.
2. El cliente envía el legajo a `/api/chat` y `/api/signals`.
3. `/api/chat` crea el agente con el legajo de la solicitud.
4. `updateProfile` devuelve cambios estructurados.
5. El cliente aplica esos cambios y el panel se recalcula con SWR.
6. El clima se consulta una vez por request cuando el legajo está completo.
7. Las derivaciones se guardan desde el servidor en Supabase.

---

## 6. Herramientas del agente

| Herramienta | Función |
| --- | --- |
| `updateProfile` | Extrae datos de lenguaje natural, geocodifica y completa el legajo |
| `fieldWindows` | Calcula ventanas aptas para pulverización o cosecha |
| `zonesToInspect` | Identifica zonas con NDVI bajo respecto al histórico |
| `coverageAndSale` | Calcula producción estimada, cobertura y señal de venta |
| `insuranceExposure` | Calcula exposición a granizo y lluvia |
| `dailyCheck` | Arma un chequeo proactivo de la situación |
| `prepareReferral` | Prepara carpeta de financiación o seguro con consentimiento |

Si faltan datos, las herramientas devuelven `missing` y una nota explicativa. No completan datos de manera inventada.

---

## 7. Datos y fuentes

| Dato | Estado en la demo | Fuente o explicación |
| --- | --- | --- |
| Pronóstico y ventanas | Real en vivo, con respaldo | Open-Meteo |
| Geocodificación | Real | Open-Meteo Geocoding, filtrado a Argentina |
| Granizo en Ataliva | Real/verificado | Fuentes locales consultadas |
| NDVI por zona | Ilustrativo | Precargado en casos de demo |
| Precio de pizarra | Manual | USD 215/t por defecto, editable |
| Rinde de referencia | Supuesto | `DEFAULT_YIELD_T_HA` |
| Hectáreas y contratos | Sintético | Casos de demo |
| Deudas BCRA | Real, con consentimiento | Central de Deudores pública |

La demo debe decir claramente qué es real y qué es ilustrativo. El hecho de que el sistema muestre un mapa o un NDVI no significa que el dato sea una lectura satelital actual.

### Casos de demo

| ID | Productor | Situación | Resultado esperado |
| --- | --- | --- | --- |
| `green` | Productor A, Pergamino | 120 ha de trigo sano, 200 t vendidas | Verde |
| `yellow` | Productor B, Marcos Juárez | Zona baja anegada, 73% de cobertura | Amarillo |
| `red` | Productor C, Ataliva | Granizo, 88% de cobertura y contratos 13% debajo del mercado | Rojo |
| `scratch` | Legajo vacío | Para iniciar la conversación desde cero | Depende de la charla |

### Supabase

Tablas principales:

```sql
cases(
  id text primary key,
  name text,
  description text,
  profile jsonb,
  created_at timestamptz
)

referrals(
  id uuid primary key,
  case_id text references cases(id),
  kind text check (kind in ('financing', 'insurance')),
  destination text,
  consent boolean check (consent = true),
  summary jsonb,
  created_at timestamptz
)
```

`cases` tiene lectura pública para la demo. `referrals` tiene RLS activado y no tiene políticas públicas de escritura o lectura: el servidor usa la service role key.

---

## 8. Guion recomendado para presentar la demo

Duración objetivo: 3–4 minutos.

1. Abrir el caso **Desde cero**.
2. Escribir: “Tengo 150 ha de trigo en Ataliva, vendí 360 t a 190 y el jueves me cayó granizo”.
3. Mostrar cómo el agente arma el legajo y completa el panel.
4. Preguntar: “¿Vendo más?”.
5. Explicar que la cobertura ya está cerca del rango pesimista y que no conviene vender sin revisar.
6. Preguntar: “¿Puedo pulverizar el martes?”.
7. Mostrar la ventana basada en clima real.
8. Preguntar: “¿Y si llueven 80 mm más?”.
9. Mostrar el escenario alternativo.
10. Decir: “Necesito financiar la cosecha”.
11. Mostrar el borrador, marcar consentimiento y guardar la derivación.
12. Abrir la vista imprimible.
13. Cerrar mostrando los casos verde y amarillo, para demostrar que el sistema no siempre responde rojo.

### Plan B

- Si falla la IA, el panel de `/api/signals` sigue funcionando.
- Si falla Open-Meteo, entra el caché de respaldo.
- Conviene tener capturas o un video de respaldo de unos minutos.
- No presentar un modelo o dato ilustrativo como si fuera una integración productiva.

---

## 9. Decisiones sobre IA y costos

### AI Gateway

Se eligió Vercel AI Gateway para evitar gestionar claves de proveedores y poder cambiar el modelo con un identificador `provider/model`.

En la cuenta se habilitó el crédito gratuito mensual de AI Gateway. La tarjeta fue requerida para verificación y acceso al crédito, pero cargarla no equivale por sí solo a comprar créditos.

Reglas acordadas para mantener gasto cero:

- no comprar créditos pagos;
- no activar auto top-up o recarga automática;
- usar solamente un modelo marcado como **Free** en el panel de AI Gateway;
- si se llega al límite, aceptar que el chat falle temporalmente con 429 en lugar de hacer fallback automático a un modelo pago;
- no agregar claves de OpenAI, Anthropic, Google u otros proveedores.

### Modelo actual

El modelo por defecto está definido en `lib/agent.ts`:

```ts
nvidia/nemotron-3.5-lightning-free
```

Se probó con una consulta de negocio que requería llamar una herramienta. El modelo:

- llamó correctamente a la herramienta;
- respondió en español;
- calculó correctamente una cobertura cercana al 89%;
- respondió en unos segundos.

La variable opcional `AI_MODEL` puede sobrescribirlo. En Vercel no había una variable `AI_MODEL` cargada, por lo que aplica el default del código.

Claude Haiku 5.5 se había elegido inicialmente por costo bajo, pero el free tier no permitía ese modelo. El cambio a Nemotron evitó comprar créditos y permitió que el chat funcionara en producción.

### Limitaciones del modelo gratuito

- Puede ser menos consistente que Claude, GPT o Gemini.
- Puede razonar en inglés aunque la respuesta final sea en español.
- Puede fallar en conversaciones largas o con muchas herramientas.
- El free tier tiene límites de uso.
- La aplicación debe seguir siendo defendible por sus reglas determinísticas, no por la supuesta inteligencia del modelo.

---

## 10. Seguridad y auditoría realizada

Se auditó el repositorio y el historial de Git buscando:

- archivos `.env` commiteados;
- JWT de Supabase;
- `sb_secret_`;
- claves `sk-`;
- tokens de GitHub;
- claves AWS;
- URLs de Postgres con contraseña;
- claves privadas PEM;
- service role key escrita en el repo.

No aparecieron secretos en los archivos ni en el historial revisado. `.gitignore` excluye archivos `.env*.local`.

La service role key se lee desde variables de entorno en `lib/supabase/admin.ts` y debe permanecer solo del lado servidor.

La etiqueta “Needs Attention” que aparecía en algunas variables de Vercel se interpretó como una recomendación para marcar secretos como sensibles, no como evidencia de filtración. Las variables que debe leer el servidor no se deben copiar al código fuente.

Pendiente recomendado para una versión más madura:

- convertir secretos de producción en variables Sensitive cuando el flujo de desarrollo ya esté estabilizado;
- rotar claves si alguna vez se copiaron a un canal no seguro;
- agregar headers de seguridad;
- limitar el endpoint público de chat para evitar abuso y consumo de créditos.

---

## 11. Vercel, GitHub y despliegue

### Estado

- Repo público: `geomus/surco-ai`.
- Proyecto Vercel: nombre técnico `surco-ai`.
- Team: `geomus-projects`.
- Producción: https://micampo-ar.vercel.app.
- Los dominios anteriores redirigen con 308:
  - `surco-ai-ar.vercel.app`;
  - `estrategia-para-hackaton-shipp.vercel.app`.
- La rama productiva es `main`.
- Los merges a `main` despliegan en Vercel.

El producto se renombró en la interfaz y la documentación de Surco AI a MiCampo. El repo y el proyecto de Vercel conservan el nombre técnico anterior para no arriesgar desconexiones.

### Colaboración

La forma recomendada de trabajo es:

1. cada colaborador importa el repo en su propio chat de v0;
2. cada persona trabaja en su propia rama;
3. se abre un Pull Request contra `main`;
4. se revisa y mergea;
5. Vercel despliega desde `main`.

Esto también permite que otra persona use sus propios créditos de v0 en su propio chat, aunque colabore en el mismo repo de GitHub. No conviene sumarla al mismo equipo/proyecto de v0 si la intención es usar sus créditos personales.

Antes de comenzar una tarea:

- traer los últimos cambios de `main`;
- leer `AGENTS.md`;
- verificar que no haya cambios sin guardar;
- elegir una rama de feature o fix;
- mantener el PR pequeño.

---

## 12. Estado final por fases

| Fase | Estado | Resultado |
| --- | --- | --- |
| 1. Esquema y casos | Completa | Supabase, tablas, RLS y casos cargados |
| 2. Motor de reglas | Completa | Semáforo determinístico y clima con respaldo |
| 3. Agente | Completa | Chat con herramientas y legajo desde cero |
| 4. Panel | Completa como esqueleto | Funciona, pero puede reescribirse visualmente |
| 5. Derivaciones | Implementada | Consentimiento, guardado y vista imprimible |
| 6. Verificación | Parcial | APIs y chat productivo probados; falta recorrido manual completo y mobile |
| 7. Renombre | Implementado | Producto y referencias visibles pasan a MiCampo |
| 8. URL | Implementada | `micampo-ar.vercel.app` activa y URLs viejas redirigen |

---

## 13. Pendientes prioritarios

1. Probar manualmente en navegador todo el guion de demo.
2. Probar responsive/mobile.
3. Verificar que la impresión de `/referral/[id]` se vea bien.
4. Agregar rate limiting para `/api/chat`.
5. Agregar headers de seguridad en `next.config`.
6. Reemplazar el precio fijo por una fuente pública de Rosario con respaldo manual.
7. Integrar NDVI real de Sentinel-2, mostrando fecha y nubosidad.
8. Reemplazar rindes de referencia por datos públicos del MAGyP por departamento.
9. Mejorar la UI sin romper el contrato de datos del cliente.
10. Evaluar integración real con fyo, aseguradoras o financieras solo cuando haya credenciales, contratos y alcance claro.
11. Evaluar volver a un modelo pago únicamente si la demo exige una calidad que el modelo gratuito no alcanza; eso requiere presupuesto explícito.
12. Considerar WhatsApp como fase posterior, no como parte del MVP.

---

## 14. Criterios técnicos para futuros agentes

- Leer primero `AGENTS.md` y este documento.
- No entrenar un modelo propio como primera opción.
- No permitir que el modelo calcule cifras críticas fuera de las herramientas.
- Validar entradas externas con Zod.
- Mantener lógica de negocio en `lib/`.
- Mantener umbrales en `config/rules.ts`.
- Usar Supabase solo desde servidor para operaciones protegidas.
- No exponer `SUPABASE_SERVICE_ROLE_KEY`.
- No usar `localStorage` como persistencia de negocio.
- Agregar `source` a toda señal o dato externo.
- Mantener textos de UI y agente en español rioplatense.
- Mantener identificadores de código en inglés.
- No agregar secretos al repo, screenshots de paneles sensibles ni archivos `.env`.
- No afirmar que NDVI o precio son reales si siguen siendo ilustrativos/manuales.
- No agregar integraciones externas reales sin validar permisos, costo, consentimiento y fallback.
- No hacer push directo a `main`.
- Ejecutar al menos `pnpm exec tsc --noEmit` y recorrer la funcionalidad modificada antes del PR.
- Para mapas geográficos reales usar una librería; el croquis actual no es un mapa.
- Si se cambia AI SDK, leer la documentación instalada en `node_modules/ai/docs/` porque las APIs cambian entre versiones.

---

## 15. Cómo contar el proyecto en una entrevista

### Versión de 30 segundos

> En una hackathon construí MiCampo, un copiloto conversacional para productores agropecuarios argentinos. El usuario describe su situación en lenguaje natural y el sistema arma un legajo, cruza clima, estado del lote, contratos y cobertura, y devuelve un semáforo explicable. La IA no inventa los números: llama herramientas respaldadas por un motor determinístico. También puede preparar, con consentimiento, una carpeta de financiación o seguro. Lo implementé con Next.js, TypeScript, Supabase, Open-Meteo, Vercel AI Gateway y un agente con tool calling.

### Versión de 90 segundos

> El desafío era crear algo útil para el agro sin fingir que entrenábamos un modelo propio en pocas horas. Identificamos que el productor tiene datos dispersos entre el agrónomo, el acopio, el corredor, una planilla y aplicaciones satelitales. Construimos MiCampo como una capa de decisión: el productor escribe una situación, el sistema estructura el legajo y calcula señales con reglas auditables. Open-Meteo aporta clima y geocodificación; los casos de demo contienen valores sintéticos de NDVI, contratos y rindes; Supabase guarda casos y derivaciones; y Vercel AI Gateway aporta el modelo para extraer información, decidir herramientas y explicar resultados. El modelo gratuito usado en producción es Nemotron, pero el resultado crítico viene del motor determinístico. La demo permite mostrar venta, ventanas de labor, riesgo climático y preparación de una solicitud de seguro o financiación con consentimiento. El proyecto quedó desplegado en Vercel y documentado para que otros agentes puedan continuar el trabajo.

### Puntos técnicos demostrables

- Diseño de un MVP bajo presión de tiempo.
- Separación entre razonamiento del modelo y cálculo determinístico.
- Tool calling con AI SDK.
- Validación de esquemas con Zod.
- RLS y separación servidor/cliente en Supabase.
- Integración de una API externa con timeout y caché.
- Modelado de casos sintéticos para una demo reproducible.
- Manejo explícito de consentimiento antes de una derivación.
- Deploy en Vercel y colaboración vía GitHub/PRs.
- Diagnóstico de un problema real de modelo/costo en AI Gateway y migración a un modelo gratuito compatible con herramientas.

---

## 16. Estado de este documento

Este archivo es un resumen narrativo para contexto humano y laboral. Para instrucciones operativas de código, el archivo de referencia principal sigue siendo `AGENTS.md`. Para una descripción breve del producto, consultar `README.md`.

Si un nuevo agente recibe este repo, el orden recomendado es:

1. leer este archivo;
2. leer `AGENTS.md`;
3. leer `README.md`;
4. inspeccionar `lib/engine.ts`, `lib/agent.ts`, `app/api/chat/route.ts` y `components/farm-workspace.tsx`;
5. ejecutar la verificación de TypeScript;
6. abrir la app de producción;
7. recién después proponer cambios.
