import { test, expect } from '@playwright/test';
import { FarmButton, FarmTabs, FarmModal, FarmItemSlot, FarmProgress, FarmResourceChip, FarmToast, UI_TARGETS } from '../../apps/web/src/ui/foundation/index.js';
import { mountScreen, expectNoOverflow, saveScreenEvidence } from './ui-fixture.mjs';

test.describe('UI00 isolated foundation', () => {
  test.beforeEach(({}, info) => test.skip(info.project.name !== 'chromium'));
  const content = () => FarmButton({ label: 'Mở kho đồ', attrs: { id: 'open-warehouse' } }) + FarmModal({
    title: 'Kho đồ', icon: 'warehouse', id: 'preview',
    body: FarmTabs({ tabs: [{id:'locked',label:'Chưa mở',disabled:true},{id:'crops',label:'Nông sản',icon:'crops'},{id:'animals',label:'Vật nuôi',icon:'chicken'}] }) +
      '<div class="farm-stack">' + FarmResourceChip({value:250,label:'Xu'}) +
      '<div class="farm-item-grid">' + ['rice','carrot','corn','tomato','egg','chicken_feed'].map(itemId=>FarmItemSlot({itemId,title:{rice:'Lúa',carrot:'Cà rốt',corn:'Bắp',tomato:'Cà chua',egg:'Trứng gà',chicken_feed:'Thức ăn gà'}[itemId],quantity:3})).join('') + '</div>' +
      FarmProgress({value:18,max:100,label:'Sức chứa: 18 / 100'}) + FarmToast({message:'Đã cập nhật kho đồ',variant:'success',dismissible:false}) + '</div>',
    footer: FarmButton({label:'Dùng',icon:'crops'}) + FarmButton({label:'Bán',icon:'coins',variant:'orange'}),
  });
  for (const target of UI_TARGETS) test(`shared controls at ${target.name}`, async ({page}) => {
    await page.setViewportSize({width:target.width,height:target.height});
    await mountScreen(page,{html:content()});
    await page.locator('#open-warehouse').focus();
    await page.evaluate(async()=> (await import('/src/ui/foundation/index.js')).openFarmModal(document.querySelector('dialog')));
    const dialog=page.locator('dialog');
    await expect(dialog).toBeVisible();
    await expectNoOverflow(page);
    const box=await dialog.boundingBox();
    expect(box.x).toBeGreaterThanOrEqual(0); expect(box.y).toBeGreaterThanOrEqual(0);
    expect(box.x+box.width).toBeLessThanOrEqual(target.width+1);
    expect(box.y+box.height).toBeLessThanOrEqual(target.height+1);
    for(const button of await dialog.locator('button').all()) {
      const size=await button.boundingBox();
      expect(size.width).toBeGreaterThanOrEqual(44); expect(size.height).toBeGreaterThanOrEqual(44);
    }
    await saveScreenEvidence(page,'ui00',target.name);
    const crops=page.getByRole('tab',{name:'Nông sản'});
    await expect(crops).toHaveAttribute('tabindex','0');
    await crops.focus(); await page.keyboard.press('ArrowRight');
    await expect(page.getByRole('tab',{name:'Vật nuôi'})).toBeFocused();
    await page.keyboard.press('Escape');
    await expect(dialog).not.toBeVisible(); await expect(page.locator('#open-warehouse')).toBeFocused();
  });
  test('an open-attribute dialog becomes modal and traps focus',async({page})=>{
    await mountScreen(page,{html:FarmButton({label:'Outside'})+FarmModal({title:'Xác nhận',open:true,body:FarmButton({label:'Đồng ý'})}),modal:true});
    expect(await page.locator('dialog').evaluate(node=>node.matches(':modal'))).toBe(true);
    for(let i=0;i<5;i++) {
      await page.keyboard.press('Tab');
      expect(await page.evaluate(()=>document.querySelector('dialog').contains(document.activeElement))).toBe(true);
    }
  });
});
