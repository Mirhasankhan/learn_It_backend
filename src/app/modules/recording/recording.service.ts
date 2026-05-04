import axios from "axios";
import crypto from "crypto";
import prisma from "../../../shared/prisma";
import { GenerateUASignature } from "../../../shared/generateSig";
import ApiError from "../../../errors/ApiErrors";

const appId = 2058616226;
const secret = "7dd30c4995d7daf1f522788971fa8008";

const startRecordingSession = async (bookingId: string) => {
  const booking = await prisma.booking.findUniqueOrThrow({
    where: { id: bookingId },
  });

  const existingRecording = await prisma.recording.findFirst({
    where: { bookingId },
  });

  if (existingRecording) {
    throw new ApiError(409, "Recording already exists for this session");
  }

  var signatureNonce = crypto.randomBytes(8).toString("hex");
  const timestamp = Math.floor(Date.now() / 1000);

  const signature = GenerateUASignature(
    appId,
    signatureNonce,
    secret,
    timestamp,
  );

  const payload = {
    RoomId: booking.roomId,
    RecordInputParams: {
      RecordMode: 1,
      StreamType: 3,
      MaxIdleTime: 60,
    },
    RecordOutputParams: {
      OutputFileFormat: "mp4",
      OutputFolder: "record/",
      CallbackUrl: "https://api.sefr.sa/record-callback",
    },
    // StorageParams: {
    //   Vendor: 1,
    //   Region: "us-east-2",
    //   Bucket: "fixzone-app-storage",
    //   AccessKeyId: "AKIAZLCWHKOCNDNUUSEH",
    //   AccessKeySecret: "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",
    //   EndPoint: "https://fixzone-app-storage.s3.us-east-2.amazonaws.com",
    // },

    // StorageParams: {
    //   Vendor: 10,
    //   Region: "lon1",
    //   Bucket: "sefr",
    //   AccessKeyId: "DO00UNHU7XXEV6XCFQNZ",
    //   AccessKeySecret: "+n0RwVumsO8IKSeO4Uc2HSUr+Bi9i60cgi9x0P3veis",
    //   EndPoint: "https://sefr.lon1.digitaloceanspaces.com",
    //   ACL: "public-read",
    // },
    StorageParams: {
      Vendor: 10,
      Region: "lon1",
      Bucket: "sefr",
      AccessKeyId: "DO00UNHU7XXEV6XCFQNZ",
      AccessKeySecret: "+n0RwVumsO8IKSeO4Uc2HSUr+Bi9i60cgi9x0P3veis",
      EndPoint: "https://lon1.digitaloceanspaces.com"      
    },
  };

  const response: any = await axios.post(
    `https://cloudrecord-api.zego.im/?Action=StartRecord&AppId=${appId}&SignatureNonce=${signatureNonce}&Timestamp=${timestamp}&Signature=${signature}&SignatureVersion=2.0&IsTest=false`,
    payload,
    { headers: { "Content-Type": "application/json" } },
  );

  if (response.data.Message == "succeed") {
    await prisma.recording.create({
      data: {
        bookingId,
        taskId: response.data.Data.TaskId,
      },
    });
    return response.data;
  } else {
    return "Something went wrong";
  }
};

const stopRecordingSession = async (taskId: string) => {
  const signatureNonce = crypto.randomBytes(8).toString("hex");
  const timestamp = Math.floor(Date.now() / 1000);

  const signature = GenerateUASignature(
    appId,
    signatureNonce,
    secret,
    timestamp,
  );

  const payload = {
    TaskId: taskId,
  };

  const url = `https://cloudrecord-api.zego.im/?Action=StopRecord&AppId=${appId}&SignatureNonce=${signatureNonce}&Timestamp=${timestamp}&Signature=${signature}&SignatureVersion=2.0`;

  const response = await axios.post(url, payload, {
    headers: {
      "Content-Type": "application/json",
      Accept: "application/json",
    },
  });

  return response.data;
};

export const recordingServices = {
  startRecordingSession,
  stopRecordingSession,
};
