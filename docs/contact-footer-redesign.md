# Contact page and store badge preview

- Existing `/contact` redesigned in `src/features/enquiries/enquiry-page.tsx` with scoped `contact-page.module.css`: coastal resort backdrop, centered navy/gold heading, navy information panel and white form. Existing group quotation retains its layout and required fields.
- Name, email and message remain required. Agency and subject are optional on Contact only. React Hook Form/Zod validation remains client-side. Send Message produces an explicitly unsent local preview; no API request is made.
- No verified official phone number, email, physical address or app store URLs were found in frontend source/README. Contact rows explicitly say details pending. No fabricated contacts or links.
- Existing `SiteFooter` now has official unmodified badge artwork below the brand description, with scoped `app-store-badges.module.css`. Both images are non-clickable, per the owner's explicit follow-up. Nearby text says downloads are unavailable pending verified links. No app publication is implied.
- Source imagery: existing generated `public/images/home/cinematic/coastal-resort.png`, using the existing responsive-image pipeline. No new imagery generation or dependencies.
- Badge assets: `public/images/app-badges/app-store.svg` and `google-play.png`; exact official URLs and usage notes in that directory's README. Original proportions preserved; Google asset contains intrinsic clearspace.
- Follow-up contact reference received: adjusted equal-width desktop panels, visible coastal background, heading-side gold lines, stronger gold send button, input icons/placeholders, and full-width name/email fields. Optional agency/subject fields and truthful unsent preview are retained. Existing store badges remain non-clickable as explicitly requested.
- Browser QA: Chromium at 320, 375, 390, 430, 768 and 1440px, English/Arabic, validation, optional fields, no outgoing POST, no fabricated contact/download links, footer regressions and automated accessibility. Native Safari is not tested.
- Work remains local; no push or deployment.
