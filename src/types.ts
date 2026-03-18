export interface Teacher {
  id: string;
  name: string;
  uid?: string;
  listId: string;
}

export interface TeacherList {
  id: string;
  name: string;
  uid: string;
  createdAt: number;
}

export interface SpinResult {
  id: string;
  teacherName: string;
  topic: string;
  timestamp: number;
  uid?: string;
}
