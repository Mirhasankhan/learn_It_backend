export function convertZegoS3UrlToPublicUrl(s3Url: string): string {
  const PUBLIC_BASE = "https://unkakgxmtcbtejatzoik.supabase.co/storage/v1/object/public";

  // Ensure bucket name is present
  if (!s3Url.includes("/Muath/")) {
    s3Url = s3Url.replace("/record/", "/Muath/record/");
  }

  const parts = s3Url.split("/storage/v1/s3/");
  if (parts.length !== 2) return s3Url;

  const path = parts[1]; // should now always be "Muath/record/file.mp4"
  return `${PUBLIC_BASE}/${path}`;
}
