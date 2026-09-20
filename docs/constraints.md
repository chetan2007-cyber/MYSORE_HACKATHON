# Defense Against Core Constraints

1. Fake Complaints (People Will Lie): Mitigated by future geo-verification and immutable evidence appending.
2. Unclear Responsibility (Boundary Changes): Cases store a static `jurisdiction_version_id` at creation so shifting boundaries do not break active tickets.
3. Unequal Urgency: Solved via the Contextual Urgency Triage algorithm, prioritizing school/hospital zones over dead-end streets.
4. Tricky Inputs (Duplicates): Addressed by geospatial `$nearSphere` queries to cluster identical reports within 50 meters into a single ticket.