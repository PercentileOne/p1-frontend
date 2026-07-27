export type MCQuestion = { q: string; options: [string,string,string,string]; answer: number }
export type KeyConcept = { icon: string; title: string; body: string; deepDive: string; example: string; codeSnippet?: string | null; memoryHook: string; examTrap: string }
export type LessonData = { title: string; subject: string; category: string; emoji: string; hook: string; keyConcepts: KeyConcept[]; misconceptions: { wrong: string; right: string }[]; glossary: { term: string; def: string }[]; examQuestions: string[]; examAnswers: string[]; mcQuestions: MCQuestion[] }
export type LessonProgress = { conceptsUnderstood: boolean[]; misconceptionsUnderstood: boolean[]; completedAt?: string }
export type SavedLesson = { id: string; userId: string; subject: string; language: string; createdAt: string; lesson: LessonData; progress: LessonProgress }
