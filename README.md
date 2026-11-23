# SleepTrack

[![GitHub Pages](https://img.shields.io/badge/GitHub%20Pages-SleepTrack-6366F1)](https://wolver-fik.github.io/SleepTrack/)

[English](#english) · [Español](#español)

---

## English

A private, offline-first sleep log that runs entirely in your browser. No account, no server, no tracking: your nights stay on your device unless you export them yourself.

### Features

- **Log & Summary** — record bedtime, wake-up time, quality (1–5), awakenings, factors (late caffeine, screens, exercise, stress, alcohol, heavy dinner, nap, noise/heat plus your own) and free-text notes. Live duration feedback and six KPIs: 7- and 30-day averages, quality, awakenings, sleep debt and regularity.
- **Analysis & Patterns** — three SVG charts (hours slept, sleep window, quality & awakenings) with 7/14/30/90-day ranges, weekly/monthly averages, best weekdays and a rules-based pattern engine that detects factor effects, weekday differences, regularity, debt, trends, weekend shift and goal impact.
- **History** — full list with edit/delete, incremental paging, JSON/CSV backup and import, and local storage status.
- **8 languages**: English, Español, Português, Français, Italiano, Deutsch, Русский and 日本語. Automatic detection from `navigator.language`, persisted choice and a language switch in the header. All interface text, KPI labels, chart legends, day/month names, pattern sentences and backup messages are translated.
- **Installable PWA** — web manifest, relative paths for GitHub Pages project sites, standalone display, Network-First service worker for HTML, offline caching for assets and automatic reload when a new version takes control.
- **iOS/Android ready** — `viewport-fit=cover`, safe-area insets on the header, body and dialogs, `100dvh` layout, real PNG icons (180/192/512) plus an SVG source.
- **Built-in example data** on first launch so the dashboard is not empty; it disappears as soon as you save your first night.

### Privacy & license

Everything is stored in `localStorage` on your own device. Nothing is synchronized or uploaded. See the backup section in the app to export JSON or CSV.

Licensed under the **PolyForm Noncommercial License 1.0.0** — see [LICENSE](LICENSE). Copyright (c) 2026 Wolver-Fik. Noncommercial and personal uses are permitted; commercial use is not granted by this license.

---

## Español

Un diario de sueño privado, que funciona sin conexión y corre completamente en tu navegador. Sin cuenta, sin servidor y sin rastreo: tus noches se quedan en tu dispositivo salvo que tú las exportes.

### Características

- **Registro y Resumen** — anota cuándo te acostaste y te levantaste, calidad (1–5), despertares, factores (cafeína tarde, pantallas, ejercicio, estrés, alcohol, cena pesada, siesta, ruido/calor y los tuyos propios) y notas libres. Duración en vivo y seis KPI: promedios de 7 y 30 días, calidad, despertares, deuda de sueño y regularidad.
- **Análisis y Patrones** — tres gráficos SVG (horas dormidas, horario de sueño, calidad y despertares) con rangos de 7/14/30/90 días, promedios semanales/mensuales, mejores días de la semana y un motor de patrones que detecta efectos de factores, diferencias por día, regularidad, deuda, tendencias, cambio de fin de semana e impacto de la meta.
- **Historial** — lista completa con edición y borrado, paginación incremental, copia de seguridad JSON/CSV, importación y estado del almacenamiento local.
- **8 idiomas**: English, Español, Português, Français, Italiano, Deutsch, Русский y 日本語. Detección automática desde `navigator.language`, elección persistida y selector en la cabecera. Están traducidas todas las etiquetas, KPI, leyendas de gráficos, días y meses, frases de patrones y mensajes de copia de seguridad.
- **PWA instalable** — manifiesto web, rutas relativas para proyectos de GitHub Pages, modo standalone, service worker Network-First para HTML, caché offline de recursos y recarga automática al activarse una versión nueva.
- **Preparada para iOS/Android** — `viewport-fit=cover`, zonas seguras en cabecera, cuerpo y diálogos, diseño con `100dvh` e iconos PNG reales (180/192/512) con su SVG de origen.
- **Datos de ejemplo** en el primer arranque para que el panel no esté vacío; desaparecen en cuanto guardas tu primera noche.

### Privacidad y licencia

Todo se guarda en `localStorage` de tu dispositivo. Nada se sincroniza ni se sube a ningún servidor. Usa la sección de copia de seguridad de la app para exportar JSON o CSV.

Licenciado bajo **PolyForm Noncommercial License 1.0.0** — consulta [LICENSE](LICENSE). Copyright (c) 2026 Wolver-Fik. Se permiten usos no comerciales y personales; la licencia no concede uso comercial.
