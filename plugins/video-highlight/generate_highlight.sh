#!/usr/bin/env bash
# ─── DJ Tripadvisor - Music-Reactive Video Highlight Generator ────────────────
# Two rendering modes:
#   --mode blender  : Full 3D Blender render (high quality, trippy effects)
#   --mode ffmpeg   : FFmpeg-only render (fast, no Blender needed)
#
# Usage:
#   ./generate_highlight.sh input.mp3 output.mp4 [options]
#
# Options:
#   --start HH:MM:SS   Start time in the audio (default: 00:00:00)
#   --duration N        Clip duration in seconds (default: 30)
#   --mode MODE         blender or ffmpeg (default: blender)
#   --preview           Fast preview (lower res, 5s max)
#   --logo path.png     Logo overlay (default: ./logo.png)
#
# Requirements:
#   Both:    ffmpeg, python3
#   Blender: blender (CLI)

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"

# ─── Defaults ─────────────────────────────────────────────────────────────────
INPUT=""
OUTPUT=""
START_TIME="00:00:00"
DURATION=30
MODE="blender"
PREVIEW=false
LOGO="${SCRIPT_DIR}/logo.png"

# ─── Parse Arguments ──────────────────────────────────────────────────────────
while [[ $# -gt 0 ]]; do
    case "$1" in
        --start)    START_TIME="$2"; shift 2 ;;
        --duration) DURATION="$2"; shift 2 ;;
        --mode)     MODE="$2"; shift 2 ;;
        --preview)  PREVIEW=true; shift ;;
        --logo)     LOGO="$2"; shift 2 ;;
        -*)         echo "Unknown option: $1"; exit 1 ;;
        *)
            if [[ -z "$INPUT" ]]; then INPUT="$1"
            elif [[ -z "$OUTPUT" ]]; then OUTPUT="$1"
            fi
            shift ;;
    esac
done

if [[ -z "$INPUT" || -z "$OUTPUT" ]]; then
    echo "Usage: $0 <input_audio> <output_video> [--start HH:MM:SS] [--duration N] [--mode blender|ffmpeg] [--preview]"
    exit 1
fi

[[ ! -f "$INPUT" ]] && echo "Error: Input not found: $INPUT" && exit 1
[[ ! -f "$LOGO" ]] && echo "Warning: Logo not found: $LOGO (continuing without)"

TEMP_DIR=$(mktemp -d)
CLIP_AUDIO="${TEMP_DIR}/clip.wav"
trap "rm -rf $TEMP_DIR" EXIT

echo "─── DJ Tripadvisor Highlight Generator ───"
echo "Input:    $INPUT"
echo "Output:   $OUTPUT"
echo "Start:    $START_TIME  Duration: ${DURATION}s"
echo "Mode:     $MODE $($PREVIEW && echo '(preview)' || true)"
echo ""

# ─── Step 1: Extract audio clip ──────────────────────────────────────────────
echo "[1/3] Extracting audio clip..."
ffmpeg -y -ss "$START_TIME" -i "$INPUT" -t "$DURATION" -ar 44100 -ac 2 "$CLIP_AUDIO" \
    -loglevel warning

# ─── Step 2: Render ──────────────────────────────────────────────────────────
if [[ "$MODE" == "blender" ]]; then
    echo "[2/3] Rendering with Blender..."
    PREVIEW_FLAG=""
    $PREVIEW && PREVIEW_FLAG="--preview"
    blender -b -P "${SCRIPT_DIR}/render_blender.py" -- "$CLIP_AUDIO" "$OUTPUT" "$LOGO" $PREVIEW_FLAG
elif [[ "$MODE" == "ffmpeg" ]]; then
    echo "[2/3] Rendering with FFmpeg..."
    python3 "${SCRIPT_DIR}/render_ffmpeg.py" "$CLIP_AUDIO" "$OUTPUT" "$LOGO" "$DURATION" $($PREVIEW && echo "--preview" || true)
else
    echo "Error: Unknown mode '$MODE'. Use 'blender' or 'ffmpeg'."
    exit 1
fi

# ─── Step 3: Done ────────────────────────────────────────────────────────────
echo ""
echo "[3/3] Complete!"
FILE_SIZE=$(du -h "$OUTPUT" | cut -f1)
echo "Output: $OUTPUT ($FILE_SIZE)"
echo "─── Done ───"
