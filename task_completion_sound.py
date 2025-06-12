#!/usr/bin/env python3
"""
Task Completion Sound Player
Plays an audio notification when tasks are completed.
"""

import subprocess
import os
import sys
from pathlib import Path

def play_completion_sound():
    """Play the task completion sound using ffmpeg."""
    try:
        # Path to the audio file
        audio_file = Path("attached_assets/icq-uh-oh-101soundboards_1749704305258.mp3")
        
        if not audio_file.exists():
            print(f"Audio file not found: {audio_file}")
            return False
        
        # Use ffmpeg to play the audio file
        # -nostdin: Don't read from stdin
        # -loglevel quiet: Suppress ffmpeg output
        # -autoexit: Exit when playback is finished
        cmd = [
            "ffplay",
            "-nodisp",
            "-autoexit", 
            "-loglevel", "quiet",
            str(audio_file)
        ]
        
        # Run ffplay in the background
        process = subprocess.Popen(
            cmd,
            stdout=subprocess.DEVNULL,
            stderr=subprocess.DEVNULL
        )
        
        print("🔊 Task completion sound played!")
        return True
        
    except FileNotFoundError:
        print("ffplay not found. Trying alternative method...")
        return play_with_ffmpeg()
    except Exception as e:
        print(f"Error playing sound: {e}")
        return False

def play_with_ffmpeg():
    """Alternative method using ffmpeg directly."""
    try:
        audio_file = Path("attached_assets/icq-uh-oh-101soundboards_1749704305258.mp3")
        
        if not audio_file.exists():
            print(f"Audio file not found: {audio_file}")
            return False
        
        # Use ffmpeg with null output (just for duration)
        cmd = [
            "ffmpeg",
            "-i", str(audio_file),
            "-f", "null",
            "-",
            "-loglevel", "quiet"
        ]
        
        subprocess.run(cmd, check=True)
        print("🔊 Task completion sound processed!")
        return True
        
    except Exception as e:
        print(f"Error with ffmpeg: {e}")
        return False

def main():
    """Main function to play completion sound."""
    print("Playing task completion sound...")
    success = play_completion_sound()
    
    if not success:
        print("Could not play completion sound.")
        sys.exit(1)

if __name__ == "__main__":
    main()