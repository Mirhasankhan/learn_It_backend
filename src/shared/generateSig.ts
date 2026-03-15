import crypto from "crypto";

export function GenerateUASignature(
  appId: number,
  signatureNonce: string,
  serverSecret: string,
  timeStamp: any
) {
  const hash = crypto.createHash("md5"); // Specifies the use of the MD5 algorithm in hash functions
  var str = appId + signatureNonce + serverSecret + timeStamp;
  hash.update(str);

  return hash.digest("hex");
}
