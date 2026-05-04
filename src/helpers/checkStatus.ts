import axios from "axios";
import crypto from "crypto";

const appId = 2058616226;
const serverSecret = "7dd30c4995d7daf1f522788971fa8008"; // Replace with your ServerSecret

/**
 * Generate Zego API signature
 */
function GenerateUASignature(
  appId: number,
  signatureNonce: string,
  serverSecret: string,
  timeStamp: any
) {
  const hash = crypto.createHash("md5"); // Specifies the use of the MD5 algorithm in hash functions
  var str = appId + signatureNonce + serverSecret + timeStamp;
  hash.update(str);
  // hash.digest('hex') indicates that the output format is hexadecimal
  return hash.digest("hex");
}

/**
 * Check the status of a recording task
 */
export async function checkRecordStatus(taskId: string) {
  const timestamp = Math.floor(Date.now() / 1000).toString();
  const signatureNonce = crypto.randomBytes(8).toString("hex");

  const signature = GenerateUASignature(
    appId,
    signatureNonce,
    serverSecret,
    timestamp
  );

  const url = `https://cloudrecord-api.zego.im/?Action=DescribeRecordStatus&AppId=${appId}&SignatureNonce=${signatureNonce}&Timestamp=${timestamp}&Signature=${signature}&SignatureVersion=2.0`;

  const response = await axios.post(
    url,
    { TaskId: taskId },
    {
      headers: {
        "Content-Type": "application/json",
        Accept: "application/json",
      },
      maxBodyLength: Infinity,
    }
  );

  return response.data;
}
