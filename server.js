const express = require("express");
const multer = require("multer");
const archiver = require("archiver");
const { execFile } = require("child_process");
const fs = require("fs");
const path = require("path");
const { v4: uuid } = require("uuid");

const app = express();
const PORT = 3000;

const upload = multer({ dest: "uploads/" });

app.use(express.static("public"));

function runFFmpeg(args) {
  return new Promise((resolve, reject) => {
    execFile("ffmpeg", args, (err, stdout, stderr) => {
      if (err) return reject(stderr || err.message);
      resolve();
    });
  });
}

app.post(
  "/process",
  upload.fields([
    { name: "videos", maxCount: 50 },
    { name: "audio", maxCount: 1 },
  ]),
  async (req, res) => {
    const jobId = uuid();
    const outDir = path.join(__dirname, "output", jobId);
    fs.mkdirSync(outDir, { recursive: true });

    const videos = req.files.videos || [];
    const audio = req.files.audio ? req.files.audio[0] : null;

    const removeAudio = req.body.removeAudio === "true";
    const fadeIn = Number(req.body.fadeIn || 0);
    const fadeOut = Number(req.body.fadeOut || 0);
    const watermark = req.body.watermark || "";
    const watermarkSize = req.body.watermarkSize || "32";
    const format = req.body.format || "mp4";

    try {
      for (const video of videos) {
        const inputPath = video.path;
        const outputName =
          path.parse(video.originalname).name + "_edited." + format;

        const outputPath = path.join(outDir, outputName);

        const args = ["-y", "-i", inputPath];

        if (audio) {
          args.push("-i", audio.path);
        }

        if (watermark.trim() !== "") {
          args.push(
            "-vf",
            `drawtext=text='${watermark.replace(/'/g, "\\'")}':fontcolor=white:fontsize=${watermarkSize}:box=1:boxcolor=black@0.45:boxborderw=10:x=w-tw-30:y=h-th-30`
          );
        }

        if (audio) {
          args.push("-map", "0:v:0", "-map", "1:a:0");

          let audioFilters = [];

          if (fadeIn > 0) {
            audioFilters.push(`afade=t=in:ss=0:d=${fadeIn}`);
          }

          if (fadeOut > 0) {
            audioFilters.push(`afade=t=out:st=999999:d=${fadeOut}`);
          }

          if (audioFilters.length > 0) {
            args.push("-filter:a", audioFilters.join(","));
          }

          args.push("-shortest");
        } else if (removeAudio) {
          args.push("-an");
        }

        if (format === "webm") {
          args.push("-c:v", "libvpx-vp9", "-c:a", "libopus");
        } else {
          args.push("-c:v", "libx264", "-preset", "fast", "-crf", "23");

          if (!removeAudio || audio) {
            args.push("-c:a", "aac");
          }
        }

        args.push(outputPath);

        await runFFmpeg(args);
      }

      const zipPath = path.join(outDir, "videos_edited.zip");
      const output = fs.createWriteStream(zipPath);
      const archive = archiver("zip");

      archive.pipe(output);

      fs.readdirSync(outDir)
        .filter((file) => file !== "videos_edited.zip")
        .forEach((file) => {
          archive.file(path.join(outDir, file), { name: file });
        });

      await archive.finalize();

      output.on("close", () => {
        res.download(zipPath);
      });
    } catch (err) {
      console.error(err);
      res.status(500).send("Något gick fel vid videobearbetning.");
    }
  }
);

app.listen(PORT, () => {
  console.log(`App körs på http://localhost:${PORT}`);
});