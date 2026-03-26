# Go to Page

`Go to Page` is a simple Figma plugin that helps you jump to any page fast.

It opens right in Figma's command bar, shows your recently visited pages first, and keeps the rest of your pages in their normal order. If you use pages named like `-` or `---` as visual dividers, those still show up as separators without getting in the way.

## Why It's Nice

- No extra plugin window
- Search pages as you type
- Recently visited pages show up first
- The full page list stays in document order
- Separator pages show up as clean visual dividers
- Divider rows can't be selected by accident

## How It Works

When you run the plugin, Figma gives you one field: `Page`.

- If you haven't typed anything yet, you'll see your recent pages first, then everything else
- If you search, matching recent pages show up first, followed by the rest of the matches
- Recent pages have a clock icon
- Pages named with symbols only, like `-` or `---`, are treated as separators
- Those separator pages show as blank divider rows with a small dash icon on the left
- Clicking a separator won't navigate anywhere

The plugin remembers your recent pages with `clientStorage` and updates that list whenever you jump through it.

## Good For

- Big files with lots of pages
- Quickly bouncing between the same few working pages
- Keeping your page list organized with visual separators

## Installation

1. Download or clone this repository.
2. In Figma, go to `Plugins` > `Development` > `Import plugin from manifest...`
3. Select [manifest.json](/Users/pchiemsombat/Library/Mobile%20Documents/com~apple~CloudDocs/Documents/go-to-page/manifest.json)

## Set A Shortcut

This plugin gets much better once you give it a keyboard shortcut.

1. Open Figma.
2. Go to `Menu` > `Preferences` > `Keyboard Shortcuts`.
3. Find `Go to Page` in the plugins section.
4. Assign whatever shortcut feels natural to you.

After that, you can open it instantly and jump around your file without digging through the page list.

## Project Structure

- [code.js](/Users/pchiemsombat/Library/Mobile%20Documents/com~apple~CloudDocs/Documents/go-to-page/code.js): the plugin logic
- [manifest.json](/Users/pchiemsombat/Library/Mobile%20Documents/com~apple~CloudDocs/Documents/go-to-page/manifest.json): the Figma manifest file

## Notes

- Built for the Figma editor
- Uses the Parameters API, so there's no separate UI window
- Freeform input is off, so you can only choose from actual suggested pages
