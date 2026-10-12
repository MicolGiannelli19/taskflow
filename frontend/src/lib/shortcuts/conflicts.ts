import { PLATFORMS, comboId, resolveCombo, type Platform } from "./combo.ts";
import type { ReservedCombo, ReservedFamily } from "./reserved.ts";
import type { ShortcutDefinition, ShortcutScope } from "./registry.ts";

export interface Conflict {
  shortcutId: string;
  platform: Platform;
  keys: string;
  /** The reserved entry, family or other shortcut it collides with. */
  with: string;
  reason: string;
}

/**
 * A card has focus inside the board, so board and card shortcuts are live
 * together; a `ticket` shortcut is live wherever a ticket is (card, dialog, page).
 */
function scopesOverlap(a: ShortcutScope, b: ShortcutScope): boolean {
  if (a === b || a === "global" || b === "global" || a === "ticket" || b === "ticket") return true;
  const pair = new Set([a, b]);
  return pair.has("board") && pair.has("ticket-card");
}

/**
 * Every way the shortcut list collides with combos someone else owns, or with
 * itself. An empty result means the list is safe to ship.
 */
export function findConflicts(
  shortcuts: readonly ShortcutDefinition[],
  reserved: readonly ReservedCombo[],
  families: readonly ReservedFamily[],
): Conflict[] {
  const conflicts: Conflict[] = [];
  const reservedById = new Map(reserved.map((r) => [r.id, r]));

  for (const shortcut of shortcuts) {
    const overrides = new Map((shortcut.overrides ?? []).map((o) => [o.id, o]));
    const usedOverrides = new Set<string>();

    for (const id of overrides.keys()) {
      if (!reservedById.has(id)) {
        conflicts.push({
          shortcutId: shortcut.id,
          platform: "mac",
          keys: shortcut.keys.join(", "),
          with: id,
          reason: "overrides a reserved id that does not exist",
        });
        usedOverrides.add(id);
      }
    }

    for (const platform of PLATFORMS) {
      for (const keys of shortcut.keys) {
        const mine = comboId(resolveCombo(keys, platform));

        for (const entry of reserved) {
          if (!entry.platforms.includes(platform)) continue;
          if (comboId(resolveCombo(entry.keys, platform)) !== mine) continue;
          // Text-field combos only matter to shortcuts that also fire while typing.
          if (entry.context === "text" && !shortcut.firesInText) continue;

          const override = overrides.get(entry.id);
          if (override) usedOverrides.add(entry.id);
          if (override && entry.mayOverride) continue;

          conflicts.push({
            shortcutId: shortcut.id,
            platform,
            keys,
            with: entry.id,
            reason: override
              ? `${entry.owner} keeps this combo (${entry.action}); it cannot be overridden`
              : `${entry.owner}: ${entry.action}`,
          });
        }

        for (const family of families) {
          if (!family.platforms.includes(platform)) continue;
          if (!family.matches(resolveCombo(keys, platform))) continue;
          conflicts.push({ shortcutId: shortcut.id, platform, keys, with: family.id, reason: family.action });
        }
      }
    }

    for (const id of overrides.keys()) {
      if (usedOverrides.has(id)) continue;
      conflicts.push({
        shortcutId: shortcut.id,
        platform: "mac",
        keys: shortcut.keys.join(", "),
        with: id,
        reason: "overrides a reserved combo it never collides with; remove the stale override",
      });
    }
  }

  // Two TaskFlow shortcuts on the same keys, live at the same time.
  for (const [i, a] of shortcuts.entries()) {
    for (const b of shortcuts.slice(i + 1)) {
      if (!scopesOverlap(a.scope, b.scope)) continue;
      for (const platform of PLATFORMS) {
        const aIds = new Set(a.keys.map((k) => comboId(resolveCombo(k, platform))));
        const clash = b.keys.find((k) => aIds.has(comboId(resolveCombo(k, platform))));
        if (clash) {
          conflicts.push({
            shortcutId: a.id,
            platform,
            keys: clash,
            with: b.id,
            reason: `both live in overlapping scopes (${a.scope}, ${b.scope})`,
          });
        }
      }
    }
  }

  return conflicts;
}

export function formatConflicts(conflicts: readonly Conflict[]): string {
  return conflicts
    .map((c) => `  ${c.shortcutId} [${c.platform}] ${c.keys} ✕ ${c.with}: ${c.reason}`)
    .join("\n");
}
