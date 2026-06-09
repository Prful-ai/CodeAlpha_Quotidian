export interface Quote {
  id?: string;
  text: string;
  author: string;
  sentiment?: string;
  createdAt?: string; // Opt timestamp
}
