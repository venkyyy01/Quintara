/**
 * Required deck tests (§113) + Design Plan §77.
 */
import { describe, expect, it } from "vitest";
import {
  createStandardDeck,
  isJackCode,
  isOneEyedJackCode,
  isTwoEyedJackCode,
  normalCardCodes,
  cardLabel,
} from "../src/index.js";

describe("standard deck", () => {
  const deck = createStandardDeck();

  it("has exactly 104 cards (§113)", () => {
    expect(deck.length).toBe(104);
  });

  it("has 96 normal cards and 8 Jacks (§113)", () => {
    expect(deck.filter((c) => !isJackCode(c.code)).length).toBe(96);
    expect(deck.filter((c) => isJackCode(c.code)).length).toBe(8);
  });

  it("has 2 copies each of JC, JD, JH, JS (§113)", () => {
    for (const code of ["JC", "JD", "JH", "JS"]) {
      expect(deck.filter((c) => c.code === code).length).toBe(2);
    }
  });

  it("classifies Jack kinds correctly (§18)", () => {
    expect(isTwoEyedJackCode("JC")).toBe(true);
    expect(isTwoEyedJackCode("JD")).toBe(true);
    expect(isOneEyedJackCode("JH")).toBe(true);
    expect(isOneEyedJackCode("JS")).toBe(true);
    expect(isTwoEyedJackCode("JH")).toBe(false);
    expect(isOneEyedJackCode("JC")).toBe(false);
  });

  it("gives every physical card instance a unique id (§16)", () => {
    const ids = new Set(deck.map((c) => c.id));
    expect(ids.size).toBe(104);
  });

  it("uses distinct ids for the two copies of an identity (§16)", () => {
    const eights = deck.filter((c) => c.code === "8H");
    expect(eights.length).toBe(2);
    expect(eights[0]?.id).not.toBe(eights[1]?.id);
    expect(eights.map((c) => c.deckCopy).sort()).toEqual([1, 2]);
    // Both map to the same board identity.
    expect(eights[0]?.code).toBe(eights[1]?.code);
  });

  it("contains no Jokers", () => {
    expect(deck.every((c) => c.rank !== ("JOKER" as never))).toBe(true);
  });

  it("has 48 unique normal identities × 2 = 96 (§17)", () => {
    const codes = normalCardCodes();
    expect(codes.length).toBe(48);
    expect(new Set(codes).size).toBe(48);
  });

  it("produces accessible card labels (§64)", () => {
    expect(cardLabel("8H")).toBe("Eight of Hearts");
    expect(cardLabel("JC")).toContain("Jack of Clubs");
    expect(cardLabel("JC")).toContain("Two-Eyed");
    expect(cardLabel("JH")).toContain("One-Eyed");
    expect(cardLabel("QS")).toBe("Queen of Spades");
    expect(cardLabel("AC")).toBe("Ace of Clubs");
    expect(cardLabel("10D")).toBe("Ten of Diamonds");
  });
});
