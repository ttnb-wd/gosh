# GOSH application visual migration

## Audit completed before implementation

`scripts/ui-audit.cjs` parsed all 102 interface source files (30 page files), their JSX controls and component imports. API handlers, Firebase modules, server guards, validation and database utilities are outside the presentation migration.

### Public routes

- [x] `/` — editorial home, featured fragrances, announcement, promotions, collections, testimonials, cart.
- [x] `/products` — responsive product grid, brand/category/collection filters, search query handling, sizes, promotional prices, quick view, bag.
- [x] `/promotions` — promoted product grid, countdown, sizes, quick view, bag.
- [x] `/about`, `/contact` — brand story, contact/testimonial forms, rating select, newsletter, feedback.
- [x] `/login` (including `?mode=signup`), `/register` (existing redirect), `/admin/login`.
- [x] `/verify-email`, `/forgot-password`, `/reset-password`, `/auth/action` (existing action redirects).
- [x] `/account`, `/account/security`, `/orders`, `/checkout` — protected account, password change, history, payment methods/upload, order confirmation overlay.
- [x] `/privacy`, `/terms`, `/refund-policy`, `/delivery-policy` — shared policy layout.
- [x] Root/admin error boundaries, global error, loading and not-found presentation.

Product detail, cart and order confirmation are existing overlays, not separate URL routes. Collections/categories are existing product filters/query parameters. There are no standalone inventory, search, profile, change-password or sign-up routes; these are represented by the existing screens above.

### Admin routes and nested workflows

- [x] `/admin` — eight statistics, summary, shortcuts, order/payment/category breakdowns, stock watch, six operational actions.
- [x] `/admin/products` — perfume/accessory management, search/filter, pagination, add/edit dialog, image uploads, notes, sizes, product promotions, delete confirmation.
- [x] `/admin/promotions` — product promotion manager, product picker, computed price, start/end calendars, activation, edit/delete. Also audit the retained banner promotion manager even though it is not mounted by this route.
- [x] `/admin/orders` — order/payment filters, pagination, detail cards, status selectors, payment proof overlay, action feedback.
- [x] `/admin/customers` — filters/sort, responsive rows, pagination, customer detail modal.
- [x] `/admin/brands` — create/edit, activation, search, responsive rows, deletion.
- [x] `/admin/announcements` — banner/image/link, upload, date/time controls, activation, edit/delete.
- [x] `/admin/messages` — filters, read/replied actions, loading/empty/error.
- [x] `/admin/testimonials` — search, edit/rating, publish/hide/delete, save/cancel states.
- [x] `/admin/settings` — store/contact/social, payment, delivery and policy settings; validation, save/reset feedback.
- [x] Shared protected shell, responsive sidebar, header, notification/profile menus, admin error and unauthorized/loading states.

### Shared presentation inventory

- [x] Semantic colors, contrast, surfaces, borders, shadows, radii, typography, spacing, focus, reduced motion.
- [x] Public header/account menu/mobile dialog, announcement, bottom navigation, footer.
- [x] Buttons, text/email/password/number/search/date/time inputs, textarea, native/custom selects, comboboxes, checkboxes, radios, uploads, switches.
- [x] Product cards, size menus, quick view, cart drawer, checkout/confirmation, badges, countdowns.
- [x] Admin grids/tables, row actions, sorting, pagination, tabs, status selects, calendars, modal forms, confirmations.
- [x] Toasts, inline success/error/info/warning, error boundaries, empty states, skeletons/spinners.
- [x] Retained but currently unmounted editorial components and banner promotion controls.

### Findings before migration

Bright yellow utility classes and hardcoded gold/black colors appear throughout admin and client states. Generic blue/purple status colors, oversize pill controls, layered dark-theme overrides, glow shadows, animated blur, repeated size-dropdown implementations, browser alerts/confirmations, and a moving image-card marquee remain. The current studio stylesheet applies selector-based patches to many legacy classes instead of a semantic component system. Homepage pointer movement and sidebar scroll state add avoidable work. No custom wheel interception or smooth-scroll library was found.

## Verification

Final evidence is recorded below.

### Implementation coverage

The final inventory covers **30 page files and 109 interface sources**, including route wrappers, overlays, retained editorial components, and error states. Redirect-only routes retain their existing redirects and receive the new UI at their destinations.

| Area | Migrated routes and workflows |
| --- | --- |
| Storefront | `/`, `/products`, `/promotions`, `/about`, `/contact` |
| Product discovery | Existing brand/category/collection/query filtering, promotional prices, decant menus, responsive grid, product quick view, cart drawer |
| Authentication | `/login`, `/login?mode=signup`, `/register`, `/verify-email`, `/forgot-password`, `/reset-password`, `/auth/action`, `/admin/login` |
| Customer | `/account`, `/account/security`, `/orders`, `/checkout`; payment details, proof upload and order confirmation overlays |
| Policies | `/privacy`, `/terms`, `/refund-policy`, `/delivery-policy` |
| Administration | `/admin`, `/admin/products`, `/admin/promotions`, `/admin/orders`, `/admin/customers`, `/admin/brands`, `/admin/announcements`, `/admin/messages`, `/admin/testimonials`, `/admin/settings` |
| Admin workflows | Perfume/accessory add/edit/delete, brand linking, product promotions, banner promotions, image uploads, date/time controls, activation, order/payment statuses, customer details, notification/account menus, settings reset |
| System states | Root, admin and global error boundaries; branded not-found page; authentication/loading/unauthorized states |

### Shared components migrated

- **Foundation:** `design-system.css`, `globals.css`, `studio.css`, scoped datepicker stylesheet, light/dark semantic palette, typography, spacing, focus, radii, shadows and responsive rules.
- **Navigation:** Navbar, MarqueeBanner, Footer, MobileBottomNav, AdminSidebar, AdminHeader, account and notification popovers, native mobile navigation dialogs.
- **Controls:** StudioButton/StudioLink, StudioSelect, PremiumSelect, PremiumStatusSelect, DateTimePicker, connected labels, inputs, textareas, search, number/date/time controls, checkboxes/radios, file/image uploads, tabs and pagination.
- **Products and editorial:** ProductSection, ProductCardWithPromotion, PromotionProductsSection, FeaturedProducts, QuickViewModal, CartDrawer, Hero, ScentStorytelling, BrandIntroduction, BrandStory, CollectionsNavigation, CollectionPreview, ArtisanPerfumeShowcase, IngredientShowcase, ScentQuiz, WhyChooseUs, LuxuryStats, PromoSection, PromotionBanner, Testimonials, Newsletter, FinalCTA, ContactSection and PolicyPage.
- **Admin data:** StatCard, ProductManager, BrandManager, OrdersTable, AnnouncementManager, ProductPromotionManager, retained PromotionManager, customer/message/testimonial/settings panels, responsive rows, badges and StudioRowActions.
- **Feedback and authentication:** AuthShell, LogoutButton, LoadingScreen, StudioLoading/skeletons, StudioModal, StudioFeedback/toasts/native confirmations, StudioTooltips, StudioErrorText, existing error boundaries, Turnstile container, consolidated payment-icon adapters.
- **Motion:** Reveal/FadeReveal/SlideReveal, StaggerGroup, GradientText/AnimatedGradientText, HoverLift, AnimatedDivider and PageHeaderReveal, with reduced-motion support.

### Remaining legacy UI

The final source audit finds **zero old palette utility matches, zero native `<select>` controls, and zero browser `alert()`/`confirm()` calls** in application interfaces. Browser-default action tooltips were replaced with the shared warm tooltip layer, with accessible descriptions and keyboard dismissal. No remaining legacy theme component was identified. Official payment images, QR codes, product data, uploaded assets and legacy-brand data labels remain because they are business/media content. Black in image masks represents opacity, not a UI palette color.

Two unreferenced visual components were removed after checking imports: `LuxuryHeroEffects` and the obsolete image-card `BrandMarqueeSlider`. The unused local product-card/dropdown implementation was removed, size menus were consolidated, and one-time migration scripts were deleted. Retained unmounted components were themed rather than blindly removed.

### Performance changes

- Native scrolling remains immediate; no wheel/touch interception or smooth-scroll library was found or introduced.
- Removed homepage mouse-tracking springs, the admin sidebar scroll-state listener, reveal blur and broad backdrop blur.
- Replaced duplicated moving product image cards with a static responsive grid and a lightweight typography marquee.
- Consolidated product reveals around the shared viewport primitive; entrances run once with short capped delays.
- Dropdown position listeners exist only while a menu is open; scroll/resize updates are passive and coalesced into one animation frame.
- Removed continuous rotating/pulsing checkout decorations and reduced hover movement.
- Kept responsive Next.js image sizing and lazy loading below the fold; admin thumbnails use explicit dimensions and lazy loading.
- Continuous decorative CSS motion pauses when the page is hidden. Promotion rotation skips hidden-page updates. Reduced motion disables marquee/gradient motion and minimizes transitions.

### Test evidence

| Verification | Result |
| --- | --- |
| TypeScript | `npx tsc --noEmit` passed |
| Changed-file lint | 88 TSX files plus seven UI audit/review scripts passed; zero errors or warnings |
| Production build | `npm run build` passed, including Next's TypeScript and route generation |
| Authentication regression suite | All 44 existing tests passed: sessions, verification, password reset, logout, roles, protected redirects, validation and friendly errors |
| Business-call comparison | AST comparison with the pre-migration snapshot found unchanged API calls/payloads, database calls, validation calls and authentication calls |
| Real production pages | 72 page views at 390, 768, 1440 and 1920 px; zero page errors and zero document/body overflow |
| Protected routes | All 14 unauthenticated customer/admin routes redirected to their existing login destinations |
| Auth action/registration routes | Existing registration and email-action redirect destinations checked |
| Isolated UI preview | 72 sample-data page views at the same four widths; zero page errors and overflow |
| Component states | 15 loading/empty/error views, disabled/error form controls, selected/open dropdowns, success toast, calendar, product editor, native confirmation and mobile admin navigation |
| Overlays | 24 views: product detail, bag, customer detail, row actions, product deletion and payment details at four widths; keyboard and scroll restoration passed |
| Product/promotion actions | In-memory product create/status/edit/delete-cancel, promotion status/edit/price calculation/delete-cancel, discounted decant bag price (14,400 MMK), quantity update and payment dialog passed |
| Tooltips | Mouse/keyboard hints, accessible descriptions, Escape dismissal and viewport fitting passed at all four widths |
| Accessibility | Mouse, touch, arrows/Home/End/typeahead support, Enter/Escape/Tab behavior, focus containment/restoration, selected listbox semantics and disabled choice checked |
| Motion/scroll | Native wheel moved the page 500 px; scroll behavior `auto`; reduced-motion marquee animation `none`; hidden-page animation `paused` |

Review scripts are outside the application route tree. Their Firebase/auth replacements and sample records are confined to a local, isolated preview; they are never used by production routes. No live order, customer, product or promotion was written during verification.

**Verification limits:** Live Firebase sign-in, email delivery and authenticated production writes were not exercised. Backend network access is restricted in this environment; production data reads can remain loading or fall back. These limits do not affect the successful build, source-preservation comparison, auth regression suite, route redirects or isolated UI/action checks. Screen-reader semantics were inspected, but a human screen-reader session and a production scroll benchmark were not performed.

Screenshots and JSON results are saved in the task's `gosh-review` visualization folder. Repeat the read-only inventory with `node scripts/ui-audit.cjs`; run the isolated sample preview with `node scripts/ui-fixture-preview.cjs`, followed by the `ui-fixture-audit`, `ui-action-review` and `ui-overlay-review` scripts. The preview uses bundled Playwright and installed Edge for browser checks; it does not require a production account.
