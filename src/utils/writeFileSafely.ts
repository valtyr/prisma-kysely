import { formatFile } from "./formatFile";
import fs from "fs";
import path from "path";

export const writeFileSafely = async (
  writeLocation: string,
  content: string
) => {
  fs.mkdirSync(path.dirname(writeLocation), {
    recursive: true,
  });

  fs.writeFileSync(writeLocation, await formatFile(content));
};

export const writeFileSafelyWithoutFormatting = async (
  writeLocation: string,
  content: string
) => {
  fs.mkdirSync(path.dirname(writeLocation), {
    recursive: true,
  });

  fs.writeFileSync(writeLocation, content);
};
