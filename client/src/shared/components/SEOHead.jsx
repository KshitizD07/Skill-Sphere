import { useEffect } from 'react';

/**
 * Helper component to dynamically manage page title & meta tags for SEO.
 */
export default function SEOHead({ title, description, keywords, ogImage }) {
  useEffect(() => {
    // Title
    const baseTitle = 'SkillSphere — Professional Skill Intelligence';
    document.title = title ? `${title} | SkillSphere` : baseTitle;

    // Meta Description
    if (description) {
      let metaDesc = document.querySelector('meta[name="description"]');
      if (metaDesc) {
        metaDesc.setAttribute('content', description);
      }
      let ogDesc = document.querySelector('meta[property="og:description"]');
      if (ogDesc) {
        ogDesc.setAttribute('content', description);
      }
    }

    // Meta Keywords
    if (keywords) {
      let metaKeywords = document.querySelector('meta[name="keywords"]');
      if (metaKeywords) {
        metaKeywords.setAttribute('content', keywords);
      }
    }

    // OG Image
    if (ogImage) {
      let ogImg = document.querySelector('meta[property="og:image"]');
      if (ogImg) {
        ogImg.setAttribute('content', ogImage);
      }
    }
  }, [title, description, keywords, ogImage]);

  return null;
}
