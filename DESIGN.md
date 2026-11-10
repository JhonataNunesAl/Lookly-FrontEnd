---
name: Lookly
description: Android fashion swipe-feed app dressed as a 1960s-70s mail-order store catalog: cream paper, brown ink, a catalog-red price seal, framed photos and dotted leaders.
colors:
  catalog-paper: "#F3E9D2"
  sheet: "#FBF5E6"
  sheet-2: "#F7EDD6"
  paper-3: "#EADDBB"
  paper-4: "#DACB9F"
  paper-5: "#C2B185"
  seal-red: "#B3261E"
  seal-dark: "#8C1C15"
  seal-soft: "#F1D5CC"
  signal-mustard: "#E3A72F"
  signal-soft: "#F6E2AE"
  ink: "#2B1D12"
  ink-2: "#3C2A1B"
  ink-3: "#503C29"
  ink-4: "#614D38"
  ink-5: "#705B45"
  ink-6: "#A8977C"
  success: "#2F6B3C"
  warning: "#8A5A00"
  info: "#1F4E79"
typography:
  display:
    fontFamily: "DMSerifDisplay_400Regular"
    fontSize: "56px"
    fontWeight: 400
    lineHeight: "58px"
    letterSpacing: "-1px"
  display-sm:
    fontFamily: "DMSerifDisplay_400Regular"
    fontSize: "36px"
    fontWeight: 400
    lineHeight: "40px"
    letterSpacing: "-0.5px"
  headline:
    fontFamily: "DMSerifDisplay_400Regular"
    fontSize: "24px"
    fontWeight: 400
  title:
    fontFamily: "DMSerifDisplay_400Regular"
    fontSize: "20px"
    fontWeight: 400
  subtitle:
    fontFamily: "DMSerifDisplay_400Regular_Italic"
    fontSize: "16px"
    fontWeight: 400
  ref:
    fontFamily: "CourierPrime_400Regular"
    fontSize: "14px"
    fontWeight: 400
  body:
    fontFamily: "Hind_400Regular"
    fontSize: "14px"
    fontWeight: 400
  button:
    fontFamily: "Hind_700Bold"
    fontSize: "16px"
    fontWeight: 700
  label:
    fontFamily: "Hind_600SemiBold"
    fontSize: "12px"
    fontWeight: 600
rounded:
  sm: "2px"
  md: "3px"
  lg: "4px"
  xl: "6px"
  card: "4px"
  hero: "6px"
spacing:
  xs: "8px"
  sm: "12px"
  md: "16px"
  lg: "20px"
components:
  button-primary:
    backgroundColor: "{colors.ink}"
    textColor: "{colors.sheet}"
    typography: "{typography.button}"
    rounded: "{rounded.card}"
    height: "56px"
    padding: "0 20px"
  button-secondary:
    backgroundColor: "{colors.sheet}"
    textColor: "{colors.ink}"
    typography: "{typography.button}"
    rounded: "{rounded.card}"
    height: "56px"
  button-danger:
    backgroundColor: "{colors.seal-red}"
    textColor: "{colors.sheet}"
    typography: "{typography.button}"
    rounded: "{rounded.card}"
    height: "56px"
  button-icon:
    backgroundColor: "{colors.ink}"
    textColor: "{colors.sheet}"
    rounded: "{rounded.lg}"
    size: "48px"
  action-like:
    backgroundColor: "{colors.seal-red}"
    textColor: "{colors.sheet}"
    rounded: "{rounded.card}"
    height: "56px"
  action-secondary:
    backgroundColor: "{colors.sheet}"
    textColor: "{colors.ink}"
    rounded: "{rounded.card}"
    height: "56px"
  chip:
    backgroundColor: "{colors.sheet}"
    textColor: "{colors.ink}"
    rounded: "{rounded.lg}"
    height: "48px"
  chip-selected:
    backgroundColor: "{colors.ink}"
    textColor: "{colors.sheet}"
    rounded: "{rounded.lg}"
    height: "48px"
  piece-row:
    backgroundColor: "{colors.sheet}"
    textColor: "{colors.ink}"
    rounded: "{rounded.card}"
    padding: "12px"
  menu-row:
    backgroundColor: "{colors.sheet}"
    textColor: "{colors.ink}"
    rounded: "{rounded.card}"
    height: "64px"
  field:
    backgroundColor: "{colors.sheet}"
    textColor: "{colors.ink}"
    rounded: "{rounded.card}"
    height: "56px"
  tab-bar:
    backgroundColor: "{colors.sheet}"
    textColor: "{colors.ink-4}"
    height: "72px"
  toast:
    backgroundColor: "{colors.ink}"
    textColor: "{colors.sheet}"
    rounded: "{rounded.card}"
    padding: "12px"
  price-seal:
    backgroundColor: "{colors.seal-red}"
    textColor: "{colors.sheet}"
    size: "96px"
---

# Design System: Lookly

## Overview

**Creative North Star: "Catálogo vintage de loja"**

The app is paged like a 1960s-70s mail-order store catalog. Cream paper carries brown ink; a single catalog red works as the printer's seal on price, photo frame and active state. Each piece is a catalog entry: a framed photograph, a serif name, a typewritten item reference ("Ref. 0001"), a price. Everything is Portuguese copy in sentence case.

Density is moderate and page-like: one entry per screen in the feed, one entry per row elsewhere, never a product grid. Hierarchy comes from the serif display face against small Hind labels, and from rules (a double ink rule under headers, dotted leaders between label and value) rather than from boxes and shadows. Corners are nearly square, as on printed stock.

**Key Characteristics:**
- Paper and ink first; red is a seal, not a button colour.
- Photo sits in a red frame; the price sits in a rotated red circular seal.
- Rules, not shadows: double ink rule under headers, dotted leaders for label-to-value.
- Serif display face for titles, names and every number that matters.
- Item references set in typewriter Courier Prime.
- Status is icon plus text, never colour alone.

## Colors

Warm cream paper, dark brown ink, one catalog red, and mustard held back for dark ink surfaces.

### Primary
- **Catalog Red Seal** (#B3261E; 6.2:1 on paper): price figures, the price seal, the photo frame, the active tab marker and icon, the curtir button and CURTIR stamp, section-header rules, meter fills, count badges. Dark (#8C1C15) and soft (#F1D5CC) steps are defined for pressed and tinted states.
- **Danger** shares the same red hex and fills the destructive button and destructive menu square.

### Secondary
- **Signal Mustard** (#E3A72F): only on dark ink surfaces (numbers and pictograms inside ink tiles, the ink sample-data plate). Soft step (#F6E2AE) is defined, unused.

### Neutral
- **Catalog Paper** (#FBF5E6 sheet over #F3E9D2 page): page ground is the darker paper; cards, rows, fields, tab bar and light text on ink are the sheet. The Tailwind `white` token is remapped to the sheet colour, so there is no pure white.
- **Paper steps** (#F7EDD6, #EADDBB, #DACB9F, #C2B185): sheet-2, photo-unavailable fill and meter tracks (paper-3/4), card hairlines (paper-5).
- **Brown Ink** (#2B1D12; 13:1 on paper): text, buttons, rules, icon squares. Ink 2-5 (#3C2A1B to #705B45) are the secondary text steps (ink-4 6.6:1, ink-5 5.5:1). Ink 6 (#A8977C) is decorative only (inactive icon, fallback glyph), never text.

### Semantic
- **Success** (#2F6B3C), **Warning** (#8A5A00), **Info** (#1F4E79), **Danger** (seal red): status only, always with icon and label.

### Named Rules
**The Red Is A Seal Rule.** Red marks price, photo frame, active state and the single main action (curtir). Buttons and selection are ink, never red; the only red buttons are curtir and destructive.
**The Mustard On Ink Rule.** Mustard appears only on dark ink; never as text or fill on paper.

## Typography

**Display Font:** DM Serif Display (single 400 weight plus Italic; Georgia-class serif fallback)
**Body Font:** Hind (Regular 400, Medium 500, SemiBold 600, Bold 700)
**Label/Mono Font:** Courier Prime (Regular, Bold), for item references

**Character:** A catalog serif for everything that is named or priced, a quiet humanist sans for interface, a typewriter face for stock numbers. DM Serif Display has lining numerals; Playfair was rejected because its old-style numerals read "0" as "o".

### Hierarchy
- **Display** (400, 56px, 58px, -1px): the Lookly wordmark on login (`text-display`).
- **Display-sm** (400, 36px, 40px, -0.5px): prices on the detail sheet and cart total, in red.
- **Headline** (400, 24-30px): screen titles in headers, empty-state titles, feed brand, piece names on the feed (24px) and sheet (30px).
- **Title** (400, 18-20px): piece names in rows (18px), section headers and leader labels (20px), prices in rows (24px, red).
- **Subtitle** (Italic 400, 14-20px): header subtitles, like counts, descriptions, sheet section titles.
- **Ref** (Courier Prime 400, 14px): "Ref. 7F3A", derived from the piece id.
- **Body** (Hind 400-500, 14px): secondary lines and fields (16px Medium).
- **Button** (Hind Bold, 16px): button and action labels.
- **Label** (Hind SemiBold/Medium, 12px): tab labels, meter values, badges.

### Named Rules
**The Display Face Carries Numbers Rule.** Prices, totals, quantities and key figures are set in DM Serif Display (tabular-nums where aligned), not Hind.
**The Family-Per-Weight Rule.** React Native does not synthesise weight for custom fonts: use `font-sans-*`, `font-display-*`, `font-mono*`, never `font-bold`.
**The Font Class Order Rule.** Tailwind orders `font-*` utilities by class name, so `font-sans` would beat `font-display-*`. `Text` therefore adds `font-sans` only when no `font-*` class is present; always import `Text` from `src/components/Text.tsx`.

## Layout

Single column on a paper ground. A screen is a header (safe-area top, min 64dp, title left, back square if nested) closed by the double ink rule, then content, then the tab bar. Horizontal padding is 16-20px; gaps 8-12px; rows separated by 12px. The feed shows one framed photo filling the remaining height, the price seal overlapping its lower right edge, then name, reference and the three action fields. Pieces outside the feed are one row per line (photo 96x128 at left, price right-aligned), never a grid. Panel screens use leader rows (label left, serif figure right) rather than a row of metric cards. Bottom tab bar is full width, 72dp plus the system inset, 3-5 destinations, labels always visible (80px-wide custom items).

## Elevation & Depth

Flat. No shadows are used (tab bar elevation 0). Depth is conveyed by the lighter sheet over the darker page, hairline paper-5 borders, ink rules, and a double-frame around photos. The only layering motion is the toast and sheet rising from below, the card drag, and the price seal fading in.

### Named Rules
**The Rule Not Shadow Rule.** Surfaces are separated by paper tone and printed rules, not by shadow.

## Shapes

Near-square printed-stock corners: 2px (sm: meter bars), 3px (md: badges, small squares), 4px (lg and card: buttons, rows, fields, chips, icon squares), 6px (xl and hero: large cards). The Tailwind radius scale is overridden so `rounded-lg`/`rounded-xl` never become pills. The one round form is the price seal (circle) and the login emblem. Outlined controls use a 2px ink border; hairlines are 1px. Header rule is a 5px double line (2px top, 1px bottom, ink).

## Components

### Buttons
- **Shape:** 4px corners, 56dp tall, 12px gap, 20px horizontal padding, Hind Bold 16px, 2px border of its own fill colour.
- **Primary:** ink fill, sheet label, optional 20px sheet glyph at left. **Secondary:** sheet fill, 2px ink border, ink label. **Danger:** red fill, sheet label (sign out, remove, revoke).
- **Icon:** 48x48 ink square, 22px sheet glyph, requires an accessibility label.
- **States:** press scales to 0.97 and springs back; disabled and loading 50% opacity.

### Framed Photo
Garment photo inside a double frame: 2px red outer border, 4px paper gap, 1px ink inner border (feed and sheet); in rows a 1px ink frame with a 4px sheet mat. Fallback is paper-3 with an outlined shirt glyph and "Foto indisponível". Photos are shown untinted.

### Price Seal
96px circle, red fill, 2px sheet border, rotated -8deg, overlapping the photo's lower right edge; price in DM Serif Display (sheet colour) inside. Fades in with the info swap.

### Swipe action fields
Three equal 56dp fields in a row (Passar, Curtir, Salvar), 4px corners, 2px border: curtir is solid red with sheet label, passar and salvar are sheet with ink border and ink label; each carries a glyph and label.

### Swipe stamps
Rubber-stamp words (CURTIR / PASSAR / SALVAR) in DM Serif Display 30px inside a double frame (4px outer, 1.5px inner), on 90% sheet; red and rotated -8deg for curtir, ink and +8deg for passar.

### Header
Paper ground, title in serif 24px (ink), italic subtitle, optional back square, then the double ink rule (5px).

### Piece row
Sheet card, 4px corners, 1px paper-5 border, 12px padding. Framed thumbnail left; serif name (18px), Courier reference, italic like count; at the bottom a dotted ink-5 rule over the right-aligned red price.

### Dotted leader
Label left, flexible 1px dotted rule (ink-5, or sheet at 60% on ink), value right in serif. Used in the sheet details, cart total and stat board. Section headers use a 2px solid red rule instead, stretching from the serif title to an underlined action.

### Chips and category index
- **Selection chips (forms, feed filter):** 48dp tall, 16px padding, 4px corners; unselected sheet with a hairline, selected solid ink with sheet text (plus a check in forms).
- **Category index (search, catalog):** not buttons: a row of serif words ("Todas · Gótica · Vintage"). Inactive is italic ink-3; the active one is bold red, underlined. It is navigation, so red marks the active entry like the active tab does.
- **Index tabs (search: Peças / Lojas):** two card-file tabs on a 2px ink rule; the open one is the sheet with a 4px red bar on top and joins the strip below, the closed one is recessed (paper-3, ink-4 label). 48-56dp tall, serif 20px.

### Filter sheet
A modal "ficha" rising from the bottom over a 50% ink scrim: paper ground, 2px ink top rule, serif 24px title with an italic count ("2 filtros marcados"), the double ink rule, then sections each opened by a serif title with a red rule (the section-header pattern). Choices: radio rows (24px radio, red when on; bold ink label + italic hint, dotted rule between), fill-in-line price fields with one-tap range chips, size chips in Courier Prime Bold (letters, numbers, único; selected = solid ink), a checkbox row. Fixed footer: secondary "Limpar" + primary "Aplicar". Applied filters sit as removable text tags (ink SemiBold + close glyph) on a paper-2 strip under the category index, with a red underlined "Limpar tudo"; the trigger button turns red and shows the count.

### Menu rows
Sheet row, 64dp, 4px corners, paper-5 hairline, 40px ink square with sheet glyph (danger red for destructive), 16px SemiBold label, red count badge, chevron.

### Inputs / Fields
A fill-in line, like a mail-order coupon: sheet fill, 1px paper-5 hairline on three sides and a 2px ink underline, square corners, 56dp, Hind 16px Medium, placeholder ink-5. The form version (`Campo`) adds a serif 16px label above and an italic hint or a red error below (hairline turns red on error). The old 2px-all-around ink box is retired: it read as a generic template.

### Navigation
Tab bar: sheet fill with a 2px ink top rule and one red bar that slides (and stretches) to the pressed tab. Item: 28px craft-object icon (red when active, ink-4 inactive; outline variant when one exists) over a 12px label (Bold red active, Medium ink-4 inactive). Icons are objects of a catalog shop, not generic UI glyphs: shopper = open catalog book, book with magnifier, price tag with a heart, model comp card; store = storefront with awning, clothes hanger, abacus, rubber stamp. Catalog entries: Catálogo, Busca, Salvos, Perfil.

### Toast
Ink band, 4px corners, sheet SemiBold 14px, 32px red square holding a sheet info glyph; rises 16px with a 220ms fade above the tab bar.

### Data blocks
Leader rows with 30px serif figures (min 56dp), and meter bars (8px paper-4 track, red fill, one colour for all categories). The store panel shows only numbers that exist (pieces, likes, saves, stock); what does not exist yet (sales, views) sits in a dashed-border note card that says so, never a made-up figure.

## Do's and Don'ts

### Do:
- **Do** use red (#B3261E) only for price, photo frame, active state (tab, index tab, category index), the curtir action, errors and section rules.
- **Do** make every other action an ink element with a sheet label; 48dp minimum, 56dp for primary fields.
- **Do** set prices and key figures in DM Serif Display with lining numerals.
- **Do** close each page header with the double ink rule.
- **Do** connect label and value with a dotted leader.
- **Do** write form fields as fill-in lines (`Campo`), and filters as a text index, not a row of bordered buttons.
- **Do** show only real numbers in the store panel; say what is not measured yet.
- **Do** frame the garment photo in red and show it untinted.
- **Do** use the tokens in `tailwind.config.js`, mirrored in `src/theme/colors.ts`, and the `Text` component.
- **Do** pair every status colour with an icon and text.

### Don't:
- **Don't** make a red button other than curtir and destructive actions, or show selection in red.
- **Don't** put mustard on paper.
- **Don't** use pure white; light text on ink or red is the sheet cream (#FBF5E6).
- **Don't** use ink-6 (#A8977C) for text.
- **Don't** use `font-bold`, `font-black` on Hind or mix `font-sans` with another `font-*` class.
- **Don't** add shadows, large radii or pill shapes.
- **Don't** return to a product grid or a row of metric cards.
- **Don't** box inputs in 2px ink borders or make filters look like a button bar: both read as an AI template.
- **Don't** use generic Ionicons for the tab bar; keep the catalog-object glyphs.
- **Don't** rely on colour alone for state.
