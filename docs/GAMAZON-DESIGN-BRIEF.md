# Gamazon — product UI redesign and implementation handoff

Prepared 8 October 2026. This document is self-contained: paste it into a design tool or give it to a product designer. Optional reference screenshots are listed at the end.

## 1. The assignment

Redesign **Gamazon’s signed-in web application** into a distinctive, polished, usable product. The current version works as a prototype but looks too much like a generic AI-generated dashboard. Reconsider composition, typography, density, navigation, and components; do not simply recolour the current layout.

The public landing page already has an appealing cinematic direction: near-black backgrounds, warm cream, restrained bronze, expressive typography, and large game screenshots. Carry its character into the product while making everyday browsing, posting, and messaging clear and fast. The product should feel related to the landing page, without turning every screen into a promotional poster.

**Produce a complete design specification and interactive prototype that another developer can recreate. Do not build or deploy the application in this task.**

Priority order:

1. Community feed, discovery, listing detail, and posting.
2. Messages, members, profiles, collections, and wishlist.
3. Notifications, settings, reporting, and administrator screens.
4. Sign-in, sign-up, and verification screens as supporting flows.

Keep the existing landing page as the visual reference. Do not redesign it unless necessary to maintain a coherent brand.

## 2. What the product does

Gamazon is an invite-only community where adults find physical console games and connect with people who own them. Members can offer a game, ask for a game, discuss a post, message one another, and independently arrange a purchase, swap, or loan.

Core journey:

**Join → browse/search → inspect a compatible physical copy → comment or message → arrange an exchange → owner updates availability → optionally confirm the outcome privately.**

Supported families: PlayStation, Xbox, and Nintendo. Exact console model and physical format matter. A game being in someone’s collection does not mean it is available to exchange.

Roles:

| Role | Access |
| --- | --- |
| Visitor | Landing page, sign-in/sign-up, public guidelines and privacy information |
| Active member | Community content, profiles, collections, connections, conversations they participate in |
| Administrator | Member capabilities plus invitations, reported material, moderation decisions, and aggregate pilot metrics |
| Suspended/non-member | No access to private community content; a clear access state and appropriate next action |

The local app currently contains demo data. Production email authentication and other managed services require configuration. Design realistic live-product states; demo-switching controls belong only to a preview, not the main product experience.

## 3. Boundaries to preserve

- Physical games only: discs, cartridges, and supported physical game-key cards. No account listings, credential sharing, digital account access, or paid rental solicitation.
- No cart, checkout, payments, escrow, deposits, delivery tracking, booking calendar, or automated return penalties.
- No public star ratings, verified-seller badges, or guarantees about identity, condition, or fulfilment.
- No general social posts, public activity leaderboard, group chat, or recommendation algorithm.
- Profiles, posts, photos, and comments are for active members. Exact addresses and precise locations are not public profile fields.
- Friendship is optional for responding to a listing. A non-friend gets one initial message request; further messages require acceptance.
- Blocking stops new direct contact and hides blocked content for the blocker. Do not imply that blocking deletes every historical record.
- Moderators see reported items and submitted context, not an unrestricted browser of private inboxes.
- Outcomes are private self-reports. Two participants confirming an exchange does not verify its quality or payment.

Do not add capabilities merely to make mockups look complete. If you propose a new feature, label it **optional / requires implementation**, outside the main deliverable.

## 4. Visual direction and explicit preferences

Aim for an intentional gaming publication crossed with a useful community marketplace: confident, quiet, well organised, and recognisably about games.

Existing reference palette, not mandatory final tokens:

| Role | Reference |
| --- | --- |
| Main background | Near-black green, approximately `#0B0E0C` |
| Raised surfaces | Approximately `#141814` |
| Main text | Warm cream, approximately `#F0E9DC` |
| Accent | Muted bronze, approximately `#CBB28C` |
| Secondary text | Approximately `#A9ADA2`; adjust for contrast |
| Current typefaces | Italiana for display headings, Outfit for interface text; alternatives welcome |

Retain the atmosphere, but improve readability and hierarchy. Reserve expressive type for moments that benefit from it. Game titles, form labels, and messages need excellent legibility. Do not make every heading oversized or every control a pill.

Avoid:

- Generic dashboard templates, decorative statistic tiles in the member feed, repetitive rounded cards, and excessive empty space.
- Neon gamer clichés, glass effects everywhere, heavy gradients, ornamental controller graphics, and excessive badges.
- Tiny bronze text, low-contrast metadata, and long walls of instructions.
- Decorative horizontal rules across the interface. Use spacing, alignment, and surface contrast for grouping; necessary control boundaries and focus indicators are welcome.
- A prominent “Bengaluru local community” banner, city selector, or city-based brand lockup. Keep neighbourhood information where it helps an exchange; do not hardcode one city into the identity.
- Marketing jargon, vague trust claims, or implementation explanations in normal user flows.

Do not reintroduce the removed landing-page “How it works,” “Before you join,” or “Game imagery, not live listings” sections/caption. Keep useful contextual compatibility and privacy information where users need it.

The landing screenshot gallery already rotates every four seconds and has no visible motion toggle. Preserve that if showing the landing reference. Do not introduce auto-moving content into forms, the feed, or conversations. Respect reduced-motion accessibility preferences for decorative transitions.

## 5. Information architecture and shared shell

Current public routes: `/`, `/signin`, `/signup`, `/guidelines`. The signed-in application lives at `/community`; its current sections switch within that route. The design can improve navigation labels and grouping without depending on new backend features.

Required destinations:

- Community feed.
- Discover/browse games.
- Messages, with unread indication.
- Members/connections. The current “My connections” screen actually includes other community members too; resolve that naming mismatch.
- My games: own profile, owned collection, wishlist, and own posts.
- Another member’s profile.
- Notifications.
- Account/settings and community guidelines.
- Community admin, visible only to administrators.

Shared shell elements: Gamazon home link, active navigation state, title search, current user/avatar, notifications count, access to settings, and mobile navigation. Search currently has a `/` keyboard shortcut; retain an accessible keyboard path, with the shortcut optional in the visual treatment.

A desktop sidebar and mobile drawer exist today; these are not fixed design requirements. Choose navigation that makes frequent actions reachable without crowding the content. Do not bury messaging or posting. Show the desktop and mobile navigation fully expanded as well as closed.

## 6. Screen-by-screen inventory

### A. Community feed and game discovery

Required elements:

- Page identity and a clear “Create post” action.
- Chronological posts, newest first; community-wide or connections-only scope.
- Search by game title.
- Platform family filters: All, PlayStation, Xbox, Nintendo.
- Additional filters: offer/wanted, neighbourhood, and open/paused/closed/all availability. Open is the current default.
- Visible selected filters and an obvious way to clear them.
- Result count and a way to load additional posts.
- Empty/no-results state with a practical next action.

The current feed and discovery share a listing component and filters. They can share a design or be consolidated if the core tasks remain clear. A small member-discovery area exists today but need not occupy a permanent right column. Any exchange guidance should be compact and contextual.

**Listing summary component:**

| Content | Requirement |
| --- | --- |
| Game | Full title, allowing long names |
| Media | Actual copy photo when present; honest, well-designed no-photo fallback otherwise |
| Type | Offer or wanted |
| Compatibility | Platform family, exact console model/generation, physical format |
| Condition | Like new, good, fair, or any condition for applicable wanted posts |
| Location and author | Approximate area, member identity/avatar, post age |
| Availability | Open, paused, closed; distinguish from offer/wanted |
| Price | Optional asking price in INR; missing price is not automatically free |
| Discussion | Short excerpt and comment count/link |
| Interaction | Clear path into details and owner profile |

Offer a convincing layout with real variation: portrait case photo, landscape photo, missing photo, wanted post, long title, no price, and closed listing. Avoid giant repetitive placeholders. Do not use a three-dot overflow icon for an action that only opens details.

### B. Listing detail and discussion

Show game title, type, status, photos, platform, exact model, format, condition, asking price when present, full description, neighbourhood, owner, and post age.

Compatibility must be visible **before contact**:

- Disc-drive requirement for discs.
- Exact cartridge/card and console compatibility.
- Download/internet requirement when applicable.
- Content depending on a redemption code; no guarantee that redeemed DLC transfers.

Other member’s view: message owner, open profile, report post, read discussion, and comment/reply when the listing is open.

Owner’s view: change status between open/paused/closed, add photos, delete post, and participate in discussion. Full listing editing is not currently implemented; do not silently depend on it.

Comments: author/avatar, body, timestamp, edited marker, one level of replies, reply composer with cancel, own comment edit/delete, and reporting someone else’s comment. Paused/closed posts retain their discussion but do not accept new comments in the current flow.

Design unavailable/removed-post state and a return path. Choose a desktop detail page, panel, or dialog deliberately; mobile must handle long content and comments without awkward nested scrolling.

### C. Create a post

All existing fields must have a home:

| Field | Values / limits |
| --- | --- |
| Post type | A game to offer / a game I’m looking for |
| Game title | Required, up to 100 characters |
| Platform | PlayStation / Xbox / Nintendo |
| Console model | Required, up to 40 characters; e.g. PS5, Xbox Series X, Nintendo Switch |
| Physical format | Disc / Cartridge / Game-key card; show compatible choices clearly |
| Condition | Like new / Good / Fair / Any condition |
| Neighbourhood | Required, up to 60 characters; defaults to member’s area |
| Asking price | Optional INR amount, 0–100,000; no rental pricing units |
| Description | Required, up to 2,000 characters |
| Download requirement | Checkbox |
| Redemption-code dependency | Checkbox |
| Photo | Optional JPEG, PNG, or WebP upload of the actual copy |

Disc-drive requirements are derived from format. The design can make wanted posts less cumbersome without removing the underlying compatibility data. Do not require a catalogue integration or automatic title lookup.

Show default, filled, field error, submitting, upload failure, and published states. If a post is created but its photo fails, let the user understand what succeeded and retry the image without creating a duplicate post. Specify cancel/close behaviour and handling of unsaved input. A camera/file-picker affordance on phones should use native capabilities.

### D. Members and connections

Member item: avatar/initials, display name, neighbourhood, short bio, consoles, view profile, and relationship action.

Relationship variants: no connection → request sent; incoming request → accept/decline; connected → message/unfriend. Provide access to report and block on the member profile. Friendship is mutual; do not introduce followers or follower counts.

Distinguish incoming requests from ordinary member browsing. No-results/empty-connections state should point back to discovering members or games.

### E. Own profile, another profile, collection, and wishlist

Profile content: display name, avatar, bio, approximate area, consoles, favourite genres, optional gaming handle, owned collection, wishlist, and posts.

- Own profile: edit profile, settings, add game, remove shelf item, create post, open own listings.
- Other profile: message, relationship actions, report/block, view collection and posts.
- Clearly separate **owned**, **wanted on wishlist**, and **actively offered**. Never infer availability from ownership.
- Shelf item: game title, platform family, owned/wishlist category; remove action for its owner.
- Add-game form: title, platform, and collection/wishlist destination.
- Empty collection/wishlist/posts states and long collection behaviour.

Edit-profile fields: display name (60 characters), bio (500), neighbourhood (60), optional handle (60), consoles, genres, and profile colour. Current avatars are coloured initials; photo-avatar upload is not implemented. Selectable chips or accessible multivalue inputs may replace the current comma-separated text fields without introducing a new game catalogue service.

Do not rely on a large decorative profile cover; there is no cover-upload feature today.

### F. Messaging and message requests

Desktop: conversation list and active conversation. Mobile: list and conversation as separate views with a clear back action. Preserve composer access when the keyboard opens.

Conversation list: other member, avatar, last-message preview, unread state/count, and pending request status. Active conversation: member identity, optional linked-listing preview, chronological message history with times, compose/send, and block/report access.

Required states:

- No conversations; no conversation selected.
- Initial message to a connection.
- One initial request to a non-friend; recipient can accept or decline.
- Sender waiting for acceptance, with further sending unavailable.
- Accepted conversation, declined request, and blocked/unavailable member.
- Sending, send failure with retry, loading older history, and reconnection.
- Linked listing closed, removed, or unavailable.

Message text is limited to 2,000 characters. No attachments, reactions, calls, typing indicators, or read receipts are required. Do not imply read receipts merely because the app tracks unread messages internally.

Report action applies to an individual received message. The reporting flow must make clear which item and explanation are submitted to moderators.

For listing-related conversations, include a small optional private outcome prompt: “Did you exchange this game?” → Yes / Not yet. Show the member’s response without turning it into a booking, review, or public achievement. Do not present the other person’s private answer in chat.

### G. Notifications

List of comment replies, accepted connections, and messages; unread styling, timestamp, destination, and empty state. Opening an item marks it read and takes the user to the relevant place. Include an unavailable-target fallback.

Notifications are in-app. Do not add email-marketing settings, push-subscription flows, or notification categories that do not exist.

### H. Settings, privacy, and safety

- Privacy summary with guidelines/privacy link.
- Blocked-members list and unblock action; do not expose profile information no longer available.
- Sign out.
- Authenticator setup and verification for admin-sensitive actions: QR code, numeric code, setup success/failure, and verification-required state.
- Delete account: concise explanation, explicit destructive styling, typed `DELETE` confirmation, submitting/error/success states. The final administrator cannot delete their account until administration is transferred; provide a clear explanation rather than inventing a transfer UI.
- Current retention text: profile, listings, and authored messages are removed; report evidence may remain for 90 days. Do not expand this into claims about instant deletion of every backup.
- Report form shared by posts, comments, profiles, and individual messages: target context, “What happened?” (up to 1,000 characters), submit, success/error.
- Clear block, unfriend, delete, and moderation confirmation patterns where an action has meaningful consequences.

Guidelines need readable document styling, not another feed card: physical games, no accounts/paid rentals/counterfeits, accurate descriptions, harassment/scams, safe meetings, public personal information, reporting, and privacy/retention. Preserve the substantive policy; this is a visual and interaction redesign, not legal-policy authoring.

### I. Administrator workspace

Keep admin tools visually related but separate from the member experience.

- Aggregate metrics: members, posts, exchanges confirmed by both participants, and one-sided confirmations. Plain labels; distinguish these from transaction verification.
- Report queue: reported entity type, reason, submitted evidence/context, date, open/resolved state.
- Decision form: required note (up to 1,000 characters), dismiss report / remove content / suspend member, apply action, confirmation, success/error.
- Moderation history: action, decision note, date, and available attribution.
- Invitations: email, expiry, redeemed/revoked state, revoke action.
- Create invitation: recipient email → generate single-use code → copy code shown once. Invitations currently expire after seven days and are bound to that verified email. They are shared manually; do not imply an invitation-email service.
- Empty queues, expired invitation, copied-code feedback, and admin verification/access errors.

Do not create an unrestricted private-message search or extra analytics panels.

### J. Authentication and access

Sign in: email → emailed numeric verification code → community. No password or password-reset screen.

Sign up: email, display name, neighbourhood, invitation code, 18+ declaration, and rules/privacy acceptance → email verification → invitation acceptance → community.

Supporting states: wrong/expired verification code, resend with one-minute cooldown, change email, invalid/expired/reused invitation, verified email awaiting valid invitation, pending submission, service error, suspended access, and session expiry. Public links return to the landing page or switch sign-in/sign-up.

An unconfigured demo uses a plainly labelled preview state and a demo-entry link. Do not make this the primary production design.

## 7. Reusable component and state library

Deliver named, reusable components with variants, not separately drawn copies on every screen:

| Family | Components / variants |
| --- | --- |
| Shell | Desktop navigation, mobile navigation, page header, search, user menu, notification indicator |
| Actions | Primary, secondary, text, icon-only, destructive; default, hover, focus, pressed, disabled, busy |
| Inputs | Text, email, number, textarea, select, checkbox, multivalue input, upload; helper text, required, invalid, disabled |
| Game content | Listing summary, detail media, no-photo fallback, platform/format metadata, availability, offer/wanted, shelf item |
| People | Avatar/initials, member item, identity row, relationship controls |
| Conversation | Conversation preview, request panel, incoming/outgoing message, composer, listing context, private outcome prompt |
| Discussion | Comment, single-level reply, edit state, composer, report action |
| Feedback | Inline error, transient success notice, empty state, skeleton/loading, retry, unavailable/access-denied state |
| Overlays | Dialog/panel/sheet, menu, confirmation, notification list; open/close/focus behaviour |
| Administration | Report item, evidence excerpt, decision controls, invitation row/code result, audit entry |

Use text labels as well as colour for important states. Do not use one green dot to mean platform, availability, unread, and online presence. Online presence is not a required feature.

## 8. Responsive and accessibility requirements

- High-fidelity frames at 1440px desktop and 390px mobile; define tablet behaviour around 768–1024px and minimum supported width of 320px.
- Specify layout widths, gutters, spacing scale, columns, image aspect ratios, text wrapping/truncation, and breakpoints.
- No horizontal page overflow. Tables must have an intentional mobile equivalent. Horizontal media browsing may be deliberate, with clear controls.
- Aim for WCAG AA contrast: 4.5:1 for normal text, 3:1 for large text and meaningful control boundaries. Check actual colour pairs.
- Comfortable touch targets, preferably at least 44×44px. Form inputs must remain readable on phones.
- Visible keyboard focus, logical tab order, persistent field labels, accessible icon names, and errors associated with inputs.
- Dialogs need focus containment, Escape close where appropriate, focus return, and a visible close control. Long forms must scroll without losing their action path.
- Show selected/disabled/loading/error states, not just ideal populated screens.
- Motion should be restrained and purposeful. Specify duration/easing and a reduced-motion equivalent. No decorative motion in message history.

## 9. Content and imagery for mockups

Use fictional but realistic Indian member names and approximate neighbourhoods; avoid hardcoding city branding. Format money as INR, e.g. `₹1,800`.

Suggested examples, solely for design testing:

| Example | Purpose |
| --- | --- |
| Red Dead Redemption 2 — PS4 disc, good, ₹1,800 | Offer with actual-copy photo and asking price |
| The Witcher 3: Wild Hunt — Complete Edition — PS4 disc | Long title; code-dependent extras; no price |
| The Legend of Zelda: Breath of the Wild — Nintendo Switch cartridge | Wanted post with no physical-copy photo |
| The Last of Us Part II — PS4 disc, paused | Unavailable-for-now state |
| Days Gone — PS4 disc, closed | Closed listing with retained discussion |

Include one empty profile, one long bio, multiple console tags, a long message, a long unbroken string, and a removed listing referenced in chat. Do not copy timestamp-suffixed automated test data into the final mockups.

Official promotional screenshots of The Witcher 3, RDR2, The Last of Us, GTA V, GTA VI, and Days Gone exist for the landing page. They are brand atmosphere, not evidence of a member’s physical copy. Do not manufacture availability or hardware-compatibility claims from these assets. Keep promotional imagery and member uploads distinguishable without restoring the removed marketing caption.

## 10. Interactive prototype requirements

Connect these journeys end to end:

1. Discover an open compatible game → inspect details → comment/reply → message owner.
2. Create an offer with compatibility fields/photo → publish → view own post → pause or close it.
3. Discover a member → send connection request → show incoming/accepted variants → view collection.
4. Send a non-friend message request → recipient accepts → continue chatting → optionally record private exchange outcome.
5. Add an owned game and a wishlist item → show that neither automatically creates an offer.
6. Report a post/message → admin reviews submitted evidence → applies a documented decision.
7. Sign up with an invitation → verify email → handle an invalid invitation → join successfully.
8. Open settings → block/unblock example → demonstrate delete-account confirmation without actual deletion.

Include at least one recoverable error and one empty state in the prototype. Prototype destructive actions using fictional data only.

## 11. Required return package

Return enough information that a developer can reproduce the design rather than guess from one screenshot:

1. **Editable design file or inspectable share link**, with access enabled, named screens, reusable components, and variants.
2. **Desktop and mobile exports** of every primary screen and key overlay/state, at their specified dimensions. Include full content views where necessary, not only hero crops.
3. **Clickable prototype** covering the journeys above, with clear starting points.
4. **Design tokens** as a table or JSON: semantic colours, typography family/weight/size/line-height, spacing, radii, borders, shadows, z-index layers, and motion values.
5. **Layout specifications**: grids, widths, breakpoints, sticky behaviour, overflow, image sizing/cropping, truncation, and mobile keyboard/composer behaviour.
6. **Component specifications**: variants, interactions, focus/hover/disabled/busy/error states, and content constraints.
7. **Final UI copy**, including empty states, errors, confirmation text, labels, and short contextual help.
8. **Exported assets**: SVG icons/logos, optimised raster assets, font names/files where permitted, and source/licence notes. Avoid essential assets locked inside screenshots.
9. **Change notes**: navigation changes, merged screens, renamed actions, any required frontend behaviour changes, and optional features clearly separated from the implementation scope.
10. **Coverage checklist** mapping sections A–J to frames, including owner/other-member/admin views. Mark omissions explicitly.

Do not return only a moodboard, a landing-page redesign, a single attractive feed mockup, or opaque generated code. The deliverable must explain how the entire product works across screens and states.

## 12. Acceptance criteria for the redesign

- Users can identify a game’s platform, format, availability, and owner quickly.
- Posting and contacting someone each have an obvious action path.
- Owned games, wanted games, and available offers cannot be confused.
- The app feels related to the cinematic landing page but supports dense, everyday use.
- Navigation, component hierarchy, and spacing look deliberately designed rather than assembled from a generic dashboard template.
- Phone layouts are designed, not merely desktop columns stacked vertically.
- The existing functional and privacy boundaries survive the redesign.
- A developer can recreate the result without inventing missing behaviour or visual specifications.

## 13. Optional reference material from the existing project

These paths are for the person preparing the handoff. The design tool will not automatically have access to local files; attach selected references separately if useful. Treat them as an inventory and mood reference, not a layout to trace.

| Reference | Project-relative path |
| --- | --- |
| Landing, desktop/mobile | `artifacts/landing-desktop.png`, `artifacts/landing-mobile.png` |
| Feed | `artifacts/community-desktop-feed.png`, `artifacts/community-mobile-feed.png` |
| Members | `artifacts/community-desktop-members.png`, `artifacts/community-mobile-members.png` |
| Profile and collection | `artifacts/community-desktop-profile.png`, `artifacts/community-mobile-profile.png` |
| Messages | `artifacts/community-desktop-messages.png`, `artifacts/community-mobile-messages.png` |
| Admin | `artifacts/community-desktop-admin.png`, `artifacts/community-mobile-admin.png` |
| Add-game dialog | `artifacts/community-desktop-add-game.png`, `artifacts/community-mobile-add-game.png` |
| Promotional assets and source records | `public/images/games/`, including `sources.json` |
| Current local fonts | `public/fonts/` |

Implementation context for the eventual developer: Next.js, React, TypeScript, CSS/Tailwind, Lucide icons, and Supabase-backed services. Main UI is in `src/components/community-app.tsx`; authentication is in `src/components/auth-screen.tsx`; the current theme is in `src/app/community-theme.css`. There is no need to select a new framework or redesign the backend to deliver this visual redesign.
