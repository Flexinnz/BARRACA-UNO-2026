# AGENTS.md - Workspace Agent Instructions

## UI & Component Design System: Arc Library (uiarc.dev)

This workspace integrates **Arc UI Library**. All agents must follow the rules below when implementing or modifying frontend UI:

1. **Tokens & Theme**: Use semantic variables (`--background`, `--surface`, `--foreground`, `--accent`, `--border`, `--radius-*`) from `@/components/arc/foundation.css`. No raw hex or arbitrary colors.
2. **Motion**: Use motion presets from `@/components/arc/lib/motion-tokens.ts` (`spring.snappy`, `spring.smooth`, `spring.morph`). Animate only `transform` and `opacity`.
3. **Typography & Copy**:
   - Sentence case everywhere (no ALL CAPS or uppercase transforms).
   - No eyebrow/kicker text above headings.
   - No em dashes (`—`). Use commas, colons, or periods.
   - Weights: 400 and 500 only.
4. **Tools Available**:
   - Search Arc items: `node .agents/skills/arc/scripts/arc-cli.mjs search <query>`
   - Inspect item: `node .agents/skills/arc/scripts/arc-cli.mjs info <name>`
   - Install item: `npx shadcn@latest add @uiarc/<name>` or `node .agents/skills/arc/scripts/arc-cli.mjs install <name>`
   - Audit code: `node .agents/skills/arc/scripts/arc-cli.mjs check`
   - MCP Server: Configured in `.agents/plugins/arc/mcp_config.json`
