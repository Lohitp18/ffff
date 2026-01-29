const { BlobServiceClient } = require("@azure/storage-blob");
const path = require("path");

const connectionString = process.env.AZURE_STORAGE_CONNECTION_STRING;
const containerName = process.env.AZURE_STORAGE_CONTAINER || "alvasalumni";

if (!connectionString) {
  console.warn(
    "[azureStorage] AZURE_STORAGE_CONNECTION_STRING is not set. Uploads will fail until it is configured."
  );
}

/**
 * Upload a buffer to Azure Blob Storage and return the public URL.
 * @param {Buffer} buffer
 * @param {string} filename - original filename
 * @param {string} folder - optional folder name for organization
 * @param {string} contentType - mime type
 * @returns {Promise<string>} public URL of the uploaded blob
 */
async function uploadBufferToAzure(buffer, filename, folder = "", contentType = "application/octet-stream") {
  if (!connectionString) {
    throw new Error("Azure storage is not configured");
  }

  const blobServiceClient = BlobServiceClient.fromConnectionString(connectionString);
  const containerClient = blobServiceClient.getContainerClient(containerName);
  await containerClient.createIfNotExists();

  const safeName = filename.replace(/\s+/g, "-").toLowerCase();
  const unique = `${Date.now()}-${Math.round(Math.random() * 1e9)}`;
  const blobName = folder ? `${folder}/${unique}-${safeName}` : `${unique}-${safeName}`;

  const blockBlobClient = containerClient.getBlockBlobClient(blobName);
  await blockBlobClient.uploadData(buffer, {
    blobHTTPHeaders: { blobContentType: contentType },
  });

  return blockBlobClient.url;
}

module.exports = {
  uploadBufferToAzure,
};
