/**
 * Viewer projection and privacy (§8–§9, §23, §88–§90, §131, §163).
 */
import { describe, expect, it } from "vitest";
import {
  applyCommand,
  projectEventsForViewer,
  projectStateForViewer,
  scenario,
} from "../src/index.js";
import { handCardId } from "./helpers.js";

describe("state projection privacy (§131)", () => {
  function builtState() {
    return scenario()
      .withCurrentPlayer("A")
      .withHand("A", ["8H", "JC"])
      .withHand("B", ["2C", "QD", "7S"])
      .build();
  }

  it("shows the viewer their exact hand", () => {
    const state = builtState();
    const projected = projectStateForViewer(state, "p-A");
    const expectedIds = state.hands["p-A"];
    expect(projected.hand?.map((c) => c.id)).toEqual(expectedIds);
  });

  it("marks dead cards in the viewer's own hand", () => {
    const pre = scenario().build();
    const eightHearts = pre.boardDefinition.cells.filter(
      (cell) => cell.type === "CARD" && cell.cardCode === "8H",
    );
    const [first, second] = eightHearts;
    const state = scenario()
      .withCurrentPlayer("A")
      .withHand("A", ["8H", "2C"])
      .withHand("B", ["3C"])
      .withMarker("A", first!.row, first!.column)
      .withMarker("B", second!.row, second!.column)
      .build();
    const projected = projectStateForViewer(state, "p-A");
    expect(projected.hand?.find((card) => card.code === "8H")?.dead).toBe(true);
    expect(projected.hand?.find((card) => card.code === "2C")?.dead).toBe(false);
  });

  it("never leaks opponent hand identities into the payload (§8, §23)", () => {
    const state = builtState();
    const projected = projectStateForViewer(state, "p-A");
    const json = JSON.stringify(projected);

    // Every physical card id held by B must be absent from A's payload.
    for (const cardId of state.hands["p-B"] ?? []) {
      expect(json).not.toContain(cardId);
    }
    // The opponent is represented by card count only (§32).
    const playerB = projected.players.find((p) => p.id === "p-B");
    expect(playerB?.cardCount).toBe(3);
    expect(json).not.toContain("\"hand\":[{\"id\":\"D1-2C\"");
  });

  it("never leaks teammate hand identities (§8)", () => {
    const state = scenario({ players: 4, teamSizes: [2, 2] })
      .withCurrentPlayer("A")
      .withHand("A", ["8H"])
      .withHand("B", ["2C", "QD"])
      .withHand("C", ["3C"])
      .withHand("D", ["4C"])
      .build();
    const projected = projectStateForViewer(state, "p-A");
    const json = JSON.stringify(projected);
    for (const cardId of state.hands["p-B"] ?? []) {
      expect(json).not.toContain(cardId);
    }
  });

  it("never exposes the RNG seed or draw pile order (§90)", () => {
    const state = builtState();
    const projected = projectStateForViewer(state, "p-A");
    const json = JSON.stringify(projected);
    expect(json).not.toContain("s0");
    expect(json).not.toContain(JSON.stringify(state.rng));
    expect(json).not.toContain("rng");
    // Only the draw pile count is exposed.
    expect(projected.drawPileCount).toBe(state.drawPile.length);
    expect(Object.keys(projected)).not.toContain("drawPile");
  });

  it("spectators see no hands at all (§163)", () => {
    const state = builtState();
    const projected = projectStateForViewer(state, null);
    expect(projected.hand).toBeNull();
    const json = JSON.stringify(projected);
    for (const cardId of [
      ...(state.hands["p-A"] ?? []),
      ...(state.hands["p-B"] ?? []),
    ]) {
      expect(json).not.toContain(cardId);
    }
  });

  it("exposes public information to everyone (§89)", () => {
    const state = builtState();
    for (const viewer of ["p-A", "p-B", null]) {
      const projected = projectStateForViewer(
        state,
        viewer as string | null,
      );
      expect(projected.boardDefinition.cells.length).toBe(100);
      expect(Object.keys(projected.boardCells).length).toBe(96);
      expect(projected.requiredSequences).toBe(2);
      expect(projected.drawPileCount).toBeGreaterThan(0);
      expect(projected.players.length).toBe(2);
      expect(projected.discardPiles["p-A"]).toEqual([]);
    }
  });

  it("includes legal actions only for the current player (§140)", () => {
    const state = builtState();
    expect(projectStateForViewer(state, "p-A").legalActions).not.toBeNull();
    expect(projectStateForViewer(state, "p-B").legalActions).toBeNull();
  });
});

describe("event projection (§131)", () => {
  it("redacts CARD_DRAWN for everyone except the drawing player", () => {
    const state = scenario()
      .withCurrentPlayer("A")
      .withHand("A", ["8H"])
      .withHand("B", ["2C"])
      .build();
    const result = applyCommand(state, {
      type: "PLAY_NORMAL_CARD",
      playerId: "p-A",
      actionId: "a1",
      cardId: handCardId(state, "p-A", "8H"),
      targetCellId: state.boardDefinition.cells.find(
        (c) => c.type === "CARD" && c.cardCode === "8H",
      )!.id,
    });

    const forA = projectEventsForViewer(result.events, "p-A");
    const forB = projectEventsForViewer(result.events, "p-B");
    const forSpectator = projectEventsForViewer(result.events, null);

    // A sees their own draw.
    const drawA = forA.find(
      (e) => e.type === "CARD_DRAWN",
    ) as { cardCode?: string; hidden?: boolean };
    expect(drawA.cardCode).toBeDefined();

    // The drawn card's identity must never reach other viewers.
    const drawnCardId = result.events.find(
      (e) => e.type === "CARD_DRAWN",
    ) as { cardId: string };

    // B and spectators see only that a card was drawn.
    for (const projected of [forB, forSpectator]) {
      const draw = projected.find(
        (e) => e.type === "CARD_DRAWN",
      ) as { cardCode?: string; hidden?: boolean; playerId: string };
      expect(draw.hidden).toBe(true);
      expect(draw.cardCode).toBeUndefined();
      expect(draw.playerId).toBe("p-A");
      expect(JSON.stringify(projected)).not.toContain(drawnCardId.cardId);
    }
  });

  it("keeps played and exchanged cards public (they hit public discards, §45)", () => {
    const state = scenario()
      .withCurrentPlayer("A")
      .withHand("A", ["8H"])
      .withHand("B", ["2C"])
      .build();
    const result = applyCommand(state, {
      type: "PLAY_NORMAL_CARD",
      playerId: "p-A",
      actionId: "a1",
      cardId: handCardId(state, "p-A", "8H"),
      targetCellId: state.boardDefinition.cells.find(
        (c) => c.type === "CARD" && c.cardCode === "8H",
      )!.id,
    });
    const forB = projectEventsForViewer(result.events, "p-B");
    const played = forB.find((e) => e.type === "CARD_PLAYED") as {
      cardCode: string;
    };
    expect(played.cardCode).toBe("8H");
    // Discard information is public.
    const projected = projectStateForViewer(result.state, "p-B");
    expect(projected.discardPiles["p-A"]).toContain("8H");
  });
});
