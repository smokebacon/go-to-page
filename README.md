# Go to Page

`Go to Page` is a lightweight parameter-only Figma plugin for jumping between pages quickly from the command bar.

It adds a searchable page picker with recent-page suggestions, preserves document order for the full results list, and treats separator pages specially so they stay visible as structure without being selectable.

## What It Does

- Opens as a command bar action with no custom UI panel
- Lets you search pages by name as you type
- Shows up to 3 recently visited pages first
- Keeps the remaining page results in their original document order
- Displays separator-style pages as blank rows with a separator icon
- Prevents divider/separator rows from being selected as destinations

## How It Works

When you run the plugin, Figma shows a single `Page` parameter.

- With an empty query, the plugin shows recent pages first, then all other pages
- With a search query, the plugin shows recent matching pages first, then all other matches
- Recent pages are marked with a clock icon
- Separator pages are identified by names that contain no alphanumeric characters, such as `-` or `---`
- Separator pages appear as visual dividers in the results list and do not navigate anywhere when selected

Recent-page history is stored with `clientStorage` and automatically updated whenever you jump to a page through the plugin.

## Example Use Cases

- Jump between working pages in a large file without scrolling the page list
- Reopen the last few pages you were bouncing between
- Keep page-list separators in your file without cluttering search results with literal `-` labels

## Installation

1. Download or clone this repository.
2. In Figma, go to `Plugins` > `Development` > `Import plugin from manifest...`
3. Select [manifest.json](/Users/pchiemsombat/Library/Mobile%20Documents/com~apple~CloudDocs/Documents/go-to-page/manifest.json)

## Project Structure

- [code.js](/Users/pchiemsombat/Library/Mobile%20Documents/com~apple~CloudDocs/Documents/go-to-page/code.js): plugin logic, search suggestions, recent-page storage, and navigation
- [manifest.json](/Users/pchiemsombat/Library/Mobile%20Documents/com~apple~CloudDocs/Documents/go-to-page/manifest.json): Figma plugin manifest

## Notes

- This plugin is built for the Figma editor
- It uses the Parameters API, so there is no separate plugin window
- Freeform input is disabled; users can only select from the suggested pages
