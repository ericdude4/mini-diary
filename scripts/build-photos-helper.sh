#!/bin/sh
# Compile the Swift helper which reads photos and videos from Apple Photos (macOS only)

set -e

[ "$(uname)" = "Darwin" ] || exit 0

SRC_DIR="native/photos-helper"
OUT="$SRC_DIR/bin/photos-helper"

# Skip if the binary is up to date
if [ -f "$OUT" ] && [ "$OUT" -nt "$SRC_DIR/main.swift" ] && [ "$OUT" -nt "$SRC_DIR/Info.plist" ]; then
	exit 0
fi

mkdir -p "$SRC_DIR/bin"
# The Info.plist (with the Photos usage description) is embedded into the binary
swiftc -O -target arm64-apple-macos12 \
	-Xlinker -sectcreate -Xlinker __TEXT -Xlinker __info_plist -Xlinker "$SRC_DIR/Info.plist" \
	-o "$OUT" "$SRC_DIR/main.swift"
echo "Built $OUT"
