# 3D asset credits

## Referenced asset — Arena Stage Venue Props Pack

- Source: https://www.patreon.com/OlegVerenko/posts/free-3d-model-3d-168936069
- Marketplace listing: https://www.fab.com/listings/8b59f6e1-5bf5-403c-a500-7562ddecc982
- Usage status: free download; keep the creator/source link with the project
- Local fallback file: `asset-source/stage-fallbacks/arena-stage-venue-props.fbx`
- Includes a large modular arena stage, curved canopy, overhead truss, lighting rig, LED/video screen elements, spotlights, moving-head lights, barricades and platform props.

This pack was tested but is not loaded by the website. The current stage is intentionally a primitive Three.js prototype so its proportions and 360-degree layout can be edited directly in code.

## Previous assets — retained outside the web bundle

- Source: https://3dassets.dev/packs/live-music-venue-and-festival-stage
- License: CC0 1.0 Universal (no attribution required)
- Local file: `asset-source/stage-fallbacks/festival-main-stage.glb`
- Direct source file: https://cdn.3dassets.dev/assets/33938/v1/model.glb
- Includes modular stage decking, truss, LED wall panels, line arrays, lights, barriers and FOH equipment.

## Previous asset — Main Stage

- Source: https://1designtool.com/3d/models/music-festival-main-stage
- License: 1DesignTool 3D library license — free for personal and commercial use; do not resell the file on its own
- Local file: `asset-source/stage-fallbacks/large-main-stage.glb`
- Direct source file: https://assets.stoicsoft.com/1designtool/3d/models/music-festival-main-stage/7850e5d5fd/model.glb
- Stated dimensions: approximately 27 × 14 × 13 metres; 6,680 triangles

The interactive Sơn Tùng M-TP branding, four-sided logo/video screen system, blue lighting system, audience zones, FOH control area, effects and controls are implemented in this project.

## Audience characters — Quaternius Ultimate Animated Character Pack

- Source: https://quaternius.com/packs/ultimatedanimatedcharacter
- Official download folder: https://drive.google.com/drive/folders/1sNi1AfenfPRrvRt5yfaj5QMMd6KKcUJ5?usp=sharing
- License: CC0; free for personal and commercial projects
- Original source files: `asset-source/quaternius-ultimate-animated-character-pack/gltf/`
- Web bundle: `public/assets/quaternius-crowd/` (50 embedded glTF characters from the official shared folder)
- Integrated catalog: the full available glTF set, including Casual, Chef, Cowboy, Doctor, Elf, Goblin, Kimono, Knight, Ninja, Pirate, Soldier, Suit, Viking, Witch, Wizard and Worker variants.
- The entry modal exposes all 50 models so a visitor can choose their own avatar before joining; the selected URL is also sent to the multiplayer room.

## Audience animation — Quaternius Universal Animation Library

- Source: https://quaternius.itch.io/universal-animation-library
- GLTF mirror used for the web animation library: https://github.com/J-Ponzo/gltf-universal-animation-library
- License: CC0
- Local files: `public/assets/quaternius-crowd/animation-library/`
- `Dance_Loop` is retargeted at runtime to the selected audience character rig; original character clips provide `Idle`, `Walk`, `Run`, `Victory` and other fallback motions.
