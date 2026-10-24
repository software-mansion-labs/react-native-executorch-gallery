import { Image } from 'react-native';
import { Skia } from '@shopify/react-native-skia';
import type { ImageBuffer } from 'react-native-executorch/cv';

import { skImageToBuffer } from '@/lib/image';

/** Bundled collection for the text-to-image retrieval demo. */
export type SearchPhoto = {
  id: string;
  source: number;
  description: string;
};

export const SEARCH_PHOTOS: SearchPhoto[] = [
  {
    id: 'food',
    source: require('../../assets/search/food.jpg'),
    description: 'A colorful plate of food',
  },
  {
    id: 'forest',
    source: require('../../assets/search/forest.jpg'),
    description: 'Sunlight in a forest',
  },
  { id: 'dog', source: require('../../assets/search/dog.jpg'), description: 'A portrait of a dog' },
  {
    id: 'city',
    source: require('../../assets/search/city.jpg'),
    description: 'Tall city buildings',
  },
];

export type SearchResult = { query: string; photos: SearchPhoto[] };

/** Reads bundled photos through the same Skia RGBA pixel conversion as the CV tasks. */
export async function readSearchPhoto(photo: SearchPhoto): Promise<ImageBuffer> {
  const uri = Image.resolveAssetSource(photo.source).uri;
  const data = await Skia.Data.fromURI(uri);
  const image = Skia.Image.MakeImageFromEncoded(data);
  if (!image) throw new Error('Could not open a collection photo. Try again.');
  try {
    return skImageToBuffer(image);
  } finally {
    image.dispose();
  }
}
