/**
 * IdCardScene (overlay, SPEC-homepage §3.3) — H4 pixel art
 * Shows: "Make your School ID": a generic Uni Series student ID card with the player's character in the
 * photo frame (layered avatar art), a Girl | Boy choice (DECISIONS D-041), a name field (a real HTML input
 * so phones open the keyboard, H-002), skin / hair / outfit / lace pickers and Done. Opened on the first
 * play tap (then goes on to the map) or from the ID chip (edit).
 * Listens to: pointer; Enter in the name field saves; Esc closes when editing an existing ID.
 */
import Phaser from 'phaser';
import { sceneConfig } from '../ui/view';
import { gameEvents } from '../core/GameEvents';
import { t } from '../core/i18n';
import type { Gender, Profile } from '../core/SaveManager';
import { services } from '../core/services';
import { FADE_MS } from '../home/config';
import {
  cleanName,
  cycle,
  emptyProfile,
  ID_OPTIONS,
  type IdPart,
  NAME_MAX,
  validateProfile,
} from '../home/IdCard';
import { avatarSprite } from '../ui/avatar';
import { Button } from '../ui/Button';
import { closeOverlay, type OverlayData } from '../ui/overlay';
import { backdrop, panel } from '../ui/Panel';
import { COLORS, FONT, SCENES, TEXT, textStyle } from '../ui/theme';

const CARD = { x: 320, y: 180, w: 328, h: 214 };
/** Photo frame centre, relative to the card centre. */
const PHOTO = { x: -104, y: 10 };
/** Left edge of the right-hand column, relative to the card centre. */
const COL = -48;

export class IdCardScene extends Phaser.Scene {
  private data_!: OverlayData & { next?: 'map' };
  private draft: Profile = emptyProfile();
  private card!: Phaser.GameObjects.Container;
  private preview: Phaser.GameObjects.Container | null = null;
  private values: Partial<Record<IdPart, Phaser.GameObjects.Text>> = {};
  private genderButtons: Partial<Record<Gender, Button>> = {};
  private input_: HTMLInputElement | null = null;

  constructor() {
    super(sceneConfig(SCENES.idCard));
  }

  init(data: OverlayData & { next?: 'map' }): void {
    this.data_ = data;
    this.draft = { ...(services().save.data.profile ?? emptyProfile()) };
    this.values = {};
    this.genderButtons = {};
    this.preview = null;
  }

  create(): void {
    backdrop(this);
    const top = -CARD.h / 2;
    const left = -CARD.w / 2;
    this.card = this.add.container(CARD.x, CARD.y);
    const c = this.card;
    c.add(panel(this, 0, 0, CARD.w, CARD.h));
    c.add(this.add.rectangle(0, top + 12, CARD.w - 6, 18, COLORS.ink));
    c.add(this.add.rectangle(0, top + 21, CARD.w - 6, 2, COLORS.red));
    c.add(this.add.text(0, top + 12, t('id.card'), textStyle(8, TEXT.cream)).setOrigin(0.5));
    c.add(this.add.text(left + 12, top + 28, t('id.title'), textStyle(8, TEXT.red)));

    // Photo frame with the character.
    c.add(panel(this, PHOTO.x, PHOTO.y, 88, 108, 0xbfd8e8));
    c.add(this.add.rectangle(PHOTO.x, PHOTO.y + 42, 80, 16, 0x8fb3c9));

    // Girl | Boy.
    const gy = top + 50;
    c.add(this.add.text(COL, gy, t('id.gender'), textStyle(8)).setOrigin(0, 0.5));
    (['girl', 'boy'] as const).forEach((g, i) => {
      const b = new Button(this, COL + 92 + i * 56, gy, t(`id.${g}`), () => this.setGender(g), {
        width: 50,
        height: 18,
      });
      this.genderButtons[g] = b;
      c.add(b);
    });

    // Name.
    const ny = top + 72;
    c.add(this.add.text(COL, ny, t('id.name'), textStyle(8)).setOrigin(0, 0.5));
    this.createNameInput(COL + 120, ny);

    // Skin, hair, outfit, lace.
    (['skin', 'hair', 'outfit', 'lace'] as IdPart[]).forEach((part, i) => {
      const y = top + 96 + i * 20;
      c.add(this.add.text(COL, y, t(`id.${part}`), textStyle(8)).setOrigin(0, 0.5));
      c.add(
        new Button(this, COL + 92, y, '<', () => this.change(part, -1), { width: 18, height: 16 }),
      );
      const value = this.add.text(COL + 120, y, '', textStyle(8)).setOrigin(0.5);
      this.values[part] = value;
      c.add(value);
      c.add(
        new Button(this, COL + 148, y, '>', () => this.change(part, 1), { width: 18, height: 16 }),
      );
    });

    c.add(
      new Button(this, CARD.w / 2 - 58, CARD.h / 2 - 20, t('id.save'), () => this.save(), {
        width: 92,
        height: 22,
        fill: COLORS.yellow,
        textColor: TEXT.red,
      }),
    );
    if (services().save.data.profile) {
      c.add(
        new Button(this, CARD.w / 2 - 136, CARD.h / 2 - 20, t('ui.close'), () => this.cancel(), {
          width: 60,
          height: 22,
        }),
      );
    }
    this.refresh();

    if (!services().save.data.settings.reducedMotion) {
      c.y = 460;
      this.tweens.add({ targets: c, y: CARD.y, duration: 250, ease: 'Back.easeOut' });
    }
    this.input.keyboard?.on('keydown-ESC', () => this.cancel());
    this.events.once('shutdown', () => {
      this.input.keyboard?.removeAllListeners();
      this.input_ = null;
    });
  }

  /** The HTML name field: styled first, then measured, so Phaser centres it correctly. */
  private createNameInput(cx: number, cy: number): void {
    const input = document.createElement('input');
    input.type = 'text';
    input.maxLength = NAME_MAX;
    input.placeholder = t('id.namePlaceholder');
    input.value = this.draft.name;
    input.setAttribute('aria-label', t('id.name'));
    input.setAttribute('data-testid', 'id-name');
    Object.assign(input.style, {
      boxSizing: 'border-box',
      width: '110px',
      height: '16px',
      fontFamily: FONT,
      fontSize: '10px',
      padding: '0 4px',
      border: '1px solid #2B2233',
      borderRadius: '2px',
      background: '#FFFFFF',
      color: '#2B2233',
      outline: 'none',
    });
    input.addEventListener('keydown', (e) => {
      e.stopPropagation();
      if (e.key === 'Enter') this.save();
      if (e.key === 'Escape') this.cancel();
    });
    const dom = this.add.dom(CARD.x + cx, CARD.y + cy, input);
    dom.updateSize();
    this.input_ = input;
    // The field follows the card while it slides in.
    const follow = (): void => {
      dom.setY(this.card.y + cy);
    };
    this.events.on('update', follow);
    this.events.once('shutdown', () => this.events.off('update', follow));
  }

  private setGender(g: Gender): void {
    this.draft.gender = g;
    this.refresh();
  }

  private change(part: IdPart, dir: 1 | -1): void {
    this.draft[part] = cycle(part, this.draft[part], dir);
    this.refresh();
  }

  private refresh(): void {
    for (const part of Object.keys(ID_OPTIONS) as IdPart[]) {
      this.values[part]?.setText(`${this.draft[part] + 1}/${ID_OPTIONS[part]}`);
    }
    for (const g of ['girl', 'boy'] as const) {
      this.genderButtons[g]?.setSelected(this.draft.gender === g);
    }
    this.preview?.destroy();
    this.preview = avatarSprite(this, PHOTO.x, PHOTO.y + 4, this.draft, 1.6);
    this.card.add(this.preview);
  }

  private save(): void {
    const profile: Profile = { ...this.draft, name: cleanName(this.input_?.value ?? '') };
    if (!validateProfile(profile).ok) {
      gameEvents.emit('toast', { text: t('id.nameRequired') });
      this.input_?.focus();
      return;
    }
    services().save.update((d) => {
      d.profile = profile;
    });
    if (this.data_.next === 'map') {
      this.scene.stop(this.data_.from);
      this.cameras.main.fadeOut(FADE_MS, 0x2b, 0x22, 0x33);
      this.cameras.main.once('camerafadeoutcomplete', () =>
        this.scene.start(SCENES.campusMap, { from: 'landing' }),
      );
      return;
    }
    closeOverlay(this, this.data_.from, true);
  }

  private cancel(): void {
    if (!services().save.data.profile) return;
    closeOverlay(this, this.data_.from);
  }
}
