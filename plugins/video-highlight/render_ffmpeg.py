#!/usr/bin/env python3
"""
DJ Tripadvisor - FFmpeg-only music-reactive video renderer.

Fast alternative to the Blender pipeline. Creates a music-reactive video using
FFmpeg's built-in audio visualization + logo overlay + color effects.

Visual layers:
  1. Audio frequency visualization (showfreqs)
  2. Logo overlay (centered, semi-transparent)
  3. Color effects (hue shift, vignette)

Usage:
  python3 render_ffmpeg.py <audio.wav> <output.mp4> <logo.png> <duration> [--preview]
"""

import subprocess
import sys
import os


def render(audio_path, output_path, logo_path, duration, is_preview=False):
    w, h = (540, 540) if is_preview else (1080, 1080)
    fps = 15 if is_preview else 30
    dur = min(5, float(duration)) if is_preview else float(duration)
    preset = "ultrafast" if is_preview else "medium"
    crf = "28" if is_preview else "18"

    has_logo = os.path.exists(logo_path)
    logo_w = int(w * 0.35)

    # Build filter graph
    # Base: audio visualization with showfreqs
    viz_filter = (
        f"[0:a]showfreqs=s={w}x{h}:mode=bar:ascale=log:fscale=log:"
        f"colors=0xff1493|0x8b5cf6|0x06b6d4|0xf43f5e:win_size=2048:"
        f"win_func=hanning[viz_raw];"
        # Add dark tint and glow feel
        f"[viz_raw]eq=brightness=-0.15:contrast=1.4:saturation=1.5,"
        f"gblur=sigma=2,"
        # Blend with original for glow
        f"split[glow][sharp];"
        f"[glow]gblur=sigma=8[glowed];"
        f"[sharp][glowed]blend=all_mode=screen:all_opacity=0.4[viz]"
    )

    if has_logo:
        # Scale and overlay logo
        logo_filter = (
            f";[1:v]scale={logo_w}:-1:flags=lanczos,format=rgba,"
            f"colorchannelmixer=aa=0.7[logo_scaled];"
            # Center the logo
            f"[viz][logo_scaled]overlay=(W-w)/2:(H-h)/2:format=auto[with_logo]"
        )
        post_label = "with_logo"
    else:
        logo_filter = ""
        post_label = "viz"

    # Final color grading + vignette
    final_filter = (
        f";[{post_label}]"
        f"vignette=PI/3.5,"
        f"hue=H=sin(2*PI*t/12)*8:s=1+0.2*sin(2*PI*t/6),"
        f"unsharp=3:3:0.3"
        f"[vout]"
    )

    full_filter = viz_filter + logo_filter + final_filter

    # Build FFmpeg command
    cmd = ["ffmpeg", "-y"]

    # Input: audio
    cmd += ["-i", audio_path]

    # Input: logo (if exists)
    if has_logo:
        cmd += ["-i", logo_path]

    # Filter
    cmd += ["-filter_complex", full_filter]

    # Output mapping
    cmd += ["-map", "[vout]", "-map", "0:a"]

    # Encoding
    cmd += [
        "-c:v", "libx264",
        "-preset", preset,
        "-crf", crf,
        "-pix_fmt", "yuv420p",
        "-r", str(fps),
        "-c:a", "aac", "-b:a", "192k",
        "-t", str(dur),
        output_path
    ]

    print(f"  Rendering {w}x{h} @ {fps}fps, {dur}s ({'preview' if is_preview else 'full'})...")
    result = subprocess.run(cmd, capture_output=True, text=True)

    if result.returncode != 0:
        print(f"  FFmpeg error:\n{result.stderr[-1000:]}")
        sys.exit(1)

    print(f"  FFmpeg render complete: {output_path}")


if __name__ == "__main__":
    if len(sys.argv) < 5:
        print("Usage: render_ffmpeg.py <audio.wav> <output.mp4> <logo.png> <duration> [--preview]")
        sys.exit(1)

    audio = sys.argv[1]
    output = sys.argv[2]
    logo = sys.argv[3]
    dur = sys.argv[4]
    preview = "--preview" in sys.argv

    render(audio, output, logo, dur, preview)
