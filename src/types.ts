export interface Task {
  id: string;
  text: string;
  completed: boolean;
  color: string;
  notes: string;
  isRecurring: boolean;
  createdAt: Date;
}

export interface Note {
  id: string;
  title: string;
  content: string;
  reminder: Date | null;
  reminderTriggered: boolean;
  createdAt: Date;
  updatedAt: Date;
}