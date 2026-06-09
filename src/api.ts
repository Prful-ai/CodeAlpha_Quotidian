import { collection, getDocs, addDoc } from 'firebase/firestore';
import { db, handleFirestoreError, OperationType } from './firebase';
import { Quote } from './types';
import seedData from '../quotes-seed.json';

const QUOTES_COLLECTION = 'quotes';

/**
 * Helper to determine an appropriate sentiment fallback if not defined in DB record.
 */
function getFallbackSentiment(text: string, author: string): string {
  const t = (text || '').toLowerCase();
  const a = (author || '').toLowerCase();
  if (t.includes("simplicity") || t.includes("reusable") || t.includes("read") || a.includes("einstein") || a.includes("vinci") || a.includes("abelson")) {
    return "philosophical";
  }
  if (t.includes("cheat") || t.includes("cheap") || t.includes("code") || t.includes("predict") || a.includes("torvalds") || a.includes("kay")) {
    return "stoic";
  }
  if (t.includes("great") || t.includes("success") || t.includes("value") || t.includes("future") || a.includes("jobs") || a.includes("draper")) {
    return "ambitious";
  }
  return "serene";
}

/**
 * Fetches all quotes from the Firestore quotes collection.
 */
export async function getQuotesFromDb(): Promise<Quote[]> {
  try {
    const querySnapshot = await getDocs(collection(db, QUOTES_COLLECTION));
    const quotes: Quote[] = [];
    querySnapshot.forEach((doc) => {
      const data = doc.data();
      const text = data.text as string;
      const author = data.author as string;
      quotes.push({
        id: doc.id,
        text,
        author,
        sentiment: (data.sentiment as string) || getFallbackSentiment(text, author),
      });
    });
    return quotes;
  } catch (error) {
    handleFirestoreError(error, OperationType.LIST, QUOTES_COLLECTION);
  }
}

/**
 * Seed the Firestore database with initial inspiring quotes.
 */
export async function seedQuotesInDb(): Promise<Quote[]> {
  try {
    const createdQuotes: Quote[] = [];
    for (const q of seedData) {
      const sentimentVal = q.sentiment || getFallbackSentiment(q.text, q.author);
      const docRef = await addDoc(collection(db, QUOTES_COLLECTION), {
        text: q.text,
        author: q.author,
        sentiment: sentimentVal,
      });
      createdQuotes.push({
        id: docRef.id,
        text: q.text,
        author: q.author,
        sentiment: sentimentVal,
      });
    }
    return createdQuotes;
  } catch (error) {
    handleFirestoreError(error, OperationType.CREATE, QUOTES_COLLECTION);
  }
}
