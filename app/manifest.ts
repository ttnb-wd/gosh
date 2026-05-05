import { MetadataRoute } from 'next'
 
export default function manifest(): MetadataRoute.Manifest {
  return {
    name: 'GOSH PERFUME - Luxury Perfume Studio',
    short_name: 'GOSH PERFUME',
    description: 'Premium fragrances and exclusive scents. Shop luxury perfumes, decants, and accessories.',
    start_url: '/',
    display: 'standalone',
    background_color: '#ffffff',
    theme_color: '#facc15',
    orientation: 'portrait',
    scope: '/',
    categories: ['shopping', 'lifestyle'],
  }
}
