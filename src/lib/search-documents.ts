/** Small, fixed collection for the ColBERT retrieval demo. */
export const SEARCH_DOCUMENTS = [
  {
    id: 'library',
    title: 'City library',
    text: 'Borrow books, audiobooks and magazines for free at the city library.',
  },
  {
    id: 'cafe',
    title: 'Riverside café',
    text: 'Fresh coffee and homemade pastries, with a view of the river.',
  },
  {
    id: 'garden',
    title: 'Botanical garden',
    text: 'Quiet walking paths, leafy gardens and a tropical greenhouse.',
  },
  {
    id: 'station',
    title: 'Central station',
    text: 'Direct trains to the airport, leaving every fifteen minutes.',
  },
];

export type SearchDocument = (typeof SEARCH_DOCUMENTS)[number];
