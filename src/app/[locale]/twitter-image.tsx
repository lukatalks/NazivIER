// Twitter card image – same renderer as OpenGraph.
// Re-exported so Next emits both <meta property="og:image"> and
// <meta name="twitter:image"> pointing at the same branded card.

export { default, alt, size, contentType, generateStaticParams } from './opengraph-image';
