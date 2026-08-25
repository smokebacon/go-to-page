# Changelog

All notable changes to this project will be documented in this file.

## Unreleased

## 1.1.0 - 2026-03-26

### Added

- Added a README with setup instructions, usage notes, and shortcut guidance
- Added separator indicators for divider-style page results in the command bar
- Added a changelog to track project updates

### Changed

- Divider-style pages now render with a Unicode divider label instead of showing names like `-` or `---`
- Divider detection now follows Figma's page divider behavior more closely by using `isPageDivider` when available and a divider-style name pattern as fallback
- Separator and recent-page icons now define explicit light and dark theme colors so they remain visible in dark mode
- README copy was rewritten in a more casual, easier-to-read tone
- Unfiltered results now show recent pages at the top while also keeping them in their original document order
- Typed search now pins only the single most recent matching page at the top
- Page names now preserve meaningful repeated, leading, and trailing spaces in the suggestion list

### Fixed

- Fixed a bug where some non-divider page names could be misclassified as separators
- Fixed separator icons not appearing correctly in dark theme
- Fixed typed search showing the pinned recent page twice
- Fixed typed search showing divider pages in the results
- Fixed suggestion loading failures by adding safer storage handling and a fallback error state
