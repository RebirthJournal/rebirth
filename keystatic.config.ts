import React from "react";
import { collection, config, fields, singleton } from "@keystatic/core";
import { block, wrapper } from "@keystatic/core/content-components";

const repository = import.meta.env?.PUBLIC_KEYSTATIC_GITHUB_REPO;

const pathField = (description: string) =>
  fields.slug({
    name: { label: "文件路径", description, validation: { isRequired: true } },
    slug: {
      generate: (name) => name.trim(),
      description: "保留中文、空格和斜线。发布后修改路径会改变网址。",
      validation: {
        pattern: {
          regex: /^(?!.*(?:^|\/)\.{1,2}(?:\/|$))[^?#\\]+$/,
          message: "请使用相对路径，不含 ?、# 或反斜线。",
        },
      },
    },
  });

const lines = (label: string) =>
  fields.array(fields.text({ label: "文字" }), {
    label,
    itemLabel: (props) => props.value,
  });

const references = (label: string, target: string) =>
  fields.array(
    fields.relationship({ label: "条目", collection: target, validation: { isRequired: true } }),
    { label, itemLabel: (props) => props.value ?? "", description: "拖动条目调整阅读顺序。" },
  );

const body = () =>
  fields.mdx({
    label: "正文（MDX）",
    description: "空行分段，单换行保留诗歌分行。可在“+”菜单中插入图片或不缩进段落。",
    components: {
      Figure: block({
        label: "图片说明",
        schema: {
          src: fields.text({
            label: "图片路径 (例如 /img/图片.jpg)",
            validation: { isRequired: true },
          }),
          alt: fields.text({ label: "替代文本" }),
          caption: fields.text({ label: "说明 / 作者" }),
          position: fields.text({
            label: "位置",
            defaultValue: "bottom right outside",
            description: "例如 bottom right outside / bottom left inside",
          }),
        },
        ContentView(props) {
          const { src, alt, caption, position } = props.value;
          return React.createElement(
            "figure",
            {
              style: {
                margin: "1.5em 0",
                padding: "12px",
                border: "1px solid #e2e8f0",
                borderRadius: "8px",
                backgroundColor: "#f8fafc",
                textAlign: "center",
              },
            },
            src
              ? React.createElement("img", {
                  src,
                  alt: alt || "",
                  style: {
                    maxWidth: "100%",
                    maxHeight: "360px",
                    objectFit: "contain",
                    borderRadius: "4px",
                    display: "block",
                    margin: "0 auto",
                  },
                })
              : React.createElement(
                  "div",
                  { style: { padding: "2em", color: "#94a3b8" } },
                  "未设置图片路径",
                ),
            caption
              ? React.createElement(
                  "figcaption",
                  {
                    style: {
                      marginTop: "8px",
                      fontSize: "14px",
                      color: "#475569",
                      fontFamily: "serif",
                    },
                  },
                  caption,
                  position
                    ? React.createElement(
                        "span",
                        { style: { marginLeft: "8px", fontSize: "11px", color: "#94a3b8" } },
                        ` (${position})`,
                      )
                    : null,
                )
              : null,
          );
        },
      }),
      NoIndent: wrapper({
        label: "不缩进段落",
        description: "用于编者按、题记等不需首行缩进的段落",
        schema: {},
        ContentView(props) {
          return React.createElement(
            "div",
            {
              style: {
                textIndent: 0,
                borderLeft: "3px solid #94a3b8",
                paddingLeft: "12px",
                margin: "8px 0",
              },
            },
            props.children,
          );
        },
      }),
      Right: wrapper({
        label: "右对齐",
        description: "用于落款、引言出处等右对齐文字",
        schema: {},
        ContentView(props) {
          return React.createElement(
            "div",
            {
              style: {
                textAlign: "right",
                margin: "0.5em 0",
              },
            },
            props.children,
          );
        },
      }),
      Center: wrapper({
        label: "居中对齐",
        description: "用于诗歌、分隔符等居中文字",
        schema: {},
        ContentView(props) {
          return React.createElement(
            "div",
            {
              style: {
                textAlign: "center",
                margin: "0.5em 0",
              },
            },
            props.children,
          );
        },
      }),
      VerticalPoem: wrapper({
        label: "竖排诗歌",
        description: "竖排文字（从右至左，明体）",
        schema: {},
        ContentView(props) {
          return React.createElement(
            "div",
            {
              style: {
                writingMode: "vertical-rl",
                fontFamily: 'Mingti, "Songti Bold", "Songti SC", STSong, SimSun, serif',
                padding: "1em",
                border: "1px dashed #cbd5e1",
                borderRadius: "6px",
                margin: "1em auto",
                lineHeight: 1.8,
              },
            },
            props.children,
          );
        },
      }),
    },
  });

export default config({
  storage: repository
    ? { kind: "github", repo: repository as `${string}/${string}` }
    : { kind: "local" },
  ui: { brand: { name: "《新生》" } },
  collections: {
    issues: collection({
      label: "期刊",
      path: "src/content/issues/*",
      slugField: "path",
      format: "yaml",
      schema: {
        path: pathField("例如：第六期"),
        chapters: references("章节顺序", "chapters"),
      },
    }),
    chapters: collection({
      label: "章节",
      path: "src/content/chapters/**",
      slugField: "path",
      format: { contentField: "body" },
      schema: {
        path: pathField("例如：第六期/序言"),
        entry: fields.text({ label: "目录名称", description: "留空时使用章节名。" }),
        subtitle: lines("题记"),
        subtitleCite: fields.text({ label: "题记出处" }),
        articles: references("文章顺序", "articles"),
        body: body(),
      },
    }),
    articles: collection({
      label: "文章",
      path: "src/content/articles/**",
      slugField: "path",
      format: { contentField: "body" },
      columns: ["title", "author"],
      schema: {
        path: pathField("例如：第六期/序言/序言。路径最后一段也是章节内的文章锚点。"),
        title: fields.text({ label: "标题", validation: { isRequired: true } }),
        author: fields.text({ label: "作者" }),
        subtitle: fields.text({ label: "副标题（存档元数据）" }),
        heading: lines("自定义标题行（留空时显示标题和作者）"),
        hideHeading: fields.checkbox({ label: "隐藏正文标题" }),
        entry: fields.text({ label: "目录名称", description: "留空时使用标题。" }),
        hideEntry: fields.checkbox({ label: "不显示在目录中" }),
        poem: fields.checkbox({ label: "诗歌（段落不缩进）" }),
        body: body(),
      },
    }),
    images: collection({
      label: "上传图片",
      path: "src/content/images/*",
      slugField: "name",
      format: "yaml",
      schema: {
        name: fields.slug({ name: { label: "图片名称" } }),
        image: fields.image({
          label: "图片",
          directory: "public/img/uploads",
          publicPath: "/img/uploads/",
          validation: { isRequired: true },
        }),
        credit: fields.text({ label: "作者 / 说明" }),
      },
    }),
  },
  singletons: {
    journal: singleton({
      label: "网站与期刊顺序",
      path: "src/content/settings/journal",
      format: "yaml",
      schema: {
        title: fields.text({ label: "网站名称", validation: { isRequired: true } }),
        tagline: fields.text({ label: "网站简介" }),
        author: fields.text({ label: "默认作者" }),
        issues: references("期刊顺序", "issues"),
      },
    }),
    home: singleton({
      label: "首页",
      path: "src/content/settings/home",
      format: "yaml",
      schema: {
        quote: fields.text({ label: "引言", multiline: true }),
        readLabel: fields.text({ label: "阅读链接文字" }),
        issue: fields.relationship({
          label: "推荐期刊",
          collection: "issues",
          validation: { isRequired: true },
        }),
      },
    }),
    about: singleton({
      label: "关于",
      path: "src/content/settings/about",
      format: { contentField: "body" },
      schema: { title: fields.text({ label: "标题" }), body: body() },
    }),
  },
});
