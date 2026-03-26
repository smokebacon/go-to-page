# Changelog

All notable changes to this project will be documented in this file.

## Unreleased

### Added

- Added a README with setup instructions, usage notes, and shortcut guidance
- Added separator indicators for divider-style page results in the command bar
- Added a changelog to track project updates

### Changed

- Divider-style pages now render as blank rows instead of showing names like `-` or `---`
- Divider detection now follows Figma's page divider behavior more closely by using `isPageDivider` when available and a divider-style name pattern as fallback
- Separator and recent-page icons now define explicit light and dark theme colors so they remain visible in dark mode
- README copy was rewritten in a more casual, easier-to-read tone

### Fixed

- Fixed a bug where some non-divider page names could be misclassified as separators
- Fixed separator icons not appearing correctly in dark theme
