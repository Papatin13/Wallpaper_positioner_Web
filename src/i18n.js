/**
 * Internationalization (i18n) for Wallpaper Positioner Web
 * Supports German (de) and English (en) with live language switching.
 */

export const TRANSLATIONS = {
  de: {
    // App & HeaderBar
    app_title: "Wallpaper Positioner",
    new_project: "Neues Projekt (Strg+N)",
    open_project: "Projekt öffnen (Strg+O)",
    save_project: "Projekt speichern (Strg+S)",
    add_images: "Bilder hinzufügen",
    paste_clipboard: "Aus Zwischenablage einfügen (Strg+V)",
    zoom_out: "Verkleinern (-)",
    zoom_fit: "Einpassen (0)",
    zoom_in: "Vergrößern (+)",
    export_wallpaper: "Exportieren...",
    set_wallpaper: "Als Wallpaper setzen",
    toggle_sidebar: "Seitenleiste umschalten",
    main_menu: "Hauptmenü",
    load_demo: "Demo-Collage laden",
    reset_canvas: "Canvas zurücksetzen",

    // Status Overlay
    tip_drag_drop: "Tipp: Bilder per Drag & Drop auf das Canvas ziehen oder Strg+V drücken",
    zoom_label: "Zoom",
    images_count: "{count} Bild",
    images_count_plural: "{count} Bilder",
    selected_count: "{count} ausgewählt",
    no_selection: "Keine Auswahl",

    // Monitor Section
    section_monitor: "BILDSCHIRM & AUFLÖSUNG",
    spanned_title: "Nebeneinander: {subs}",
    spanned_area: "Gesamtfläche: {w} x {h} px",
    spanned_boundary: " • Lücke/Trennung bei x={boundary}px",
    mon_switch_all: "🖥️ Alle",
    mon_switch_custom: "📐 Eigene",
    custom_res_title: "EIGENE CANVAS-AUFLÖSUNG",
    width_short: "B:",
    height_short: "H:",
    swap_dimensions_tip: "Breite und Höhe vertauschen (Quer- / Hochformat)",
    presets_label: "Presets:",
    apply_custom_res: "Auflösung anwenden",

    // Canvas Background & Colors
    section_bg: "CANVAS HINTERGRUNDFARBE",
    pick_color: "Farbe wählen:",
    match_bg_to_image: "Hintergrund an Bild anpassen",
    match_bg_tip: "Passt die Hintergrundfarbe an die stärkste Hauptfarbe der Bilder an",
    dominant_colors: "Hauptfarben der Bilder:",
    recalc_palette: "Farbpalette neu aus Bildern extrahieren",
    always_auto_adapt: "Immer automatisch anpassen:",

    // Layout & Spacing
    section_layout: "LAYOUT & AUTO-ANPASSUNG",
    layout_desc: "Alle Bilder automatisch im Canvas anordnen:",
    mode_dynamic: "Dynamisch",
    mode_grid: "Raster",
    mode_row: "Reihe",
    mode_col: "Spalte",
    mode_monitors: "Monitore",
    mode_random: "Zufall",
    btn_arrange_random: "Zufällig",
    toast_arranged_random: "Bilder zufällig angeordnet 🎲",
    tip_mode_dynamic: "Dynamische Flächenaufteilung (größere Bilder erhalten mehr Platz)",
    tip_mode_grid: "Gleichmäßiges Raster (Zeilen und Spalten)",
    tip_mode_row: "Bilder nebeneinander in einer Reihe",
    tip_mode_col: "Bilder untereinander in einer Spalte",
    tip_mode_monitors: "Bilder gleichmäßig auf Bildschirme aufteilen",
    margin_label: "Randabstand (Canvas):",
    gap_label: "Bildabstand (Zwischenraum):",
    cover_label: "Zelle ganz ausfüllen (Cover):",
    snap_magnetic_label: "Magnetisches Einrasten (Snap):",
    snap_magnetic_hint: "Bilder docken beim Ziehen an anderen Bildern & Kanten an",
    title_snap_active: "Magnetisches Einrasten aktiv (Alt halten zum freien Bewegen)",
    title_snap_inactive: "Magnetisches Einrasten inaktiv (Klicken zum Aktivieren)",
    toast_snap_enabled: "Magnetisches Einrasten aktiviert 🧲",
    toast_snap_disabled: "Magnetisches Einrasten deaktiviert",
    btn_layout_apply: "Bilder jetzt anordnen",

    // Selected Image & Style
    section_selected: "AUSGEWÄHLTES BILD",
    section_selected_multi: "{count} Bilder ausgewählt (Mehrfachauswahl)",
    no_layer_selected: "Kein Bild ausgewählt",
    pos_x: "X:",
    pos_y: "Y:",
    size_w: "B:",
    size_h: "H:",
    rotation_label: "Drehung:",
    opacity_label: "Deckkraft:",
    btn_reset_rotation: "Drehung auf 0° zurücksetzen",

    // Border & Style
    section_border: "BILDRAHMEN & STIL",
    border_width: "Rahmen-Dicke:",
    border_none: "Kein Rahmen",
    border_classic: "Klassisch (8px)",
    border_color: "Rahmen-Farbe:",
    border_radius: "Eckenrundung:",
    color_white: "Weiß",
    color_black: "Schwarz",
    color_accent: "Akzent",
    color_gold: "Gold",

    // Shadow
    section_shadow: "SCHLAGSCHATTEN & 3D-EFFEKT",
    enable_shadow: "Schatten aktivieren:",
    shadow_blur: "Weichzeichner (Blur):",
    shadow_opacity: "Deckkraft:",
    shadow_offset_x: "Versatz X:",
    shadow_offset_y: "Versatz Y:",
    shadow_color: "Schatten-Farbe:",
    shadow_preset_subtle: "Dezent",
    shadow_preset_standard: "Standard",
    shadow_preset_floating: "Schwebend",
    shadow_preset_glow: "Glow",
    apply_style_all: "Stil auf alle Bilder anwenden",
    style_hint: "Neue Bilder übernehmen automatisch die aktuellen Rahmen- und Schatteneinstellungen.",

    // Quick Align & Order
    quick_align: "SCHNELL-AUSRICHTUNG",
    center_label: "Zentrieren",
    fit_label: "Einpassen",
    fill_label: "Ausfüllen",
    layer_order: "EBENEN-REIHENFOLGE",
    layer_bring_front: "Ganz nach vorn",
    layer_step_forward: "Ebene vor",
    layer_step_backward: "Ebene zurück",
    layer_send_back: "Ganz nach hinten",
    layer_delete: "Ausgewählte löschen",
    layer_overview: "EBENEN-ÜBERSICHT",

    // Export Modal
    export_title: "Wallpaper exportieren",
    export_desc: "Lade das fertige Wallpaper in nativer Auflösung herunter oder speichere separate Zuschnitte für jeden Monitor.",
    export_single_btn: "Gesamtes Wallpaper herunterladen (PNG)",
    export_slices_btn: "Monitor-Zuschnitte herunterladen (ZIP)",
    copy_clipboard_btn: "In Zwischenablage kopieren",
    set_wallpaper_instructions: "Als Wallpaper einrichten:",
    set_wallpaper_hyprland: "Hyprland / Wayland: Mit `hyprpaper`, `swww` oder `awww` anwenden.",
    set_wallpaper_gnome: "GNOME / KDE: Rechtsklick auf heruntergeladene Datei → 'Als Schreibtischhintergrund festlegen'.",
    set_wallpaper_windows: "Windows: Rechtsklick auf die Datei → 'Als Desktophintergrund festlegen'.",

    // Toast Messages
    toast_project_loaded: "Projekt erfolgreich geladen ({count} Bilder)",
    toast_project_saved: "Projekt als .wpp gespeichert",
    toast_session_restored: "Letzte Sitzung wiederhergestellt ({count} Bilder)",
    toast_copied_clipboard: "Wallpaper in Zwischenablage kopiert!",
    toast_demo_loaded: "Demo-Collage geladen!",
    toast_wallpaper_exported: "Wallpaper erfolgreich exportiert!",
    toast_slices_exported: "Monitor-Zuschnitte exportiert!",
    toast_screen_detected: "Bildschirm erkannt: {w} × {h} px",
    empty_title: "Keine Bilder hinzugefügt",
    empty_hint: "Tippen oder Bilder ablegen",
    btn_detect_screen: "Bildschirmauflösung automatisch erkennen",
    confirm_new_project: "Neues Projekt anlegen? Alle aktuellen Ebenen werden gelöscht.",
  },
  en: {
    // App & HeaderBar
    app_title: "Wallpaper Positioner",
    new_project: "New Project (Ctrl+N)",
    open_project: "Open Project (Ctrl+O)",
    save_project: "Save Project (Ctrl+S)",
    add_images: "Add Images",
    paste_clipboard: "Paste from Clipboard (Ctrl+V)",
    zoom_out: "Zoom Out (-)",
    zoom_fit: "Fit to View (0)",
    zoom_in: "Zoom In (+)",
    export_wallpaper: "Export...",
    set_wallpaper: "Set as Wallpaper",
    toggle_sidebar: "Toggle Sidebar",
    main_menu: "Main Menu",
    load_demo: "Load Demo Collage",
    reset_canvas: "Reset Canvas",

    // Status Overlay
    tip_drag_drop: "Tip: Drag & drop images onto the canvas or press Ctrl+V",
    zoom_label: "Zoom",
    images_count: "{count} image",
    images_count_plural: "{count} images",
    selected_count: "{count} selected",
    no_selection: "No selection",

    // Monitor Section
    section_monitor: "MONITOR & RESOLUTION",
    spanned_title: "Spanned: {subs}",
    spanned_area: "Total Area: {w} x {h} px",
    spanned_boundary: " • Gap/Separation at x={boundary}px",
    mon_switch_all: "🖥️ All",
    mon_switch_custom: "📐 Custom",
    custom_res_title: "CUSTOM CANVAS RESOLUTION",
    width_short: "W:",
    height_short: "H:",
    swap_dimensions_tip: "Swap width and height (Landscape / Portrait)",
    presets_label: "Presets:",
    apply_custom_res: "Apply Resolution",

    // Canvas Background & Colors
    section_bg: "CANVAS BACKGROUND COLOR",
    pick_color: "Pick color:",
    match_bg_to_image: "Match Background to Image",
    match_bg_tip: "Sets canvas background to harmoniously match dominant image color",
    dominant_colors: "Dominant Image Colors:",
    recalc_palette: "Recalculate dominant color palette",
    always_auto_adapt: "Always adapt automatically:",

    // Layout & Spacing
    section_layout: "LAYOUT & AUTO-ARRANGE",
    layout_desc: "Automatically arrange all images on canvas:",
    mode_dynamic: "Dynamic",
    mode_grid: "Grid",
    mode_row: "Row",
    mode_col: "Column",
    mode_monitors: "Monitors",
    mode_random: "Random",
    btn_arrange_random: "Random",
    toast_arranged_random: "Images randomly arranged 🎲",
    tip_mode_dynamic: "Dynamic space allocation (larger images receive proportionally more area)",
    tip_mode_grid: "Balanced rows and columns",
    tip_mode_row: "Side-by-side arrangement in a row",
    tip_mode_col: "Vertical stack in a column",
    tip_mode_monitors: "Evenly divide images across physical monitors",
    margin_label: "Canvas Margin:",
    gap_label: "Image Spacing (Gap):",
    cover_label: "Fill entire cell (Cover):",
    snap_magnetic_label: "Magnetic Snapping (Smart Guides):",
    snap_magnetic_hint: "Images snap to other images and canvas edges when dragged",
    title_snap_active: "Magnetic snapping active (Hold Alt to move freely)",
    title_snap_inactive: "Magnetic snapping inactive (Click to enable)",
    toast_snap_enabled: "Magnetic snapping enabled 🧲",
    toast_snap_disabled: "Magnetic snapping disabled",
    btn_layout_apply: "Arrange Images Now",

    // Selected Image & Style
    section_selected: "SELECTED IMAGE",
    section_selected_multi: "{count} images selected (Multi-Selection)",
    no_layer_selected: "No image selected",
    pos_x: "X:",
    pos_y: "Y:",
    size_w: "W:",
    size_h: "H:",
    rotation_label: "Rotation:",
    opacity_label: "Opacity:",
    btn_reset_rotation: "Reset rotation to 0°",

    // Border & Style
    section_border: "BORDER & FRAME",
    border_width: "Border Thickness:",
    border_none: "No Border",
    border_classic: "Classic (8px)",
    border_color: "Border Color:",
    border_radius: "Corner Radius:",
    color_white: "White",
    color_black: "Black",
    color_accent: "Accent",
    color_gold: "Gold",

    // Shadow
    section_shadow: "DROP SHADOW & 3D EFFECT",
    enable_shadow: "Enable Shadow:",
    shadow_blur: "Blur Radius:",
    shadow_opacity: "Opacity:",
    shadow_offset_x: "Offset X:",
    shadow_offset_y: "Offset Y:",
    shadow_color: "Shadow Color:",
    shadow_preset_subtle: "Subtle",
    shadow_preset_standard: "Standard",
    shadow_preset_floating: "Floating",
    shadow_preset_glow: "Glow",
    apply_style_all: "Apply style to all images",
    style_hint: "New images automatically inherit current border and shadow settings.",

    // Quick Align & Order
    quick_align: "QUICK ALIGN",
    center_label: "Center",
    fit_label: "Fit",
    fill_label: "Fill",
    layer_order: "LAYER ORDER",
    layer_bring_front: "Bring to Front",
    layer_step_forward: "Bring Forward",
    layer_step_backward: "Send Backward",
    layer_send_back: "Send to Back",
    layer_delete: "Delete Selected",
    layer_overview: "LAYERS OVERVIEW",

    // Export Modal
    export_title: "Export Wallpaper",
    export_desc: "Download high-resolution wallpaper or generate separate cropped slices for each physical monitor.",
    export_single_btn: "Download Full Wallpaper (PNG)",
    export_slices_btn: "Download Monitor Slices (ZIP)",
    copy_clipboard_btn: "Copy to Clipboard",
    set_wallpaper_instructions: "Set as active desktop wallpaper:",
    set_wallpaper_hyprland: "Hyprland / Wayland: Apply with `hyprpaper`, `swww` or `awww`.",
    set_wallpaper_gnome: "GNOME / KDE: Right click downloaded image → 'Set as Wallpaper'.",
    set_wallpaper_windows: "Windows: Right click file → 'Set as Desktop Background'.",

    // Toast Messages
    toast_project_loaded: "Project loaded successfully ({count} images)",
    toast_project_saved: "Project saved as .wpp",
    toast_session_restored: "Restored last session ({count} images)",
    toast_copied_clipboard: "Wallpaper copied to clipboard!",
    toast_demo_loaded: "Demo collage loaded!",
    toast_wallpaper_exported: "Wallpaper exported successfully!",
    toast_slices_exported: "Monitor slices exported!",
    toast_screen_detected: "Screen detected: {w} × {h} px",
    empty_title: "No images added",
    empty_hint: "Tap or drop images to add",
    btn_detect_screen: "Auto-detect screen resolution",
    confirm_new_project: "Start new project? All current layers will be cleared.",
  }
};

let currentLang = (typeof navigator !== "undefined" && navigator.language && navigator.language.startsWith("de")) ? "de" : "en";

export function getLanguage() {
  return currentLang;
}

export function setLanguage(lang) {
  if (TRANSLATIONS[lang]) {
    currentLang = lang;
    localStorage.setItem("wp_language", lang);
    document.dispatchEvent(new CustomEvent("language-changed", { detail: { lang } }));
  }
}

// Check saved language
if (typeof localStorage !== "undefined") {
  const saved = localStorage.getItem("wp_language");
  if (saved && TRANSLATIONS[saved]) {
    currentLang = saved;
  }
}

export function tr(key, params = {}) {
  const dict = TRANSLATIONS[currentLang] || TRANSLATIONS.en;
  let text = dict[key] || TRANSLATIONS.en[key] || key;
  for (const [k, v] of Object.entries(params)) {
    text = text.replace(new RegExp(`\\{${k}\\}`, "g"), v);
  }
  return text;
}
