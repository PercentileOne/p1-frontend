// Amazon UK affiliate links for the Feed's books (Francis, 2026-10-19). The Associates ID is public by design (it sits in every link), so it is not a secret.
// Amazon's rules: the link must be marked as an affiliate link (rel="sponsored") and the page must say "As an Amazon Associate we earn from qualifying purchases" where the links are used.
// The Associates account is provisional until it has made three qualified sales within 180 days of sign-up (the Amazon approval screen, 19 Oct 2026).

export const AMAZON_UK_TAG = 'theinterviewc-21';
export const AMAZON_DISCLOSURE = 'As an Amazon Associate we earn from qualifying purchases, at no extra cost to you.';

/** The ISBN-10 for a 978-prefixed ISBN-13, or null (979 books have no ISBN-10). */
export function isbn10From13(isbn13: string): string | null {
  if (!/^978\d{10}$/.test(isbn13)) return null;
  const nine = isbn13.slice(3, 12);
  let sum = 0;
  for (let i = 0; i < 9; i++) sum += Number(nine[i]) * (10 - i);
  const check = (11 - (sum % 11)) % 11;
  return nine + (check === 10 ? 'X' : String(check));
}

/** The book's Amazon.co.uk page with our tag; a search for the ISBN when the book has no ISBN-10. */
export function amazonUkUrl(isbn13: string): string {
  const isbn10 = isbn10From13(isbn13);
  return isbn10
    ? `https://www.amazon.co.uk/dp/${isbn10}?tag=${AMAZON_UK_TAG}`
    : `https://www.amazon.co.uk/s?k=${encodeURIComponent(isbn13)}&tag=${AMAZON_UK_TAG}`;
}
