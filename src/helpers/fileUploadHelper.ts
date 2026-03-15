import multer from "multer";

const storage = multer.memoryStorage();

const upload = multer({
  storage: storage,
  limits: { fileSize: 3000 * 1024 * 1024 },
  fileFilter: (req, file, cb) => {
    const allowedMimeTypes = [
      "image/jpeg",
      "image/jpg",
      "image/png",
      "image/webp",
      "image/avif",
      "video/mp4",
      "video/x-matroska",
      "application/pdf",
    ];
    if (!allowedMimeTypes.includes(file.mimetype)) {
      return cb(new Error("File type not allowed") as unknown as null, false);
    }
    cb(null, true);
  },
});

// upload single image
const videoUrl = upload.single("videoUrl");
const profileImage = upload.single("profileImage");
const cvUrl = upload.single("cvUrl");
const serviceImage = upload.single("serviceImage");
const fileUrl = upload.single("fileUrl");

// upload multiple image
const uploadMultiple = upload.fields([
  { name: "profileImage", maxCount: 1 },
  { name: "introVideo", maxCount: 1 },
  { name: "fileUrl", maxCount: 1 },
  { name: "certificateUrl", maxCount: 5 },
  { name: "cvUrl", maxCount: 1 }
]);

export const fileUploader = {
  upload,
  videoUrl,
  uploadMultiple,
  profileImage,
  cvUrl,
  fileUrl,
  serviceImage
};
