# 🎨 Wallpaper Positioner — Web Edition

Eine moderne, browserbasierte Bildkompositions- und Wallpaper-Anwendung, 1:1 portiert und optimiert nach dem Vorbild von [Wallpaper Positioner für Linux (Wayland / X11)](https://github.com/Papatin13/Wallpaper_Positioner).

Gebaut mit **HTML5 Canvas**, **Vanilla JavaScript (ES Modules)** und modernem **Libadwaita / Dark-Mode CSS**.

---

## 🌟 Highlights & Funktionen

### 🖥️ Multi-Monitor & Spanned Displays
- **Separate Monitordarstellung:** In *Spanned*-Modus (`HDMI-A-1` 1920×1080 + `DP-1` 2560×1440) werden Bildschirme mit realistischen Gehäusen, abgerundeten Ecken, Highlights, Schatten und Lücken-Trennung visualisiert.
- **Nahtloser Wechsel:** Umschalten zwischen Einzelmonitoren (`DP-1`, `HDMI-A-1`), Gesamtfläche (`🖥️ Alle`) und benutzerdefinierten Dimensionen (`📐 Eigene`).
- **Koordinaten-Persistenz:** Bilder merken sich ihren jeweiligen Bildschirm und bleiben beim Moduswechsel exakt ausgerichtet.
- **Per-Monitor Zuschnitte (Slicing):** Beim Export können entweder das gesamte Wallpaper oder pixelgenaue Slices pro Monitor (als ZIP oder Einzeldateien) heruntergeladen werden.

### ⚡ Dynamische Auto-Anordnung (Auto-Layout)
- **5 Arrangement-Modi:**
  1. **Dynamisch:** Gewichtetes rekursives Binary Space Partitioning (BSP) + Hero-Layouts (größere Bilder erhalten proportional mehr Fläche).
  2. **Raster (Grid):** Gleichmäßiges Raster, angepasst an das Seitenverhältnis des Canvas.
  3. **Reihe (Row):** Horizontale gewichtete Reihe.
  4. **Spalte (Column):** Vertikaler gewichteter Stapel.
  5. **Monitore:** Verteilt Bilder gleichmäßig auf physische Bildschirme.
- **Echtzeit-Schieberegler:** Randabstand (0–300px) und Bildabstand/Gap (0–200px) mit Sofortvorschau und Preset-Chips.
- **Fit vs. Cover:** Umschalten zwischen Erhalt des Seitenverhältnisses und Ausfüllen der Zelle.

### 🖼️ Bildrahmen, Eckenrundung & 3D-Schlagschatten
- **Rahmen:** Konfigurierbare Dicke (0–100px), Farbauswahl und Presets (*Weiß, Schwarz, Akzent, Gold*).
- **Eckenrundung:** Sanfte Radien von 0px bis 200px.
- **Realistische Drop Shadows:** Gaußscher Weichzeichner (Blur 1–100px), Deckkraft, X/Y-Versatz und Schattenfarbe.
- **Schatten-Presets:** *Dezent*, *Standard*, *Schwebend (Floating 3D)* und *Glow*.
- **Stilvererbung:** Neue Bilder übernehmen automatisch aktive Einstellungen; Button *„Stil auf alle Bilder anwenden“* überträgt Einstellungen auf bestehende Ebenen.

### 🖱️ Interaktiver Canvas & Multi-Auswahl
- **Transform-Gizmo:** 8 Skalierungsgriffe + Rotationsgriff mit Verbindungsstiel und Winkelanzeige.
- **Gummiband-Auswahl (Rubberband):** Ziehen auf leerem Canvas wählt alle berührten Ebenen aus.
- **Gruppenmanipulation:** Gleichzeitiges Verschieben, Drehen, Skalieren oder Löschen aller ausgewählten Ebenen.
- **Viewport:** Zoom mit Mausrad (am Cursor zentriert), Pan mit mittlerer Maustaste oder `Leertaste + Ziehen`.

### 🎨 Farb-Engine & Dominante Farbpalette
- **Automatische Farbanalyse:** Extrahiert die dominanten Farbtöne der platzierten Bilder mittels Pixelquantisierung und Wahrnehmungsabstand.
- **Hintergrund an Bild anpassen:** Wählt per Klick einen harmonischen, dunklen Desktophintergrundton.
- **Farbchips:** Direkter Klick auf ein Paletten-Farbfeld setzt den Canvas-Hintergrund.

### 📋 Zwischenablage & Drag & Drop
- Bilder direkt per **Drag & Drop** auf das Fenster ziehen.
- Screenshots oder kopierte Bilder direkt mit **`Strg+V`** einfügen.

### 💾 Projektdateien (`.wpp`) & Sitzungswiederherstellung
- 100% kompatibel mit dem `.wpp`-Format der Desktop-App.
- Eingebettete Bilddaten für vollständige Portabilität.
- Automatische Speicherung der Sitzung im Browser (`localStorage`), inkl. Begrüßungs-Toast bei Wiederherstellung.

### 🌐 Zweisprachig (Deutsch & Englisch)
- Sofortiger Sprachwechsel über den Menü-Button.

---

## ⌨️ Tastaturkürzel

| Aktion | Tastenkürzel |
| :--- | :--- |
| **Projekt speichern** | `Strg+S` |
| **Projekt öffnen** | `Strg+O` |
| **Neues Projekt** | `Strg+N` |
| **Wallpaper exportieren** | `Strg+E` |
| **Aus Zwischenablage einfügen** | `Strg+V` |
| **Alles auswählen** | `Strg+A` |
| **Auswahl aufheben** | `Esc` |
| **Ausgewählte löschen** | `Entf` / `Backspace` |
| **Feinjustierung (Nudge)** | `Pfeiltasten` (mit `Umschalt` für 10px) |
| **Zoom** | `+`, `-`, `0` (Einpassen) |
| **Verschieben (Pan)** | `Mittlere Maustaste` oder `Leertaste + Ziehen` |

---

## 🚀 Lokale Ausführung

```bash
cd /home/lennart/.gemini/antigravity-ide/scratch/wallpaper-positioner-web
npm run dev
```

Browser aufrufen: **http://localhost:5173/**
