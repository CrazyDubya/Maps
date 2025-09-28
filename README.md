# NYC Transportation Map

This project provides a minimal single-page mapping application focused on New York City. It shows multiple transportation layers and includes a simple routing prototype.

## Features

- **OpenStreetMap** raster basemap rendered with [MapLibre GL JS](https://maplibre.org/).
- Overlays for NYC transportation options fetched live from the [Overpass API](https://overpass-api.de/):
  - Subway lines
  - Bus stops
  - Bike lanes
  - Ferry routes
  - Airports
- Click the map to set a start and destination, with optional via point for mixed-mode trips. Routes are requested from the [OSRM](https://project-osrm.org/) demo server.
- Departure time and deadline inputs estimate arrival and flag late trips.
- Simple reliability scoring based on locally defined scenic and dangerous segments.

All libraries and data sources used are open and permissively licensed.

## Custom Data

Scenic and dangerous segments are stored as GeoJSON under the `data/` directory. Edit or expand these files to reflect preferred scenic routes or areas to avoid.

## Development

```bash
npx serve .
```

Then open [http://localhost:3000](http://localhost:3000) or the provided address in your browser. Any static server will work.

## Testing

```bash
npm test
```

## Future Work

- Cache or host your own tiles and Overpass instance for production.
- Integrate full GTFS feeds for transit routing.
- Enhance UI for selecting specific transport layers and directions.
- Evaluate self-hosted OSRM or alternative routing engines for reliability and custom profiles.
- Add real-time data sources (e.g. MTA service alerts, traffic incidents) to improve routing reliability.
- Build a contributor-friendly database of scenic and hazardous segments with tooling for crowdsourced updates.
- Support scheduling of future trips with user-specified arrival/departure constraints and reliability estimates.
- Investigate vector tiles and client-side caching to reduce bandwidth and accelerate map rendering.
- Explore offline-first capabilities for areas with limited connectivity.
- Implement accessibility features and mobile-friendly layouts.

## Research & Development Roadmap

### Data & Infrastructure
- Host a PostGIS-backed tile server and local Overpass mirror for production readiness.
- Prototype ingestion of full GTFS schedules and real-time feeds for multimodal trip planning.
- Research open data sets for traffic speeds, bike usage, and incident reports to enrich routing.

### Routing & Algorithms
- Study multimodal routing algorithms that mix public transit, micromobility, and walking.
- Experiment with reliability scoring models that incorporate historical delay data.
- Evaluate scenic-route generation using user preferences and crowdsourced ratings.

### User Experience & UI
- Design advanced layer controls, search, and bookmarking to personalize the map.
- Conduct usability testing on desktop and mobile to refine interaction patterns.
- Provide configuration hooks for integrating custom brand themes or proprietary datasets.

### Performance & Optimization
- Profile rendering and network bottlenecks; batch network requests where possible.
- Add automated tests for performance regressions and cross-browser compatibility.
- Implement CI pipelines to lint, test, and bundle assets for production.
