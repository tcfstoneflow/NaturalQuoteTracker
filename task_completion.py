#!/usr/bin/env python3
"""
Task completion notification system
Combines sound playing with task completion logging
"""

import subprocess
import datetime
import os

def notify_task_complete(task_description="Task completed"):
    """
    Play completion sound and log the task completion
    """
    # Log the completion
    timestamp = datetime.datetime.now().strftime("%Y-%m-%d %H:%M:%S")
    print(f"[{timestamp}] {task_description}")
    
    # Play the completion sound
    try:
        result = subprocess.run(["python3", "play_completion_sound.py"], 
                              capture_output=True, text=True)
        if result.returncode == 0:
            print(result.stdout.strip())
        else:
            print("Sound playback failed")
    except Exception as e:
        print(f"Error triggering sound: {e}")

if __name__ == "__main__":
    import sys
    description = sys.argv[1] if len(sys.argv) > 1 else "Task completed"
    notify_task_complete(description)