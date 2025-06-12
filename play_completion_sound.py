#!/usr/bin/env python3
"""
Task completion sound player
Plays the ICQ sound when a task is completed
"""

import os
import sys
import subprocess
import platform

def play_sound():
    """Play the completion sound file"""
    sound_file = "attached_assets/icq-uh-oh-101soundboards_1749703802999.mp3"
    
    if not os.path.exists(sound_file):
        print(f"Sound file not found: {sound_file}")
        return False
    
    system = platform.system().lower()
    
    try:
        if system == "linux":
            # Try different audio players available on Linux
            players = ["mpg123", "mpv", "vlc", "aplay", "paplay"]
            for player in players:
                if subprocess.run(["which", player], capture_output=True).returncode == 0:
                    if player == "aplay":
                        # aplay is for WAV files, skip for MP3
                        continue
                    subprocess.run([player, sound_file], capture_output=True)
                    print(f"✓ Task completed! Sound played with {player}")
                    return True
            
            # If no dedicated players found, try with python libraries
            try:
                import pygame
                pygame.mixer.init()
                pygame.mixer.music.load(sound_file)
                pygame.mixer.music.play()
                while pygame.mixer.music.get_busy():
                    pygame.time.wait(100)
                print("✓ Task completed! Sound played with pygame")
                return True
            except ImportError:
                pass
                
        elif system == "darwin":  # macOS
            subprocess.run(["afplay", sound_file], capture_output=True)
            print("✓ Task completed! Sound played with afplay")
            return True
            
        elif system == "windows":
            import winsound
            winsound.PlaySound(sound_file, winsound.SND_FILENAME)
            print("✓ Task completed! Sound played with winsound")
            return True
            
    except Exception as e:
        print(f"Error playing sound: {e}")
        return False
    
    print("No suitable audio player found")
    return False

if __name__ == "__main__":
    play_sound()