export const ogImagePath = (slug = "home") =>
  `/og/${slug.split("/").map(encodeURIComponent).join("/")}.png`;
