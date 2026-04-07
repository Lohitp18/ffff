const mongoose = require("mongoose");

const postSchema = new mongoose.Schema(
  {
    title: { type: String, required: true },
    content: { type: String, required: true },
    /** Azure Blob URL (canonical for new uploads) */
    mediaUrl: { type: String },
    mediaType: { type: String, enum: ["image", "video"] },
    /** Legacy / duplicate: image posts set imageUrl; video posts set videoUrl for older clients */
    imageUrl: { type: String },
    videoUrl: { type: String },
    userId: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
    author: { type: String },
    authorId: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    status: { type: String, enum: ["pending", "approved", "rejected"], default: "pending" },
    likes: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }],
    reports: [{
      userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
      reason: { type: String, required: true },
      description: { type: String },
      createdAt: { type: Date, default: Date.now }
    }],
    sharedFrom: {
      postId: mongoose.Schema.Types.Mixed,
      postType: String,
    },
  },
  { timestamps: true }
);

// Index for efficient queries
postSchema.index({ authorId: 1 });
postSchema.index({ status: 1 });

module.exports = mongoose.model("Post", postSchema);



