import React from 'react';
import { Helmet } from 'react-helmet-async';

const DEFAULT_KEYWORDS =
  "interior designers, exterior designers, commercial designers, home designers, office designers, Vishwakarmans";

const SEO = ({ title, description, keywords, canonical, schema }) => {
  const effectiveKeywords = keywords || DEFAULT_KEYWORDS;

  return (
    <Helmet>
      {title && <title>{title}</title>}
      {description && <meta name="description" content={description} />}
      <meta name="keywords" content={effectiveKeywords} />

      {/* OpenGraph tags */}
      {title && <meta property="og:title" content={title} />}
      {description && <meta property="og:description" content={description} />}
      <meta property="og:type" content="website" />
      {canonical && <meta property="og:url" content={canonical} />}

      {/* Canonical link */}
      {canonical && <link rel="canonical" href={canonical} />}

      {/* Schema / JSON-LD */}
      {schema && (
        <script type="application/ld+json">
          {JSON.stringify(schema)}
        </script>
      )}
    </Helmet>
  );
};

export default SEO;
