import { readFileSync } from "node:fs";
import satori from "satori";
import { Resvg } from "@resvg/resvg-js";

export interface OgContent {
  title: string;
  subtitle?: string;
  context?: string;
  home?: boolean;
}

// Local assets keep static builds independent of font and image services.
const font = readFileSync("src/assets/fonts/og-songti.woff");
const fallbackFont = readFileSync("src/assets/fonts/og-songti-fallback.woff");
const logo = `data:image/png;base64,${readFileSync("public/img/logo-black-transparent-horizontal.png").toString("base64")}`;

export async function renderOgImage({ title, subtitle, context, home }: OgContent) {
  const length = Array.from(title).length;
  const fontSize = length > 42 ? 48 : length > 26 ? 60 : length > 14 ? 72 : 88;
  const svg = await satori(
    <div
      style={{
        width: "100%",
        height: "100%",
        display: "flex",
        flexDirection: "column",
        background: "#fff",
        color: "#171717",
        padding: "56px 72px",
        fontFamily: "Songti, Songti Fallback",
      }}
    >
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          height: 88,
        }}
      >
        <img src={logo} width={157} height={88} />
        <div style={{ fontSize: 26, color: "#666" }}>{context || "包校中文文学刊物"}</div>
      </div>
      <div
        style={{
          display: "flex",
          flexDirection: "column",
          justifyContent: "center",
          flexGrow: 1,
          paddingBottom: 12,
        }}
      >
        <div style={{ fontSize: home ? 82 : fontSize, lineHeight: 1.35, wordBreak: "break-word" }}>
          {title}
        </div>
        {subtitle && <div style={{ fontSize: 28, color: "#666", marginTop: 24 }}>{subtitle}</div>}
      </div>
      <div
        style={{
          display: "flex",
          borderTop: "1px solid #d4d4d4",
          paddingTop: 22,
          fontSize: 22,
          justifyContent: "space-between",
          color: "#666",
        }}
      >
        <div>《新生》</div>
        <div>rebirthjournal.net</div>
      </div>
    </div>,
    {
      width: 1200,
      height: 630,
      fonts: [
        { name: "Songti", data: font, weight: 400, style: "normal" },
        { name: "Songti Fallback", data: fallbackFont, weight: 400, style: "normal" },
      ],
    },
  );
  const png = new Resvg(svg).render().asPng();
  return new Response(new Uint8Array(png), { headers: { "Content-Type": "image/png" } });
}
