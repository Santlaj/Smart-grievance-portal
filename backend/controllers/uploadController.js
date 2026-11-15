const { createUploadSignature } = require("../lib/cloudinaryStorage");

const createEvidenceUpload = async (req, res) => {
  try {
    const upload = createUploadSignature({
      userId: req.user._id,
      role: req.user.role,
      contentType: req.body.contentType,
      size: req.body.size,
      purpose: req.body.purpose,
    });
    return res.status(200).json(upload);
  } catch (error) {
    const clientError = /Only |must be |supported|purpose/i.test(error.message);
    return res.status(clientError ? 400 : 503).json({
      message: clientError ? error.message : "Could not create a Cloudinary upload signature.",
    });
  }
};

module.exports = { createEvidenceUpload };
