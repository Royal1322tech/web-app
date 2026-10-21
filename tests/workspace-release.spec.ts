import AxeBuilder from "@axe-core/playwright";
import { test, expect, type Page } from '@playwright/test';
import { visit } from './helpers/demo-login';
import { selectLanguage, closeHeaderMenu } from './helpers/header';
import { demoPoints, pointsSummary } from '../src/features/demo/points-data';
import { hotels } from '../src/features/hotels/data/hotels.fixture';
import { hotelDisplayAddress, hotelDisplayName } from '../src/features/hotels/lib/presentation';
import { assessAgencyCredit } from '../src/features/demo/payment-methods';
import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { CancellationPolicyCard } from '../src/features/demo/cancellation-policy-card';
import { LocaleProvider } from '../src/features/localization/locale-provider';

test('agency credit assessment rejects missing, insufficient and mismatched balances', () => {
  expect(assessAgencyCredit(null, 100, 'USD')).toEqual({ status: 'unavailable' });
  expect(assessAgencyCredit({ amount: 50, currency: 'USD' }, 100, 'USD')).toEqual({ status: 'insufficient', remaining: -50 });
  expect(assessAgencyCredit({ amount: 500, currency: 'EGP' }, 100, 'USD')).toEqual({ status: 'currency-mismatch', availableCurrency: 'EGP', bookingCurrency: 'USD' });
  expect(assessAgencyCredit({ amount: 150, currency: 'USD' }, 100, 'USD')).toEqual({ status: 'sufficient', remaining: 50 });
});
test('cancellation table renders supplier periods, charges and conditions without adding rows', () => {
  const markup = renderToStaticMarkup(createElement(LocaleProvider, {
    children: createElement(CancellationPolicyCard, {
      roomName: 'Double room',
      rateName: 'Breakfast included',
      policy: {
        kind: 'conditional',
        rules: [
          { cancelledOnOrAfter: '2027-02-10 18:00', cancelledOnOrBefore: '2027-02-11 12:00', timezone: 'Africa/Cairo', charge: { kind: 'amount', amount: 50, currency: 'USD' } },
          { cancelledOnOrAfter: '2027-02-11 12:00', charge: { kind: 'percentage', percentage: 25 } },
        ],
        noShow: { en: 'Supplier no-show fee: USD 80', ar: 'رسوم عدم الحضور: ٨٠ دولارًا' },
        earlyDeparture: { en: 'Early departure is non-refundable', ar: 'المغادرة المبكرة غير قابلة للاسترداد' },
      },
    }),
  }));
  expect(markup).toContain('Cancelled on or after');
  expect(markup).toContain('Cancelled on or before');
  expect(markup).toContain('Cancellation Charge');
  expect(markup.match(/<tr>/g)).toHaveLength(3);
  expect(markup).toContain('2027-02-10 18:00 · Africa/Cairo');
  expect(markup).toContain('$50.00');
  expect(markup).toContain('25%');
  expect(markup).toContain('Supplier no-show fee: USD 80');
  expect(markup).toContain('Early departure is non-refundable');

  const partialMarkup = renderToStaticMarkup(createElement(LocaleProvider, {
    children: createElement(CancellationPolicyCard, {
      roomName: 'Double room',
      rateName: 'Flexible rate',
      policy: { kind: 'conditional', noShow: { en: 'Supplier fee applies', ar: 'تطبق رسوم المورد' } },
    }),
  }));
  expect(partialMarkup).toContain('No-Show Charges');
  expect(partialMarkup).not.toContain('Early Check-Out Conditions');
});

async function room(page: Page, offer = 0) {
  await page.getByRole('button', { name: /^(Expand All Rooms|عرض كل الغرف)$/ }).click();
  await expect(page.getByText(/^(Not supplied|غير مقدمة)$/).first()).toBeVisible();
  await page.getByRole('button', { name: /Select room|اختر الغرفة/ }).nth(offer).click();
}
async function compare(page: Page) {
  await page.getByRole('button', { name: /^(Compare|قارن)$/ }).first().click();
  await page.getByRole('button', { name: /^(Compare|قارن)$/ }).first().click();
  await page.getByRole('button', { name: /^(Compare hotels|مقارنة الفنادق)$/ }).click();
  // Contrast must be measured after the existing dialog entrance transition.
  await page.getByRole('dialog').evaluate(async element => {
    await Promise.all(element.getAnimations({ subtree: true }).map(animation => animation.finished));
  });
}
async function noOverflow(page: Page) {
  expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(page.viewportSize()!.width + 1);
}

test('points ledger excludes pending entries and supports an empty dataset', () => {
  expect(pointsSummary(demoPoints)).toEqual({ balance: 1550, earned: 1800, deducted: 250 });
  expect(pointsSummary([])).toEqual({ balance: 0, earned: 0, deducted: 0 });
});
test('points history filters, paginates and shows an honest empty state', async ({ page }) => {
  await visit(page, '/points');
  await expect(page.getByText('Points are informational; earning and redemption are not available.')).toBeVisible();
  await expect(page.locator('.points-metrics section').first()).toContainText('1,550');
  await expect(page.locator('.points-list li')).toHaveCount(4);
  await expect(page.locator('.points-list li').first()).toContainText('Pending');
  await page.getByRole('button', { name: 'Next', exact: true }).click();
  await expect(page.locator('.points-list li')).toHaveCount(2);
  await expect(page.getByRole('button', { name: 'Next', exact: true })).toBeDisabled();
  await page.getByLabel('Transaction type', { exact: true }).selectOption('deducted');
  await expect(page.locator('.points-list li')).toHaveCount(1);
  await expect(page.locator('.points-list li')).toContainText('-200');
  await page.getByLabel('Search points activity').fill('no such entry');
  await expect(page.getByRole('status')).toHaveText('No points activity matches your filters.');
});
test('workspace navigation persists across all sections and profile edits remain local', async ({ page }) => {
  await visit(page, '/profile');
  const navigation = page.getByRole('navigation', { name: 'Workspace navigation' });
  for (const route of ['/car-rental/bookings', '/profile', '/agency', '/transactions', '/notifications', '/points', '/tickets', '/account/settings', '/profile']) {
    await navigation.locator(`a[href="${route}"]`).click();
    await expect(page).toHaveURL(new RegExp(`${route}$`));
    await expect(navigation).toHaveCount(1);
    await expect(navigation.locator(`a[href="${route}"]`)).toHaveAttribute('aria-current', 'page');
    await expect(page.locator('header')).toHaveCount(1);
  }
  // My Bookings and Wallet are reachable from the bar but intentionally render without it.
  for (const route of ['/bookings', '/wallet']) {
    await navigation.locator(`a[href="${route}"]`).click();
    await expect(page).toHaveURL(new RegExp(`${route}$`));
    await expect(page.getByRole('heading', { level: 1 })).toBeVisible();
    await expect(navigation).toHaveCount(0);
    await page.goBack();
    await expect(navigation).toHaveCount(1);
  }
  await page.getByRole('navigation', { name: 'Main navigation' }).getByRole('link', { name: 'Group Quotation', exact: true }).click();
  await expect(page).toHaveURL(/\/group-quotation$/);
  await expect(navigation).toHaveCount(0);
  await expect(page.getByRole('navigation', { name: 'Main navigation' })).toBeVisible();
  await page.goto('/profile');
  await page.getByRole('link', { name: 'Edit profile' }).click();
  await page.getByLabel('Contact person', { exact: true }).fill('Demo Partner Contact');
  await page.getByRole('button', { name: 'Save profile' }).click();
  await expect(page.getByRole('status')).toContainText('Profile changes saved for this session');
  await navigation.getByRole('link', { name: 'My Profile', exact: true }).click();
  await expect(page.locator('.profile-overview')).toContainText('Demo Partner Contact');
  await expect(page.locator('.profile-information')).toContainText('Demo Partner Contact');
  await page.reload();
  await expect(page.locator('.profile-overview')).not.toContainText('Demo Partner Contact');
});
test('policy acknowledgment gates the flow, persists within an attempt and resets on offer changes', async ({ page }) => {
  await visit(page, '/hotels/eastern-al-montazah');
  await room(page);
  await expect(page.locator('.selection-summary')).toContainText('Not supplied');
  await page.getByRole('link', { name: 'Continue to guest details' }).click();
  await page.getByLabel('Lead guest name', { exact: true }).fill('Demo Guest');
  await page.getByLabel('Contact email', { exact: true }).fill('guest@example.test');
  await page.getByLabel('Contact phone', { exact: true }).fill('+20 100 000 0000');
  await page.getByLabel('Guest 2 name', { exact: true }).fill('Demo Companion');
  await page.getByRole('button', { name: 'Continue to cancellation policy' }).click();
  await expect(page).toHaveURL(/\/booking\/policy$/);
  await expect(page.locator('.policy-table').getByRole('columnheader')).toHaveCount(3);
  await expect(page.getByText('Cancellation schedule not supplied for this offer.')).toBeVisible();
  await expect(page.locator('.policy-table tbody tr')).toHaveCount(0);
  await expect(page.locator('.policy-conditions-empty')).toBeVisible();
  await expect(page.getByText('Hotel Norms', { exact: true })).toBeVisible();
  await expect(page.getByText('Terms & Conditions', { exact: true })).toBeVisible();
  await expect(page.locator('.policy-compact-accordion[open]')).toHaveCount(0);
  const acknowledge = page.getByRole('checkbox', { name: /I have reviewed the cancellation and stay information/ });
  await expect(acknowledge).not.toBeChecked();
  await expect(page.getByRole('button', { name: 'Continue to Payment Details' })).toBeDisabled();
  await page.evaluate(() => { history.pushState(null, '', '/booking/payment'); window.dispatchEvent(new PopStateEvent('popstate')); });
  await expect(page).toHaveURL(/\/booking\/policy$/);
  await acknowledge.check();
  await page.getByRole('link', { name: 'Continue to Payment Details' }).click();
  await page.goBack();
  await expect(acknowledge).toBeChecked();
  await page.getByRole('link', { name: 'Back to guest details' }).click();
  await expect(page.getByLabel('Lead guest name', { exact: true })).toHaveValue('Demo Guest');
  await page.getByRole('link', { name: 'Back', exact: true }).click();
  await page.getByRole('link', { name: 'Change room', exact: true }).click();
  await room(page, 2);
  await expect(page.locator('.selection-summary')).toContainText('Bed & Breakfast');
  await page.getByRole('link', { name: 'Continue to guest details' }).click();
  await page.getByLabel('Lead guest name', { exact: true }).fill('Demo Guest');
  await page.getByLabel('Contact email', { exact: true }).fill('guest@example.test');
  await page.getByLabel('Contact phone', { exact: true }).fill('+20 100 000 0000');
  await page.getByLabel('Guest 2 name', { exact: true }).fill('Demo Companion');
  await page.getByRole('button', { name: 'Continue to cancellation policy' }).click();
  await expect(acknowledge).not.toBeChecked();
  await expect(page.getByRole('button', { name: 'Continue to Payment Details' })).toBeDisabled();
});
test('comparison shows fixture facts and Choose Hotel preserves the entire search context', async ({ page }) => {
  const start = new Date(); start.setDate(start.getDate() + 10);
  const end = new Date(start); end.setDate(end.getDate() + 3);
  const query = new URLSearchParams({ destination: 'Alexandria', nationality: 'SA', checkIn: start.toISOString().slice(0, 10), checkOut: end.toISOString().slice(0, 10), rooms: JSON.stringify([{ adults: 1, childAges: [7] }, { adults: 2, childAges: [] }]), currency: 'EGP' });
  await visit(page, `/search?${query}`);
  await page.getByRole('button', { name: 'Nationality and currency', exact: true }).click();
  await page.getByRole('region', { name: 'Nationality and currency', exact: true }).locator('label').filter({ hasText: /^EGP$/ }).click();
  await page.keyboard.press('Escape');
  await compare(page);
  const dialog = page.getByRole('dialog');
  const cards = dialog.getByRole('article');
  await expect(cards).toHaveCount(2);
  for (const card of await cards.all()) {
    const name = await card.getAttribute('aria-label');
    const hotel = hotels.find(h => hotelDisplayName(h.name.en) === name)!;
    await expect(card.getByRole('heading')).toHaveText(hotelDisplayName(hotel.name.en));
    await expect(card).toContainText(hotelDisplayAddress(hotel.address.en, 'en'));
    await expect(card).toContainText(`${hotel.reviewScore} / 5`);
    await expect(card).toContainText(new Intl.NumberFormat('en', { style: 'currency', currency: 'USD' }).format(hotel.nightlyRate));
  }
  const link = cards.first().getByRole('link', { name: 'Choose Hotel' });
  const href = await link.getAttribute('href');
  await link.click();
  await expect(page).toHaveURL(new URL(href!, page.url()).href);
  expect(new URLSearchParams(new URL(page.url()).search).toString()).toBe(query.toString());
  await expect(page.getByRole('heading', { level: 1 })).toHaveText(hotels.find(h => href!.includes(h.id))!.name.en);
  await expect(page.locator('#check-in')).toHaveValue(query.get('checkIn')!);
  await expect(page.locator('#check-out')).toHaveValue(query.get('checkOut')!);
  await expect(page.locator('#search-nationality')).toHaveValue('SA');
  await expect(page.locator('#guest-summary')).toHaveText('4 Guests in 2 Rooms');
  await expect(page.getByRole('button', { name: 'Nationality and currency', exact: true })).toContainText('EGP');
  await page.goBack();
  await page.getByRole('button', { name: 'Compare hotels' }).click();
  await cards.first().getByRole('button', { name: /^Remove/ }).click();
  await expect(cards).toHaveCount(1);
  await dialog.getByRole('button', { name: 'Clear comparison' }).click();
  await expect(dialog).toHaveCount(0);
});
test('only the two requested benefit heading decorations are removed', async ({ page }) => {
  await visit(page, '/');
  for (const name of ['Competitive Prices', 'A Clear Booking Journey']) {
    const heading = page.getByRole('heading', { name, exact: true });
    await expect(heading).toBeVisible();
    await expect(heading.locator('svg')).toHaveCount(0);
    await expect(heading.locator('..').locator('..').locator('img')).toBeVisible();
  }
  await expect(page.locator('section[aria-labelledby="benefits-title"] article svg path[pathLength="1"]')).toHaveCount(1);
});
for (const width of [320, 375, 390, 430, 768, 1024, 1440]) for (const locale of ['en', 'ar']) {
  test(`workspace, points and comparison remain usable at ${width}px ${locale}`, async ({ page }) => {
    await page.setViewportSize({ width, height: 1000 });
    await page.emulateMedia({ reducedMotion: 'reduce' });
    await visit(page, '/profile');
    await selectLanguage(page, locale);
    await closeHeaderMenu(page);
    await expect(page.locator('html')).toHaveAttribute('dir', locale === 'ar' ? 'rtl' : 'ltr');
    await expect(page.locator('.profile-overview')).toBeVisible();
    await noOverflow(page);
    await page.screenshot({ path: `test-results/profile-${width}-${locale}.png`, fullPage: true });
    const nav = page.locator('.workspace-nav');
    await nav.locator('a[href="/wallet"]').click();
    await expect(page).toHaveURL(/\/wallet$/);
    await expect(nav).toHaveCount(0);
    await noOverflow(page);
    await page.goBack();
    await nav.locator('a[href="/points"]').click();
    await expect(page.locator('.points-list li')).toHaveCount(4);
    await noOverflow(page);
    await page.screenshot({ path: `test-results/points-${width}-${locale}.png`, fullPage: true });
    await page.goto('/search');
    await compare(page);
    const dialog = page.getByRole('dialog');
    await expect(dialog).toBeVisible();
    await expect(dialog.getByRole('link')).toHaveCount(2);
    const bounds = (await dialog.boundingBox())!;
    expect(bounds.x).toBeGreaterThanOrEqual(0);
    expect(bounds.x + bounds.width).toBeLessThanOrEqual(width + 1);
    expect(await dialog.evaluate(el => el.scrollWidth <= el.clientWidth + 1)).toBeTruthy();
    await noOverflow(page);
    await page.screenshot({ path: `test-results/comparison-${width}-${locale}.png` });
    await dialog.getByRole('link').first().click();
    await expect(page).toHaveURL(/\/hotels\//);
    await room(page);
    await expect(page.getByText(/Not supplied|غير مقدمة/, { exact: true }).first()).toBeVisible();
    await noOverflow(page);
    await expect(page.getByRole('link', { name: /Continue to guest details|المتابعة لبيانات الضيوف/ })).toBeVisible();
    await page.screenshot({ path: `test-results/policy-${width}-${locale}.png`, fullPage: true });
  });
}

test('sample collection hotels without details routes cannot be chosen', async ({ page }) => {
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await visit(page, '/');
  await page.getByRole('button', { name: 'Favourite: Golden Rose Hotel — Alexandria', exact: true }).first().click();
  await page.getByRole('button', { name: 'Favourite: Golden Rose Hotel — Cairo', exact: true }).first().click();
  await page.goto('/favourites');
  await compare(page);
  const dialog = page.getByRole('dialog');
  await expect(dialog.getByRole('link', { name: 'Choose Hotel' })).toHaveCount(0);
  const actions = dialog.getByRole('button', { name: 'Selection unavailable' });
  await expect(actions).toHaveCount(2);
  for (const action of await actions.all()) await expect(action).toBeDisabled();
});

for (const locale of ['en', 'ar']) test(`enhanced workspace and comparison meet accessibility checks in ${locale}`, async ({ page }) => {
  await visit(page, '/profile');
  await selectLanguage(page, locale);
  await closeHeaderMenu(page);
  for (const route of ['/profile', '/points']) {
    await page.goto(route);
    await expect(page.locator('h1')).toBeVisible();
    expect((await new AxeBuilder({ page }).withTags(['wcag2a', 'wcag2aa', 'wcag21aa']).analyze()).violations).toEqual([]);
  }
  await page.goto('/search');
  await compare(page);
  expect((await new AxeBuilder({ page }).withTags(['wcag2a', 'wcag2aa', 'wcag21aa']).analyze()).violations).toEqual([]);
});
