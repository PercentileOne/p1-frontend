import { describe, it, expect } from 'vitest';
import { amazonUkUrl, isbn10From13, AMAZON_UK_TAG } from './amazonLink';

describe('Amazon UK links', () => {
  it('turns a 978 ISBN-13 into its ISBN-10', () => {
    expect(isbn10From13('9781449373320')).toBe('1449373321');   // Designing Data-Intensive Applications
    expect(isbn10From13('9780804429573')).toBe('080442957X');   // check digit X
    expect(isbn10From13('9780735211292')).toBe('0735211299');   // Atomic Habits
  });

  it('has no ISBN-10 for a 979 book or anything that is not 13 digits', () => {
    expect(isbn10From13('9798664653403')).toBeNull();
    expect(isbn10From13('12345')).toBeNull();
  });

  it('links to the product page with our tag, or to an ISBN search for a 979 book', () => {
    expect(amazonUkUrl('9781449373320')).toBe(`https://www.amazon.co.uk/dp/1449373321?tag=${AMAZON_UK_TAG}`);
    expect(amazonUkUrl('9798664653403')).toBe(`https://www.amazon.co.uk/s?k=9798664653403&tag=${AMAZON_UK_TAG}`);
  });
});
