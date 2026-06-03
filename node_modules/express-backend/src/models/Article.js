import mongoose from "mongoose";

const articleSchema = new mongoose.Schema(
  {
    sourceId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Source",
      required: true,
    },
    title: { type: String, required: true, trim: true },
    url: { type: String, required: true, unique: true, trim: true },
    contentHash: { type: String, required: true, index: true },
    summary: { type: String, default: "" },
    imageUrl: { type: String, default: "" },
    videoUrl: { type: String, default: "" },      // YouTube / direct MP4 URL
    videoEmbed: { type: String, default: "" },    // embed iframe src
    category: { type: String, default: "general", index: true },
    publishedAt: { type: Date, default: null },
    scrapedAt: { type: Date, default: () => new Date() },
  },
  { timestamps: true },
);

articleSchema.index({ sourceId: 1, publishedAt: -1, createdAt: -1 });
articleSchema.index({ category: 1, publishedAt: -1 });

export const Article = mongoose.model("Article", articleSchema);
