const { BlobServiceClient, StorageSharedKeyCredential, generateBlobSASQueryParameters, BlobSASPermissions } = require("@azure/storage-blob");

const connectionString = process.env.AZURE_STORAGE_CONNECTION_STRING;

/** Containers aligned with storage account layout (account: alvasalumni). */
const CONTAINERS = {
  PROFILE: "profile-images",
  COVER: "cover-images",
  POSTS: "posts",
  VIDEOS: "videos",
  INSTITUTION_POSTS: "institution-posts",
};

const ALL_CONTAINERS = Object.values(CONTAINERS);

// If AZURE_STORAGE_CONNECTION_STRING is not set, uploads will fail; avoid non-error logs.

/**
 * Parse Azure Blob HTTPS URL into container + blob path.
 * @param {string} url
 * @returns {{ containerName: string, blobName: string } | null}
 */
function parseBlobUrl(url) {
  if (!url || typeof url !== "string") return null;
  try {
    const u = new URL(url);
    if (!u.hostname.endsWith(".blob.core.windows.net")) return null;
    const parts = u.pathname.split("/").filter(Boolean);
    if (parts.length < 2) return null;
    const containerName = parts[0];
    const blobName = parts.slice(1).join("/");
    return { containerName, blobName };
  } catch {
    return null;
  }
}

/**
 * Verify blob name was produced by this app for the given user: userId_timestamp_rest
 * @param {string} blobName
 * @param {string} userId Mongo ObjectId string
 */
function blobBelongsToUser(blobName, userId) {
  const uid = String(userId || "");
  const re = new RegExp(`^${uid}_\\d+_.+`, "i");
  return re.test(blobName);
}

/**
 * @param {string} containerName
 * @param {Buffer} buffer
 * @param {string} blobName full path inside container (no leading slash)
 * @param {string} contentType
 * @returns {Promise<string>} blob URL
 */
async function uploadToContainer(containerName, buffer, blobName, contentType = "application/octet-stream") {
  if (!connectionString) {
    throw new Error("Azure storage is not configured");
  }
  if (!ALL_CONTAINERS.includes(containerName)) {
    throw new Error("Invalid container");
  }

  const blobServiceClient = BlobServiceClient.fromConnectionString(connectionString);
  const containerClient = blobServiceClient.getContainerClient(containerName);
  // Do NOT attempt to enable public access. Some storage accounts disallow it and will fail here.
  await containerClient.createIfNotExists();

  const blockBlobClient = containerClient.getBlockBlobClient(blobName);
  await blockBlobClient.uploadData(buffer, {
    blobHTTPHeaders: { blobContentType: contentType },
  });

  return blockBlobClient.url;
}

/**
 * Delete blob by full HTTPS URL. Only deletes if container is allowlisted.
 * @param {string} blobUrl
 */
async function deleteBlobByUrl(blobUrl) {
  if (!connectionString || !blobUrl) {
    return { ok: false, reason: "no_config_or_url" };
  }
  const parsed = parseBlobUrl(blobUrl);
  if (!parsed) {
    return { ok: false, reason: "not_azure_blob" };
  }
  if (!ALL_CONTAINERS.includes(parsed.containerName)) {
    return { ok: false, reason: "container_not_allowed" };
  }

  try {
    const blobServiceClient = BlobServiceClient.fromConnectionString(connectionString);
    const containerClient = blobServiceClient.getContainerClient(parsed.containerName);
    const blockBlobClient = containerClient.getBlockBlobClient(parsed.blobName);
    await blockBlobClient.deleteIfExists();
    return { ok: true };
  } catch (err) {
    console.error("[azureStorage] deleteBlobByUrl:", err.message);
    return { ok: false, reason: err.message };
  }
}

/**
 * Optional: SAS for direct browser upload (returns null if not configured).
 * Requires AZURE_STORAGE_ACCOUNT_NAME + AZURE_STORAGE_ACCOUNT_KEY or parse from connection string.
 */
function tryGetAccountKeyFromConnectionString(cs) {
  const m = cs && String(cs).match(/AccountKey=([^;]+)/i);
  return m ? m[1] : null;
}

function tryGetAccountNameFromConnectionString(cs) {
  const m = cs && String(cs).match(/AccountName=([^;]+)/i);
  return m ? m[1] : null;
}

/**
 * @param {string} containerName
 * @param {string} blobName
 * @param {number} [expiresMinutes] default 15
 * @returns {{ url: string, sasToken: string } | null}
 */
function generateWriteSasForBlob(containerName, blobName, expiresMinutes = 15) {
  if (!connectionString || !ALL_CONTAINERS.includes(containerName)) return null;

  const accountName =
    process.env.AZURE_STORAGE_ACCOUNT_NAME || tryGetAccountNameFromConnectionString(connectionString);
  const accountKey =
    process.env.AZURE_STORAGE_ACCOUNT_KEY || tryGetAccountKeyFromConnectionString(connectionString);

  if (!accountName || !accountKey) {
    return null;
  }

  const sharedKeyCredential = new StorageSharedKeyCredential(accountName, accountKey);
  const expiresOn = new Date(Date.now() + expiresMinutes * 60 * 1000);

  const sas = generateBlobSASQueryParameters(
    {
      containerName,
      blobName,
      permissions: BlobSASPermissions.parse("cw"),
      expiresOn,
    },
    sharedKeyCredential
  ).toString();

  const base = `https://${accountName}.blob.core.windows.net/${containerName}/${encodeURIComponent(blobName).replace(/%2F/g, "/")}`;
  return { url: `${base}?${sas}`, sasToken: sas };
}

/**
 * Read-only SAS for serving blobs securely when public access is disabled.
 * Requires AZURE_STORAGE_ACCOUNT_NAME + AZURE_STORAGE_ACCOUNT_KEY or parse from connection string.
 * @param {string} containerName
 * @param {string} blobName
 * @param {number} [expiresMinutes] default 10
 * @returns {{ url: string, sasToken: string, expiresOn: string } | null}
 */
function generateReadSasForBlob(containerName, blobName, expiresMinutes = 10) {
  if (!connectionString || !ALL_CONTAINERS.includes(containerName)) return null;

  const accountName =
    process.env.AZURE_STORAGE_ACCOUNT_NAME || tryGetAccountNameFromConnectionString(connectionString);
  const accountKey =
    process.env.AZURE_STORAGE_ACCOUNT_KEY || tryGetAccountKeyFromConnectionString(connectionString);

  if (!accountName || !accountKey) return null;

  const sharedKeyCredential = new StorageSharedKeyCredential(accountName, accountKey);
  const expiresOn = new Date(Date.now() + expiresMinutes * 60 * 1000);

  const sas = generateBlobSASQueryParameters(
    {
      containerName,
      blobName,
      permissions: BlobSASPermissions.parse("r"),
      expiresOn,
    },
    sharedKeyCredential
  ).toString();

  const base = `https://${accountName}.blob.core.windows.net/${containerName}/${encodeURIComponent(blobName).replace(/%2F/g, "/")}`;
  return { url: `${base}?${sas}`, sasToken: sas, expiresOn: expiresOn.toISOString() };
}

/**
 * Convenience: Read-only SAS from an existing blob URL.
 * @param {string} blobUrl
 * @param {number} [expiresMinutes]
 */
function generateReadSasForUrl(blobUrl, expiresMinutes = 10) {
  const parsed = parseBlobUrl(blobUrl);
  if (!parsed) return null;
  return generateReadSasForBlob(parsed.containerName, parsed.blobName, expiresMinutes);
}

module.exports = {
  CONTAINERS,
  ALL_CONTAINERS,
  parseBlobUrl,
  blobBelongsToUser,
  uploadToContainer,
  deleteBlobByUrl,
  generateWriteSasForBlob,
  generateReadSasForBlob,
  generateReadSasForUrl,
};
