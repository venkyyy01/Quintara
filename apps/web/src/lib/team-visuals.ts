/**
 * Team visual identity (§44): every marker combines colour + symbol +
 * texture/pattern so teams are never identified by colour alone (§64).
 */

export interface TeamVisual {
  readonly color: string;
  readonly symbol: "circle" | "diamond" | "triangle" | "square";
  readonly markerClass: string;
  readonly textClass: string;
  readonly ringColor: string;
}

const TEAM_VISUALS: Record<string, TeamVisual> = {
  "team-1": {
    color: "var(--color-team-blue)",
    symbol: "circle",
    markerClass: "marker-blue",
    textClass: "text-[#7cabff]",
    ringColor: "#3f83f8",
  },
  "team-2": {
    color: "var(--color-team-red)",
    symbol: "diamond",
    markerClass: "marker-red",
    textClass: "text-[#ff8b88]",
    ringColor: "#ef5350",
  },
  "team-3": {
    color: "var(--color-team-green)",
    symbol: "triangle",
    markerClass: "marker-green",
    textClass: "text-[#7fdcb0]",
    ringColor: "#4fc18c",
  },
  "team-4": {
    color: "var(--color-team-gold)",
    symbol: "square",
    markerClass: "marker-gold",
    textClass: "text-[#e3b341]",
    ringColor: "#e3b341",
  },
};

const FALLBACK: TeamVisual = TEAM_VISUALS["team-1"] as TeamVisual;

export function teamVisual(teamId: string | null | undefined): TeamVisual {
  if (!teamId) return FALLBACK;
  return TEAM_VISUALS[teamId] ?? FALLBACK;
}

/** Accessible marker description, e.g. "Blue circle marker". */
export function markerLabel(teamId: string, teamName: string): string {
  const visual = teamVisual(teamId);
  return `${teamName} ${visual.symbol} marker`;
}

/** SVG symbol shapes used inside markers and legends. */
export function markerSymbolPath(symbol: TeamVisual["symbol"]): string {
  switch (symbol) {
    case "circle":
      return "M12 4a8 8 0 1 0 0 16 8 8 0 0 0 0-16zm0 4.5a3.5 3.5 0 1 1 0 7 3.5 3.5 0 0 1 0-7z";
    case "diamond":
      return "M12 3l9 9-9 9-9-9 9-9z";
    case "triangle":
      return "M12 4l9 16H3l9-16z";
    case "square":
      return "M4.5 4.5h15v15h-15z";
  }
}
