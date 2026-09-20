# Known Limitations & Growth Roadmap

## Current Technical Debt
* Memory-Bound Idempotency: The duplicate-request cache currently lives in Node's RAM. A server restart momentarily clears this protection. 
* Geospatial Rigidity: Proximity checks currently use straight-line coordinate distance rather than actual physical routing distance.

## The Scaling Horizon (V2)
* Distributed Caching: Migrating the idempotency and rate-limiting layers to an external Redis cluster for true high availability.
* AI Vision Triage: Implementing machine learning to pre-categorize uploaded evidence (e.g., automatically tagging an image as "pothole" vs "construction waste").