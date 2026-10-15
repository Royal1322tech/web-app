import { selectLanguage } from "./helpers/header";
import { visit } from "./helpers/demo-login";
import {test,expect} from '@playwright/test';
import {openHeaderTools} from './helpers/header';
import AxeBuilder from '@axe-core/playwright';
for(const width of [320,375,390,430,768,1024,1440]) {
 test(`contact and store previews fit ${width}px in English and Arabic`,async({page})=>{
  await page.setViewportSize({width,height:1000});
  await page.emulateMedia({reducedMotion:'reduce'});
  await visit(page, '/contact');
  for(const locale of ['en','ar']) {
   await openHeaderTools(page);
   await selectLanguage(page, locale);
   await expect(page.getByRole('heading',{level:1})).toHaveText(locale==='en'?'Get in Touch With Us':'تواصل معنا');
   expect(await page.evaluate(()=>document.documentElement.scrollWidth)).toBeLessThanOrEqual(width+1);
   await expect(page.locator('#enquiry-name')).toHaveCSS('padding-left','40px');
   await expect(page.locator('#enquiry-name')).toHaveCSS('padding-right','40px');
   const info=page.locator('aside').first();const form=page.locator('form');
   const a=(await info.boundingBox())!;const b=(await form.boundingBox())!;
   if(width<800) expect(a.y+a.height).toBeLessThanOrEqual(b.y);
   else expect(Math.abs(a.y-b.y)).toBeLessThan(1);
   await expect(page.locator('a[href="mailto:royal.travel@royalvacation.online"]')).toBeVisible();
   await expect(page.locator('a[href="https://wa.me/201070724143"]')).toBeVisible();
   await expect(page.locator('footer')).toHaveCount(0);
   if(width===375||width===1440) await page.screenshot({path:`test-results/contact-${locale}-${width}.png`,fullPage:true});
   await visit(page, '/');
   const badges=page.locator('footer img[src*="app-badges"]');
   await expect(badges).toHaveCount(2);
   for(const badge of await badges.all()) {
    await badge.scrollIntoViewIfNeeded();
    await expect.poll(()=>badge.evaluate((el:HTMLImageElement)=>el.naturalWidth)).toBeGreaterThan(0);
    expect(await badge.evaluate(el=>el.closest('a,button')===null)).toBe(true);
    expect((await badge.boundingBox())!.width).toBeLessThan(180);
    expect((await badge.boundingBox())!.height).toBeLessThan(70);
   }
   await visit(page, '/contact');
  }
 });
}
test('contact required fields and optional agency/subject produce only a local preview',async({page})=>{
 const posts:string[]=[];page.on('request',r=>{if(r.method()==='POST') posts.push(r.url());});
 await visit(page, '/contact');
 await page.getByRole('button',{name:'Send Message',exact:true}).click();
 await expect(page.getByText('Enter your name.',{exact:true})).toBeVisible();
 await page.locator('#enquiry-name').fill('Demo Traveller');
 await page.locator('#enquiry-email').fill('demo@example.com');
 await page.locator('#enquiry-message').fill('A fictional enquiry to preview locally.');
 await page.getByRole('button',{name:'Send Message',exact:true}).click();
 await expect(page.getByRole('status')).toContainText('not sent');
 expect(posts).toEqual([]);
 expect((await new AxeBuilder({page}).withTags(['wcag2a','wcag2aa','wcag21aa']).analyze()).violations).toEqual([]);
 await visit(page, '/group-quotation');
 await page.getByRole('button',{name:'Preview request',exact:true}).click();
 await expect(page.getByText('Enter your agency name.',{exact:true})).toBeVisible();
});
