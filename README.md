# Calendar Time Tool

A small browser tool for selecting available time blocks across a 7-day calendar and copying them in a readable text format.

Example output:

```text
In Pacific Time:
Fri May 22: 10:00a - 11:30a or 1:30p - 5:00p
Tues May 26: 10:30a - 1:00p & 2:00p - 5:00p
Wed May 27: 1:00p - 5:00p
```

## Use It Directly

Open `index.html` in a browser. No server, build step, or package install is required.

## Install

Clone the repo and run the installer:

```sh
git clone https://github.com/justinhlau/calendar-time-tool.git
cd calendar-time-tool
./install.sh
```

The installer copies the app files to:

```text
~/.local/share/calendar-time-tool
```

It also creates this command:

```text
~/.local/bin/calendar-time-tool
```

On macOS, it also creates a Desktop launcher:

```text
~/Desktop/Calendar Time Tool.command
```

If `~/.local/bin` is on your `PATH`, you can open the tool with:

```sh
calendar-time-tool
```

If it is not on your `PATH`, run:

```sh
~/.local/bin/calendar-time-tool
```

## Update

From the cloned repo:

```sh
git pull
./install.sh
```

## Uninstall

From the cloned repo:

```sh
./install.sh --uninstall
```

## Options

```sh
./install.sh --no-desktop
```

Installs without creating the macOS Desktop launcher.

```sh
./install.sh --help
```

Shows installer usage.

## Features

- 7-day calendar view with time running vertically.
- Weeks always display Sunday through Saturday; choosing any date jumps to that week.
- Click and drag to select an anchor-based time range within one day, even if the cursor moves horizontally across other days.
- Drag over selected blocks to remove them.
- Add an italic timezone label to the output preview.
- Choose 15, 30, or 60 minute increments.
- Adjust visible day start and end hours.
- Choose `or` or `&` between multiple ranges on the same day.
- Copy formatted output from the side panel.
