import { Container, Graphics, Sprite, Text } from 'pixi.js';
import { EntityView } from './EntityView.js';

export class BuildingView extends EntityView {
  constructor(model, deps) {
    super(model, deps);
    this.assetRegistry = deps.assetRegistry;
    this.sprite = new Sprite(this.assetRegistry.texture(model.assetId));
    const sourceScale = this.assetRegistry.sourceScale(model.assetId);
    const anchor = this.assetRegistry.anchor(model.assetId, { x: 0.5, y: 0.86 });
    const offset = this.assetRegistry.renderOffset(model.assetId);
    this.sprite.anchor.set(anchor.x, anchor.y);
    this.sprite.scale.set(1.48 / sourceScale);
    this.sprite.position.set(offset.x, offset.y);
    this.container.addChild(this.sprite);
    const names = { building_farmhouse_lv1: 'Nhà chính', building_warehouse_lv1: 'Nhà kho', building_chicken_coop_lv1: 'Chuồng gà' };
    const label = names[model.assetId];
    if (label) {
      const nameplate = new Container();
      this.nameplate = nameplate;
      nameplate.position.set(0, -this.sprite.height * anchor.y - 10);
      const width = Math.max(112, label.length * 11 + 30);
      const background = new Graphics()
        .roundRect(-width / 2, -18, width, 35, 13).fill(0xfff6d8).stroke({ color: 0xc49a52, width: 2 })
        .poly([-5, 17, 0, 24, 5, 17]).fill(0xfff6d8);
      const text = new Text({ text: label, style: { fontFamily: 'Segoe UI, Arial, sans-serif', fontSize: 18, fontWeight: '700', fill: 0x795232 } });
      text.anchor.set(0.5);
      nameplate.addChild(background, text);
      this.container.addChild(nameplate);
    }
    this.cullHalfWidth = Math.max(128, this.sprite.width * 0.55);
    this.cullHalfHeight = Math.max(128, this.sprite.height + 36);
    this.updateDepth(offset.y);
  }
}
