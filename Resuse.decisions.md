# Reuse Decisions (from the previous "Cyber Resilience Platform" project)

The previous hackathon build targeted a broader challenge (national critical
infrastructure, MITRE ATT&CK attribution, SOAR auto-containment). This
project targets a narrower, more rigorous ML challenge (behavioral anomaly
detection + classification + explainability only). Summary of what carried
over:

| Component | Decision | Why |
|---|---|---|
| FastAPI project shape (CORS setup, `/docs` habit) | Reuse as-is | Structural pattern, not content — no reason to change |
| Git workflow, `.gitignore`, `requirements.txt` habits | Reuse as-is | Already established, works fine |
| Per-entity baseline *concept* | Reuse as-is (concept only) | Still the correct mental model for both projects |
| Multi-agent Isolation Forest (`anomaly_engine.py`) | Refactor | Repurposed as the cold-start fallback / statistical baseline layer instead of the final detector — the new brief explicitly wants a *sequence-aware* model as the primary detector, with baseline profiling as a separate deliverable |
| FastAPI wiring pattern from old `main.py` | Refactor | Kept the "one file wires everything" shape, replaced every endpoint — no `/simulate-attack`, `/honeypot`; new endpoints are `/events/ingest`, `/alerts`, `/entity/{id}/history`, `/explain/{id}` |
| Dashboard visual language (risk score, alert list, entity view) | Refactor | Kept the UX pattern (ranked queue + drill-down), dropped the Cytoscape kill-chain graph and SOAR approval UI in favor of a behavior timeline and explainability panel |
| ML core (Isolation Forest as final detector) | Rewrite | Isolation Forest is not sequence-aware and has no classification head; new brief explicitly asks for LSTM/GRU/Transformer/graph-based and multi-class attack typing |
| Data layer (UNSW-NB15 / CIC-IDS2017) | Rewrite | New brief requires a purpose-built synthetic generator matching a specific schema and attack taxonomy — public network datasets don't match this schema |
| Explainability | New (didn't really exist before) | Old project had no per-alert feature attribution; built from scratch here |
| MITRE ATT&CK RAG/LLM attribution | Removed | Not requested in the new brief; adds scope risk without being graded |
| Honeypot module | Removed | Not requested |
| SOAR orchestrator / auto-containment / approval gates | Removed | Not requested — the new brief stops at "explainable risk score" and an analyst dashboard, no automated response |
| CVE prioritization, Digital Twin | Removed | Were already "future roadmap, not built" in the old project; irrelevant to this brief |
| Cytoscape.js attack-path graph | Removed | Old project's visualization was network-topology-focused (lateral movement graph); new brief is entity-behavior-focused, better served by a timeline |

## Rationale

The evaluation criteria for this brief are: detection accuracy under
imbalance, correct attack-type classification, false-positive rate at a
realistic alert budget, explainability/analyst usability, cold-start/drift
handling, and system design — not "how many modules exist." Carrying over
MITRE/RAG/SOAR from the old project would have consumed build time on
components that aren't scored here, at the expense of the sequence model,
which is the one piece explicitly called out as a required deliverable.