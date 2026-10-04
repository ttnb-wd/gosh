# GOSH homepage visual direction

This iteration changes only the public homepage presentation. The new styles require the `.homepage-luxury` wrapper and are imported by `app/page.tsx`. Existing changes from the previous redesign have been preserved.

## Visual system

A warm cream campaign with sculptural fragrance imagery, fine gold detailing, glass surfaces, and amber-to-rose-to-plum light. The hero pairs light sans-serif uppercase typography with a large italic serif signature. Compact discovery panels, scent ribbons, tinted product cards, and an atmospheric closing panel carry the palette down the page.

The hero is original CSS and SVG: a faceted glass perfume bottle, metallic cap, translucent amber liquid, a rounded light field, gold orbits, curved scent trails, an amber orb, a rose glass droplet, and small particles. It does not use the old hero image or a raster hero asset.

| Color | Homepage token | Hex |
| --- | --- | --- |
| Warm cream | `--home-cream` | `#FBF6ED` |
| Champagne | `--home-champagne` | `#E9CC92` |
| Gold | `--home-gold` | `#B18A49` |
| Amber | `--home-amber` | `#C58545` |
| Bronze | `--home-bronze` | `#94613F` |
| Muted rose | `--home-rose` | `#B97883` |
| Soft plum | `--home-plum` | `#795675` |
| Peach | `--home-peach` | `#EDBF9E` |
| Dark brown text | `--home-ink` | `#3F302A` |

The visible accent treatments include moving headline color, metallic CTA surfaces, amber/plum hero lighting, tinted glass navigation, three discovery-panel colors, filled/outlined scent ribbons, four product-card tints, collection panels, and the rose/plum closing gradient.

## Animation and interaction

- **Tier 1:** headline gradient at 280% background size with a nine-second cycle; continuous 38-second brand strip; a floating bottle with 18px vertical travel and four degrees of rotation; one subtle particle-group animation.
- **Tier 2:** 650–750ms fade/upward/scale reveals with short stagger delays; hero entrance; a one-time SVG scent-line draw; two scent ribbons at different speeds. Hero and scent motion pause outside the viewport; CSS animations pause when the tab is hidden.
- **Tier 3:** CTA light sweep, arrow movement, navigation underline, product lift and image zoom, product light sweep and shifting gradient edge, and small collection-icon rotation.
- Navigation compresses, becomes more opaque, and gains stronger shadow and border when scrolling.
- Scrolling remains native with `scroll-behavior: auto`. There is no scroll interception or animation-frame scroll loop.
- Reduced-motion preferences disable continuous animation and reveal transforms while preserving readable content and color.

## Components available for later reuse

Located in `components/homepage/HomepageVisuals.tsx`:

- `HomepageHero`: campaign composition and animated headline.
- `FragranceSculpture`: internal original SVG/CSS decorative artwork.
- `HomeLink`: internal metallic/secondary CTA presentation.
- `HomepageAtmosphere`: brand strip, reveal observation, and motion visibility management.
- `HomepageIntroduction`: rose, amber, and plum discovery-note panels.
- `HomepageScentStory`: contrasting filled/outlined scent ribbons.
- `HomepageFinale`: atmospheric closing campaign panel.

The existing Navbar, FeaturedProducts, PromotionBanner, CollectionsNavigation, BrandStory, Testimonials, Footer, and CartDrawer remain in use. Their source files and behavior were not changed in this iteration. Homepage CSS adjusts the presentation of the visible homepage sections.

## Performance choices

- No new libraries, canvas, WebGL, hero-image requests, or external font requests.
- Continuous motion primarily uses transforms; headline color uses one small background-position animation.
- Six hero particles on desktop, three on mobile; particles move as one group.
- One navigation backdrop blur, one bottle drop shadow, and a brief hero entrance blur. Atmospheric fields are radial gradients.
- IntersectionObserver drives reveals and viewport motion; MutationObserver discovers asynchronously rendered product cards without changing their fetch.
- Reveals run once, interaction effects activate on hover, and continuous effects pause off screen or in hidden tabs.
- Four product cards per row on desktop and two on mobile; product images retain the existing responsive image behavior.

## Review and scope

Browser review covers desktop at 1440×900, tablet at 768×1024, mobile at 390×844, and narrow mobile at 320px. The hero, gradient changes over time, glass navigation, native scrolling, viewport reveals, menu dismissal, reduced motion, and product hover/crop/grid behavior were inspected.

The local browser could not reach Firestore. The real homepage was inspected directly, and data-dependent product, promotion, and review presentation was additionally inspected with isolated synthetic records in a temporary review harness. These records are not included in the application and do not write to the database.

Validation: TypeScript (`tsc --noEmit`), ESLint for the changed TSX files, and the production build. Browser review found no uncaught page errors or horizontal overflow at the reviewed widths. A file-hash comparison against the beginning of this iteration confirms that `app/page.tsx` is the only pre-existing source file modified; the visual component, scoped stylesheet, and this review note are new files.

No Firebase, authentication, API, database, routing, role, product, promotion, cart, checkout, or server authorization logic was changed. No other page has been migrated to this visual system. Homepage approval is the next step.
