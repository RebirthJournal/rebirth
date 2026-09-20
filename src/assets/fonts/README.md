OG rendering uses the site's existing Songti fonts. Satori requires WOFF rather than WOFF2:

- `og-songti.woff`: `public/fonts/AdobeSongStd-Light.woff2`, converted without subsetting.
- `og-songti-fallback.woff`: the `凉` and `·` glyphs from `public/fonts/STSongti-SC-Black.woff2`, absent from the light font.

To regenerate, use fontTools (`fonttools` and `brotli`): load each source with `TTFont`, set `font.flavor = "woff"`, and save. For the fallback, first apply `fontTools.subset.Subsetter` with `populate(text="凉·")`.

These fonts are build-only assets. The prerendered `/og/*.png` endpoints use the shared template in `src/lib/og/image.tsx`.
