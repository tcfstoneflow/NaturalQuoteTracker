import { spawn } from 'child_process';
import path from 'path';

/**
 * Task Completion Hook
 * Plays audio notification when tasks are completed
 */
export class TaskCompletionNotifier {
  private static instance: TaskCompletionNotifier;
  private isEnabled: boolean = true;

  private constructor() {}

  public static getInstance(): TaskCompletionNotifier {
    if (!TaskCompletionNotifier.instance) {
      TaskCompletionNotifier.instance = new TaskCompletionNotifier();
    }
    return TaskCompletionNotifier.instance;
  }

  public enable(): void {
    this.isEnabled = true;
  }

  public disable(): void {
    this.isEnabled = false;
  }

  public async playCompletionSound(): Promise<void> {
    if (!this.isEnabled) {
      return;
    }

    try {
      const scriptPath = path.join(process.cwd(), 'task_completion_sound.py');
      
      const pythonProcess = spawn('python3', [scriptPath], {
        stdio: 'pipe',
        detached: true
      });

      pythonProcess.unref(); // Allow the process to run independently

      pythonProcess.on('error', (error) => {
        console.warn('Task completion sound error:', error.message);
      });

      console.log('🔊 Task completion notification triggered');
    } catch (error) {
      console.warn('Failed to play task completion sound:', error);
    }
  }

  public async notifyTaskCompleted(taskType: string, details?: string): Promise<void> {
    console.log(`✅ Task completed: ${taskType}${details ? ` - ${details}` : ''}`);
    await this.playCompletionSound();
  }
}

// Export singleton instance
export const taskNotifier = TaskCompletionNotifier.getInstance();

// Convenience function for quick access
export const notifyTaskComplete = (taskType: string, details?: string) => {
  return taskNotifier.notifyTaskCompleted(taskType, details);
};