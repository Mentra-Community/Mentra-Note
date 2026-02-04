/**
 * TypeScript declarations for asset imports
 * Allows importing images and other assets in TypeScript files
 */

// Image files
declare module "*.png" {
  const content: string;
  export default content;
}

declare module "*.jpg" {
  const content: string;
  export default content;
}

declare module "*.jpeg" {
  const content: string;
  export default content;
}

declare module "*.gif" {
  const content: string;
  export default content;
}

declare module "*.webp" {
  const content: string;
  export default content;
}

// SVG files
declare module "*.svg" {
  const content: string;
  export default content;
}

// CSS files
declare module "*.css" {
  const content: { [className: string]: string };
  export default content;
}
