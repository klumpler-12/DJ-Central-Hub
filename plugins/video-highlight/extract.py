import os
import subprocess
import argparse

def extract_highlight(input_path, output_path, start_time, duration):
    """
    Extracts a 10-60s clip from an audio file using FFmpeg.
    start_time: SS or HH:MM:SS format
    duration: seconds
    """
    print(f"Extracting {duration}s clip from {input_path} starting at {start_time}...")
    
    if not os.path.exists(input_path):
        print(f"Error: {input_path} not found.")
        return False
        
    cmd = [
        'ffmpeg',
        '-y', # overwrite
        '-ss', str(start_time),
        '-i', input_path,
        '-t', str(duration),
        '-c:a', 'copy', # fast copy, no re-encode if possible, or use libmp3lame
        output_path
    ]
    
    try:
        subprocess.run(cmd, check=True, stdout=subprocess.DEVNULL, stderr=subprocess.STDOUT)
        print(f"Successfully extracted clip to: {output_path}")
        return True
    except subprocess.CalledProcessError as e:
        print(f"FFmpeg error: {e}")
        return False

if __name__ == "__main__":
    parser = argparse.ArgumentParser(description="Extract audio highlight for Blender.")
    parser.add_argument("input", help="Path to input audio (e.g. DJ set MP3)")
    parser.add_argument("output", help="Path to output audio clip")
    parser.add_argument("--start", default="00:00", help="Start time (SS or HH:MM:SS)")
    parser.add_argument("--duration", type=int, default=30, help="Duration in seconds (10-60)")
    
    args = parser.parse_args()
    extract_highlight(args.input, args.output, args.start, args.duration)
