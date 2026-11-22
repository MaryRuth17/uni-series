/**
 * IdCardScene (overlay, SPEC-homepage §3.3) — H1 greybox
 * Shows: "Gawa ng School ID": a generic Uni Series student ID card with an avatar preview, a name field
 * (a real HTML input so phones open the keyboard, DECISIONS H-002), skin / hair / outfit / lace pickers
 * and "Ayos na!". Opened on first TARA, LARO! (then goes on to the map) or from the ID chip (edit).
 * Listens to: pointer; Enter in the name field saves; Esc closes when editing an existing ID.
 */
import Phaser from 'phaser';
import { gameEvents } from '../core/GameEvents';
import { t } from '../core/i18n';
import type { Profile } from '../core/SaveManager';
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
import { Button } from '../ui/Button';
import { closeOverlay, type OverlayData } from '../ui/overlay';
import { backdrop, panel } from '../ui/Panel';
import { COLORS, FONT, SCENES, TEXT, textStyle } from '../ui/theme';

/** Placeholder colours until the avatar parts are drawn (avatar_<part>_<n>, H§8). */
const SKIN = [0xf5d0b0, 0xe8b48f, 0xc98e66, 0xa46b45, 0x7d4e30, 0x5a3820];
const HAIR = [0x2b2233, 0x4a3226, 0x7a4a2a, 0xb07a4f, 0x1d1d3a, 0x6b2f3a, 0x8a8494, 0xd9b26a];
const OUTFIT = [0xfff4dc, 0x3b6fb6, 0x8b5a3c, 0x6b2f3a];
const LACE = [0xd94b3d, 0xf2c14e, 0x3b6fb6, 0x3a9a6a, 0x7b4bb3, 0x2b2233];

/** A small layered avatar preview: body, outfit, hair and the ID lace. */
export function avatarPreview(
  scene: Phaser.Scene,
  x: number,
  y: number,
  p: Profile,
  scale = 1,
): Phaser.GameObjects.Container {
  const head = scene.add.rectangle(0, -12, 20, 20, SKIN[p.skin]).setStrokeStyle(1, COLORS.ink);
  const hair = scene.add.rectangle(0, -20, 22, 8, HAIR[p.hair]);
  const body = scene.add.rectangle(0, 12, 28, 24, OUTFIT[p.outfit]).setStrokeStyle(1, COLORS.ink);
  const lace = scene.add.rectangle(0, 8, 3, 16, LACE[p.lace]);
  return scene.add.container(x, y, [body, lace, head, hair]).setScale(scale);
}

export class IdCardScene extends Phaser.Scene {
  private data_!: OverlayData & { next?: 'map' };
  private draft: Profile = emptyProfile();
  private preview: Phaser.GameObjects.Container | null = null;
  private values: Partial<Record<IdPart, Phaser.GameObjects.Text>> = {};
  private input_: HTMLInputElement | null = null;

  constructor() {
    super(SCENES.idCard);
  }

  init(data: OverlayData & { next?: 'map' }): void {
    this.data_ = data;
    this.draft = { ...(services().save.data.profile ?? emptyProfile()) };
    this.values = {};
  }

  create(): void {
    backdrop(this);
    const card = this.add.container(320, 180);
    card.add(panel(this, 0, 0, 280, 176));
    card.add(this.add.rectangle(0, -78, 280, 20, COLORS.ink));
    card.add(this.add.text(0, -78, t('id.card'), textStyle(8, TEXT.cream)).setOrigin(0.5));
    card.add(this.add.text(0, -60, t('id.title'), textStyle(8, TEXT.ink)).setOrigin(0.5));
    card.add(this.add.rectangle(-98, -4, 60, 76, 0xe6dcc6).setStrokeStyle(1, COLORS.ink));

    card.add(this.add.text(-60, -44, t('id.name'), textStyle(8)));
    const dom = this.add.dom(320 + 64, 180 - 38, 'input');
    const input = dom.node as HTMLInputElement;
    input.type = 'text';
    input.maxLength = NAME_MAX;
    input.placeholder = t('id.namePlaceholder');
    input.value = this.draft.name;
    input.setAttribute('aria-label', t('id.name'));
    input.setAttribute('data-testid', 'id-name');
    Object.assign(input.style, {
      width: '92px',
      height: '14px',
      fontFamily: FONT,
      fontSize: '10px',
      padding: '0 3px',
      border: '1px solid #2B2233',
      background: '#FFFFFF',
      color: '#2B2233',
      outline: 'none',
    });
    input.addEventListener('keydown', (e) => {
      e.stopPropagation();
      if (e.key === 'Enter') this.save();
      if (e.key === 'Escape') this.cancel();
    });
    this.input_ = input;

    const parts: IdPart[] = ['skin', 'hair', 'outfit', 'lace'];
    parts.forEach((part, i) => {
      const y = -20 + i * 18;
      card.add(this.add.text(-60, y - 4, t(`id.${part}`), textStyle(8)));
      card.add(
        new Button(this, 30, y, '<', () => this.change(part, -1), { width: 16, height: 14 }),
      );
      const value = this.add.text(56, y, '', textStyle(8)).setOrigin(0.5);
      this.values[part] = value;
      card.add(value);
      card.add(new Button(this, 82, y, '>', () => this.change(part, 1), { width: 16, height: 14 }));
    });

    card.add(
      new Button(this, 60, 66, t('id.save'), () => this.save(), {
        width: 96,
        height: 20,
        fill: COLORS.yellow,
        textColor: TEXT.red,
        fontSize: 8,
      }),
    );
    if (services().save.data.profile) {
      card.add(
        new Button(this, -98, 66, t('ui.close'), () => this.cancel(), { width: 56, height: 20 }),
      );
    }
    this.refresh(card);

    if (!services().save.data.settings.reducedMotion) {
      card.y = 420;
      dom.setY(420 - 38);
      this.tweens.add({ targets: card, y: 180, duration: 250, ease: 'Back.easeOut' });
      this.tweens.add({ targets: dom, y: 180 - 38, duration: 250, ease: 'Back.easeOut' });
    }
    this.input.keyboard?.on('keydown-ESC', () => this.cancel());
    this.events.once('shutdown', () => {
      this.input.keyboard?.removeAllListeners();
      this.input_ = null;
    });
  }

  private change(part: IdPart, dir: 1 | -1): void {
    this.draft[part] = cycle(part, this.draft[part], dir);
    this.refresh();
  }

  private refresh(card?: Phaser.GameObjects.Container): void {
    for (const part of Object.keys(ID_OPTIONS) as IdPart[]) {
      this.values[part]?.setText(`${this.draft[part] + 1}/${ID_OPTIONS[part]}`);
    }
    const parent = card ?? (this.preview?.parentContainer as Phaser.GameObjects.Container);
    this.preview?.destroy();
    this.preview = avatarPreview(this, -98, -4, this.draft);
    parent.add(this.preview);
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
      this.cameras.main.once('camerafadeoutcomplete', () => this.scene.start(SCENES.campusMap));
      return;
    }
    closeOverlay(this, this.data_.from, true);
  }

  private cancel(): void {
    if (!services().save.data.profile) return;
    closeOverlay(this, this.data_.from);
  }
}
