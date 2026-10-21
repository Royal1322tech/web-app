import { selectLanguage } from "./helpers/header";
import { visit } from "./helpers/demo-login";
import { expect, test } from '@playwright/test';
import { openHeaderTools } from './helpers/header';

for (const width of [320,375,390,430,768,1024,1440]) {
  test(`travel preferences remain independent and fit ${width}px`, async ({page}) => {
    await page.setViewportSize({width,height:900});
    await page.emulateMedia({reducedMotion:'reduce'});
    await visit(page, '/');
    await openHeaderTools(page);
    const trigger = page.getByRole('button',{name:'Nationality and currency',exact:true});
    await trigger.click();
    let panel = page.getByRole('region',{name:'Nationality and currency',exact:true});
    await panel.getByLabel('Select nationality', {exact:true}).selectOption('EG');
    await panel.locator('label').filter({hasText:/^EGP$/}).click();
    await expect(panel.getByLabel('Select nationality', {exact:true})).toHaveValue('EG');
    await expect(panel.getByRole('radio',{name:'EGP',exact:true})).toBeChecked();
    await expect(page.locator('html')).toHaveAttribute('lang','en');
    const box = await panel.boundingBox();
    expect(box!.x).toBeGreaterThanOrEqual(0);
    expect(box!.x+box!.width).toBeLessThanOrEqual(width);
    await page.keyboard.press('Escape');
    await expect(trigger).toBeFocused();
    await expect(trigger).toContainText('EGP');
    await expect(trigger).toContainText('Egypt');
    await page.reload();
    await openHeaderTools(page);
    await expect(trigger).toContainText('EGP');
    await selectLanguage(page, 'ar');
    await page.getByRole('button',{name:'الجنسية والعملة',exact:true}).click();
    panel=page.getByRole('region',{name:'الجنسية والعملة',exact:true});
    await expect(panel.getByLabel('اختر الجنسية',{exact:true})).toHaveValue('EG');
    await panel.getByRole('radio',{name:'EGP',exact:true}).focus();
    await page.keyboard.press('ArrowDown');
    await expect(panel.getByRole('radio',{name:'EUR',exact:true})).toBeChecked();
    await expect(page.locator('html')).toHaveAttribute('dir','rtl');
    const rtlBox = await panel.boundingBox();
    expect(rtlBox!.x).toBeGreaterThanOrEqual(0);
    expect(rtlBox!.x + rtlBox!.width).toBeLessThanOrEqual(width);
    if (width === 768) {
      // Keep the popup open across breakpoints and direction changes.
      for (const direction of ['ltr', 'rtl']) {
        await page.evaluate(value => { document.documentElement.dir = value; }, direction);
        for (const resizedWidth of [320, 375, 390, 430, 768, 1024, 1440]) {
          await page.setViewportSize({ width: resizedWidth, height: 900 });
          await expect.poll(async () => {
            const bounds = await panel.boundingBox();
            return !!bounds && bounds.x >= 0 && bounds.x + bounds.width <= resizedWidth;
          }).toBe(true);
        }
      }
      await page.setViewportSize({ width, height: 900 });
    }

    expect(await page.evaluate(()=>document.documentElement.scrollWidth)).toBeLessThanOrEqual(width+1);
    await page.keyboard.press('Escape');
    await expect(page.locator('header a[href="/contact"]')).toBeVisible();
  });
}

test('contact and group quotation validate locally without sending requests', async ({page}) => {
  const mutations:string[]=[];
  page.on('request',req=>{if(req.method()==='POST') mutations.push(req.url());});
  for(const route of ['/contact','/group-quotation']) {
    await visit(page, route);
    if(route==='/contact') {
      await page.getByRole('button',{name:'Prepare enquiry',exact:true}).click();
      await expect(page.getByText('Enter your name.',{exact:true})).toBeVisible();
      for(const [key,value] of Object.entries({name:'Demo Traveller',email:'demo@example.com',agency:'Sample Agency',subject:'Sample enquiry',phone:'1001234567',message:'Fictional travel requirements for a preview.'})) await page.locator('#enquiry-'+key).fill(value);
      await page.getByRole('button',{name:'Prepare enquiry',exact:true}).click();
      await expect(page.getByRole('heading',{name:'Local preview ready — not sent'})).toBeVisible();
    } else {
      await page.getByRole('button',{name:'Preview request',exact:true}).click();
      await expect(page.getByText('Enter your name.',{exact:true})).toBeVisible();
      for(const [key,value] of Object.entries({name:'Demo Traveller',email:'demo@example.com',agency:'Sample Agency',subject:'Sample group request',message:'Fictional travel requirements for a preview.'})) await page.locator('#enquiry-'+key).fill(value);
      await page.locator('#enquiry-destination').fill('Cairo');
      await page.locator('#enquiry-passengers').fill('12');
      await page.locator('#enquiry-start').fill('2030-11-20');
      await page.locator('#enquiry-end').fill('2030-11-19');
      await page.getByRole('button',{name:'Preview request',exact:true}).click();
      await expect(page.getByText('Choose an end date on or after departure.',{exact:true})).toBeVisible();
      await page.locator('#enquiry-end').fill('2030-11-22');
      await page.getByRole('button',{name:'Preview request',exact:true}).click();
      await expect(page.getByRole('heading',{name:'Local preview ready — not sent'})).toBeVisible();
    }
  }
  expect(mutations).toEqual([]);
});

test('automatic hero and hotel carousel interaction', async ({page}) => {
  await page.setViewportSize({width:390,height:844});
  await visit(page, '/');
  const hero=page.getByRole('region',{name:'Royal Vacation agency platform',exact:true});
  const slides=hero.locator('[data-active]');
  await expect(hero.getByRole('group',{name:'Hero slideshow',exact:true})).toHaveCount(0);
  await expect(slides.nth(1)).toHaveAttribute('data-active','true',{timeout:12000});
  const hotels=page.locator('section[aria-labelledby="deals-title"]');
  await hotels.scrollIntoViewIfNeeded();
  await page.mouse.move(0,0);
  await expect(hotels.locator('p').last()).not.toContainText('Sample 1 / 5',{timeout:6000});
  await hotels.getByRole('button',{name:'Next featured hotel'}).click();
  await expect(hotels.getByRole('button',{name:'Play',exact:true})).toBeVisible();
  expect(await hotels.locator('article').count()).toBe(5);
  await page.emulateMedia({reducedMotion:'reduce'});
  await expect(hotels.getByRole('button',{name:'Play',exact:true})).toHaveCount(0);
});
