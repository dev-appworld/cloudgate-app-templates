# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

### Changed

- Renamed display name to **Cloudgate Podcast Demo** across manifests, docs, and user-facing app strings

### Added

- Cloudgate workflow HTTP layer (`WorkflowHttpService`, `PodcastWorkflowService`) for loading podcast catalog JSON
- Workflow configuration in `appconfig.json` (`workflowGatewayUrl`, `workflowEnvironment`, etc.)
- `.cloudgate/podcast-catalog.json` as single source of truth for template podcast data
- `.cloudgate/podcast-catalog-workflow.json` and `WORKFLOW_SETUP.md` for MCP workflow creation
- Dynamic Home, Categories, Playlists, and Now Playing views bound to workflow catalog
- Episode navigation via `/home/play/:id`

## [0.5.0] - 2024-04-30

### Added

- add error module

## [0.4.1] - 2024-02-27

### Fixed

- profile menu z-index
- podcast music play button

## [0.4.0] - 2024-02-22

### Added

- button component

### Changed

- update angular minor version

## [0.3.0] - 2024-02-21

### Added

- Multi theme

## [0.2.0] - 2023-11-09

### Changed

- Upgrade angular version from 16 to 17

## [0.1.2] - 2023-10-24

### Fixed

- Scroll to top when route change (#9)

## [0.1.1] - 2023-02-03

### Fixed

- Mobile navbar menu index order
