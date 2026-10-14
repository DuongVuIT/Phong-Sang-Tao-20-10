import { Config } from "@remotion/cli/config";

Config.setVideoImageFormat("jpeg");
// three.js cần WebGL – "swangle" (WebGL phần mềm) chạy được cả trên máy không có GPU (GitHub Actions)
Config.setChromiumOpenGlRenderer("swangle");
