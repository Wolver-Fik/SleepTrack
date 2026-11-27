# SleepTrack

[![GitHub Pages](https://img.shields.io/badge/GitHub%20Pages-SleepTrack-6366F1)](https://wolver-fik.github.io/SleepTrack/)

[English](#english) · [Español](#español)

---

## English

A private, offline-first sleep log that runs entirely in your browser. No account, no server, no tracking: your nights stay on your device unless you export them yourself.

---

### Features

- **Log & Summary** — record bedtime, wake-up time, quality (1–5), awakenings, factors (late caffeine, screens, exercise, stress, alcohol, heavy dinner, nap, noise/heat plus your own) and free-text notes. Live duration feedback and six KPIs: 7- and 30-day averages, quality, awakenings, sleep debt and regularity.
- **Analysis & Patterns** — three SVG charts (hours slept, sleep window, quality & awakenings) with 7/14/30/90-day ranges, weekly/monthly averages, best weekdays and a rules-based pattern engine that detects factor effects, weekday differences, regularity, debt, trends, weekend shift and goal impact.
- **Habit–rest correlation analysis** — discover which factors actually affect your sleep duration and quality.
- **Visual monthly calendar** — browse every night on a month grid with quality and duration at a glance.
- **Quick notes on waking** — capture a short thought the moment you wake up without opening the full log form.
- **Monthly & yearly comparison** — compare averages and trends across months and years to see long-term change.
- **History** — full list with edit/delete, incremental paging, JSON/CSV backup and import, and IndexedDB storage status.
- **Energy, caffeine & screens** — log morning energy, caffeine time and screen minutes per night; JSON backups include `schemaVersion`, `appId`, the export date and these fields, and imports reject other apps' backups without erasing nights.
- **60fps history** — charts are limited to the selected 7/14/30/90-day range and the history shows 20 nights with a "show more" pager.
- **8 languages**: English, Español, Português, Français, Italiano, Deutsch, Русский and 日本語. Automatic detection from `navigator.language`, persisted choice and a language switch in the header. All interface text, KPI labels, chart legends, day/month names, pattern sentences and backup messages are translated.
- **Installable PWA** — web manifest, relative paths for GitHub Pages project sites, standalone display, Network-First service worker for HTML, offline caching for assets and automatic reload when a new version takes control.
- **iOS/Android ready** — `viewport-fit=cover`, safe-area insets on the header, body and dialogs, `100dvh` layout, real PNG icons (180/192/512) plus an SVG source.
- **Built-in example data** on first launch so the dashboard is not empty; it disappears as soon as you save your first night.

---

### Privacy, storage & license

Your nights, goal and custom factors are stored on your own device in **IndexedDB** (`sleeptrack_db`), the primary store. `localStorage` does not hold sleep records: it only keeps the auxiliary demo flag (`sleeptrack-v1-demo-off`) and, separately, the language choice (`sleeptrack-lang`). Nothing is synchronized or uploaded.

**Export & restore.** In **History → Backup** you can export a JSON file containing every night, the goal, custom factors and a `schemaVersion`. To restore, paste that JSON into the import box: the app checks its origin and dates, replaces the current nights with those in the file, and reports success only after IndexedDB confirms the write. If the write fails, the previous state is restored. CSV is a read-only export for spreadsheets and cannot be imported back.

**If you clear site data.** IndexedDB, localStorage and the service-worker cache all belong to this site's origin. Clearing browsing/site data (or using a private window that closes) permanently removes your saved nights; the built-in example data reappears on the next launch. Export a JSON backup beforehand if you want to restore them later on the same or another device. Updating the app only refreshes cached assets: it does not delete IndexedDB records.

Licensed under the **PolyForm Noncommercial License 1.0.0** — see [LICENSE](LICENSE). Copyright (c) 2026 Wolver-Fik. Noncommercial and personal uses are permitted; commercial use is not granted by this license.

---

## Español

Un diario de sueño privado, que funciona sin conexión y corre completamente en tu navegador. Sin cuenta, sin servidor y sin rastreo: tus noches se quedan en tu dispositivo salvo que tú las exportes.

---

### Características

- **Registro y Resumen** — anota cuándo te acostaste y te levantaste, calidad (1–5), despertares, factores (cafeína tarde, pantallas, ejercicio, estrés, alcohol, cena pesada, siesta, ruido/calor y los tuyos propios) y notas libres. Duración en vivo y seis KPI: promedios de 7 y 30 días, calidad, despertares, deuda de sueño y regularidad.
- **Análisis y Patrones** — tres gráficos SVG (horas dormidas, horario de sueño, calidad y despertares) con rangos de 7/14/30/90 días, promedios semanales/mensuales, mejores días de la semana y un motor de patrones que detecta efectos de factores, diferencias por día, regularidad, deuda, tendencias, cambio de fin de semana e impacto de la meta.
- **Análisis de correlaciones entre hábitos y descanso** — descubre qué factores afectan realmente a la duración y calidad de tu sueño.
- **Calendario visual mensual** — recorre cada noche en una cuadrícula mensual con calidad y duración de un vistazo.
- **Notas rápidas al despertar** — guarda una idea breve justo al despertar sin abrir el formulario completo.
- **Comparación mensual y anual** — contrasta promedios y tendencias entre meses y años para ver los cambios a largo plazo.
- **Historial** — lista completa con edición y borrado, paginación incremental, copia de seguridad JSON/CSV, importación y estado del almacenamiento en IndexedDB.
- **Energía, cafeína y pantallas** — anota la energía al despertar, la hora de cafeína y los minutos de pantalla por noche; el JSON incluye `schemaVersion`, `appId`, la fecha de exportación y estos campos, y la importación rechaza copias de otra app sin borrar tus noches.
- **Historial a 60 fps** — los gráficos se limitan al rango elegido (7/14/30/90 días) y el historial muestra 20 noches con paginador «Ver más».
- **8 idiomas**: English, Español, Português, Français, Italiano, Deutsch, Русский y 日本語. Detección automática desde `navigator.language`, elección persistida y selector en la cabecera. Están traducidas todas las etiquetas, KPI, leyendas de gráficos, días y meses, frases de patrones y mensajes de copia de seguridad.
- **PWA instalable** — manifiesto web, rutas relativas para proyectos de GitHub Pages, modo standalone, service worker Network-First para HTML, caché offline de recursos y recarga automática al activarse una versión nueva.
- **Preparada para iOS/Android** — `viewport-fit=cover`, zonas seguras en cabecera, cuerpo y diálogos, diseño con `100dvh` e iconos PNG reales (180/192/512) con su SVG de origen.
- **Datos de ejemplo** en el primer arranque para que el panel no esté vacío; desaparecen en cuanto guardas tu primera noche.

---

### Privacidad, almacenamiento y licencia

Tus noches, tu meta y tus factores personalizados se guardan en tu dispositivo en **IndexedDB** (`sleeptrack_db`), que es el almacenamiento principal. `localStorage` no contiene registros de sueño: solo conserva la bandera auxiliar de demostración (`sleeptrack-v1-demo-off`) y, aparte, la preferencia de idioma (`sleeptrack-lang`). Nada se sincroniza ni se sube a ningún servidor.

**Exportar y restaurar.** En **Historial → Copia de seguridad** puedes exportar un JSON con todas las noches, la meta, los factores personalizados y un `schemaVersion`. Para restaurar, pega ese JSON en el cuadro de importación: la app valida su origen y sus fechas, reemplaza las noches actuales por las del archivo y solo anuncia éxito cuando IndexedDB confirma la escritura. Si la escritura falla, se restaura el estado anterior. El CSV es una exportación de solo lectura para hojas de cálculo y no se puede volver a importar.

**Si borras los datos del sitio.** IndexedDB, localStorage y la caché del service worker pertenecen al origen de esta web. Borrar los datos de navegación/del sitio (o usar una ventana privada que se cierra) elimina permanentemente tus noches guardadas; en el siguiente arranque vuelven a aparecer los datos de ejemplo. Exporta antes un JSON si quieres recuperarlas después en este o en otro dispositivo. Actualizar la app solo renueva los recursos en caché: no borra los registros de IndexedDB.

Licenciado bajo **PolyForm Noncommercial License 1.0.0** — consulta [LICENSE](LICENSE). Copyright (c) 2026 Wolver-Fik. Se permiten usos no comerciales y personales; la licencia no concede uso comercial.
