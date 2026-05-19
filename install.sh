#!/usr/bin/env sh
set -eu

APP_ID="calendar-time-tool"
APP_TITLE="Calendar Time Tool"
DEFAULT_INSTALL_DIR="$HOME/.local/share/$APP_ID"
DEFAULT_BIN_DIR="$HOME/.local/bin"
INSTALL_DIR="${CALENDAR_TIME_TOOL_HOME:-$DEFAULT_INSTALL_DIR}"
BIN_DIR="${CALENDAR_TIME_TOOL_BIN:-$DEFAULT_BIN_DIR}"
BIN_PATH="$BIN_DIR/$APP_ID"
DESKTOP_LAUNCHER="$HOME/Desktop/$APP_TITLE.command"
CREATE_DESKTOP=1
ACTION="install"

usage() {
  cat <<USAGE
Usage: ./install.sh [options]

Options:
  --no-desktop    Do not create a macOS Desktop launcher.
  --uninstall     Remove installed files and launchers.
  -h, --help      Show this help text.

Environment:
  CALENDAR_TIME_TOOL_HOME  Install location. Default: ~/.local/share/calendar-time-tool
  CALENDAR_TIME_TOOL_BIN   Command location. Default: ~/.local/bin
USAGE
}

while [ "$#" -gt 0 ]; do
  case "$1" in
    --no-desktop)
      CREATE_DESKTOP=0
      ;;
    --uninstall)
      ACTION="uninstall"
      ;;
    -h | --help)
      usage
      exit 0
      ;;
    *)
      echo "Unknown option: $1" >&2
      usage >&2
      exit 1
      ;;
  esac
  shift
done

SOURCE_DIR="$(cd "$(dirname "$0")" && pwd)"

escape_for_double_quotes() {
  printf '%s' "$1" | sed 's/["\`$\\]/\\&/g'
}

write_command_launcher() {
  mkdir -p "$BIN_DIR"
  escaped_install_dir="$(escape_for_double_quotes "$INSTALL_DIR")"
  cat > "$BIN_PATH" <<LAUNCHER
#!/usr/bin/env sh
set -eu

DEFAULT_APP_DIR="$escaped_install_dir"
APP_DIR="\${CALENDAR_TIME_TOOL_HOME:-\$DEFAULT_APP_DIR}"
APP_FILE="\$APP_DIR/index.html"

if [ ! -f "\$APP_FILE" ]; then
  echo "Calendar Time Tool is not installed at \$APP_FILE" >&2
  exit 1
fi

if command -v open >/dev/null 2>&1; then
  open "\$APP_FILE"
elif command -v xdg-open >/dev/null 2>&1; then
  xdg-open "\$APP_FILE" >/dev/null 2>&1 &
else
  echo "Open this file in your browser:"
  echo "\$APP_FILE"
fi
LAUNCHER
  chmod +x "$BIN_PATH"
}

write_desktop_launcher() {
  if [ "$CREATE_DESKTOP" -ne 1 ]; then
    return
  fi

  if [ "$(uname -s)" != "Darwin" ] || [ ! -d "$HOME/Desktop" ]; then
    return
  fi

  escaped_bin_path="$(escape_for_double_quotes "$BIN_PATH")"
  cat > "$DESKTOP_LAUNCHER" <<DESKTOP
#!/usr/bin/env sh
"$escaped_bin_path"
DESKTOP
  chmod +x "$DESKTOP_LAUNCHER"
}

install_app() {
  mkdir -p "$INSTALL_DIR"
  cp "$SOURCE_DIR/index.html" "$SOURCE_DIR/styles.css" "$SOURCE_DIR/app.js" "$INSTALL_DIR/"
  write_command_launcher
  write_desktop_launcher

  echo "$APP_TITLE installed."
  echo "App files: $INSTALL_DIR"
  echo "Command: $BIN_PATH"
  if [ "$CREATE_DESKTOP" -eq 1 ] && [ "$(uname -s)" = "Darwin" ] && [ -d "$HOME/Desktop" ]; then
    echo "Desktop launcher: $DESKTOP_LAUNCHER"
  fi
}

uninstall_app() {
  if [ "$INSTALL_DIR" = "/" ] || [ "$INSTALL_DIR" = "$HOME" ]; then
    echo "Refusing to remove unsafe install path: $INSTALL_DIR" >&2
    exit 1
  fi

  rm -f "$BIN_PATH"
  rm -f "$DESKTOP_LAUNCHER"
  rm -rf "$INSTALL_DIR"

  echo "$APP_TITLE removed."
}

if [ "$ACTION" = "uninstall" ]; then
  uninstall_app
else
  install_app
fi
