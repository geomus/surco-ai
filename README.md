# Surco AI

Copiloto con IA para productores agropecuarios argentinos. Desde una sola conversación cruza clima, satélite (NDVI) y contratos de venta para responder tres preguntas: cuándo entrar al lote, cuánto vender y si conviene armar la carpeta de seguro o financiación.

> Los 3 casos de demo (Pergamino, Marcos Juárez, Ataliva) usan datos sintéticos. El granizo del 22/10/2026 en Ataliva y el pronóstico de Open-Meteo son reales.

## Arquitectura

| Capa | Ruta | Qué hace |
| --- | --- | --- |
| Reglas | `config/rules.ts` | Umbrales auditables (NDVI, cobertura, ventanas de pulverización) |
| Motor | `lib/engine.ts` | Calcula señales verde / amarillo / rojo de forma determinística |
| Agente | `lib/agent.ts` | Agente del AI SDK con herramientas sobre el motor |
| API | `app/api/*` | `chat`, `signals`, `referrals` |
| Datos | Supabase | Tablas `cases` y `referrals` (RLS activado) |
| UI | `components/*` | Esqueleto; se reescribe sin tocar las capas de arriba |

La IA nunca inventa números: el agente llama al motor y explica el resultado. Las derivaciones requieren consentimiento explícito.

## Desarrollo

```bash
pnpm install
pnpm dev
```

Variables necesarias: las de la integración de Supabase (`SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY`, etc.). La IA usa Vercel AI Gateway y no requiere claves en v0 ni en Vercel.

## Cómo colaborar

- Cada persona trabaja en su propia rama (`feat/...`) y abre un Pull Request contra `main`.
- Cada merge a `main` se despliega automáticamente en Vercel.
- Desde v0: [continuar el proyecto](https://v0.app/chat/projects/prj_THcmETzLre1XzWLPvCe1UukKRVgB).
