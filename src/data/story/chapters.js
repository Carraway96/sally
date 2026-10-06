import { STORY_CHAPTER_01 } from "./chapter01.js";
export const STORY_CHAPTERS = [STORY_CHAPTER_01];
export function getStoryChapterById(id) { return STORY_CHAPTERS.find(c => c.id === id) || null; }
export function getStoryChapterDay(chapter, dayNumber) { return chapter?.days.find(d => d.dayNumber === dayNumber) || null; }
