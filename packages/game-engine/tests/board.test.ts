/**
 * Required board tests (§112) + Design Plan §77.
 */
import { describe, expect, it } from "vitest";
import {
  boardDefinitionIssues,
  createStandardBoardDefinition,
  isJackCode,
  validateBoardDefinition,
  WILD_CORNER_COORDS,
  cellId,
  cardCellsForCode,
} from "../src/index.js";

describe("standard board definition", () => {
  const board = createStandardBoardDefinition();

  it("is 10 × 10 with exactly 100 cells (§112)", () => {
    expect(board.width).toBe(10);
    expect(board.height).toBe(10);
    expect(board.cells.length).toBe(100);
  });

  it("has 4 wild corners at the mandated coordinates (§11)", () => {
    const corners = board.cells.filter((c) => c.type === "WILD_CORNER");
    expect(corners.length).toBe(4);
    const cornerIds = corners.map((c) => c.id).sort();
    const expected = WILD_CORNER_COORDS.map(([r, c]) => cellId(r, c)).sort();
    expect(cornerIds).toEqual(expected);
  });

  it("has 96 CARD cells (§112)", () => {
    expect(board.cells.filter((c) => c.type === "CARD").length).toBe(96);
  });

  it("has 48 unique normal card identities, each exactly twice (§112)", () => {
    const counts = new Map<string, number>();
    for (const cell of board.cells) {
      if (cell.type === "CARD") {
        counts.set(cell.cardCode, (counts.get(cell.cardCode) ?? 0) + 1);
      }
    }
    expect(counts.size).toBe(48);
    for (const [, count] of counts) {
      expect(count).toBe(2);
    }
  });

  it("contains zero Jacks on the board (§112)", () => {
    for (const cell of board.cells) {
      if (cell.type === "CARD") {
        expect(isJackCode(cell.cardCode)).toBe(false);
      }
    }
  });

  it("has unique coordinates and ids in range", () => {
    const ids = new Set<string>();
    const coords = new Set<string>();
    for (const cell of board.cells) {
      expect(ids.has(cell.id)).toBe(false);
      ids.add(cell.id);
      expect(coords.has(`${cell.row},${cell.column}`)).toBe(false);
      coords.add(`${cell.row},${cell.column}`);
      expect(cell.row).toBeGreaterThanOrEqual(0);
      expect(cell.row).toBeLessThan(10);
      expect(cell.column).toBeGreaterThanOrEqual(0);
      expect(cell.column).toBeLessThan(10);
    }
  });

  it("passes validateBoardDefinition with zero issues", () => {
    expect(boardDefinitionIssues(board)).toEqual([]);
    expect(() => validateBoardDefinition(board)).not.toThrow();
  });

  it("is deterministic across calls (fixed physical board)", () => {
    const again = createStandardBoardDefinition();
    expect(JSON.stringify(again)).toBe(JSON.stringify(board));
  });

  it("maps every identity to exactly two board cells", () => {
    for (const cell of board.cells) {
      if (cell.type !== "CARD") continue;
      const [a, b] = cardCellsForCode(board, cell.cardCode);
      expect(a).not.toBe(b);
    }
  });

  it("rejects an invalid board definition (§15)", () => {
    const broken = {
      ...board,
      cells: board.cells.slice(0, 50),
    };
    expect(boardDefinitionIssues(broken).length).toBeGreaterThan(0);
    expect(() => validateBoardDefinition(broken)).toThrow();
  });

  it("rejects a board with a Jack identity (§15)", () => {
    const withJack = {
      ...board,
      cells: board.cells.map((cell, index) =>
        cell.type === "CARD" && index === 10
          ? { ...cell, cardCode: "JH" }
          : cell,
      ),
    };
    const issues = boardDefinitionIssues(withJack);
    expect(issues.some((i) => i.includes("Jack"))).toBe(true);
  });
});
