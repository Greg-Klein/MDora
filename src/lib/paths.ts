function detectSep(path: string): "\\" | "/" {
  if (path.includes("\\") && !path.startsWith("/")) return "\\";
  return "/";
}

function isWindowsAbsolute(src: string): boolean {
  return /^[A-Za-z]:[\\/]/.test(src);
}

function normalize(path: string, sep: "\\" | "/"): string {
  let rooted: string | null = null;
  let rest = path;

  if (sep === "/" && rest.startsWith("/")) {
    rooted = "/";
    rest = rest.slice(1);
  } else if (sep === "\\") {
    const m = /^([A-Za-z]:)[\\/]/.exec(rest);
    if (m) {
      rooted = m[1] + "\\";
      rest = rest.slice(m[0].length);
    }
  }

  const parts = rest.split(/[\\/]/).filter((p) => p.length > 0);
  const stack: string[] = [];
  for (const part of parts) {
    if (part === ".") continue;
    if (part === "..") {
      if (stack.length > 0 && stack[stack.length - 1] !== "..") {
        stack.pop();
      } else if (rooted === null) {
        stack.push("..");
      }
      continue;
    }
    stack.push(part);
  }

  if (rooted !== null) {
    return rooted + stack.join(sep);
  }
  return stack.join(sep);
}

export function dirname(path: string): string {
  const sep = detectSep(path);
  const idx = sep === "\\" ? path.lastIndexOf("\\") : path.lastIndexOf("/");
  if (idx === -1) return "";
  if (idx === 0 && sep === "/") return "/";
  return path.slice(0, idx);
}

function stripQueryAndHash(src: string): string {
  const q = src.indexOf("?");
  const h = src.indexOf("#");
  let end = src.length;
  if (q !== -1) end = Math.min(end, q);
  if (h !== -1) end = Math.min(end, h);
  return src.slice(0, end);
}

function safeDecode(src: string): string {
  try {
    return decodeURIComponent(src);
  } catch {
    return src;
  }
}

export function resolveImagePath(mdPath: string, src: string): string {
  const cleaned = safeDecode(stripQueryAndHash(src));

  if (cleaned.startsWith("/")) {
    return normalize(cleaned, "/");
  }
  if (isWindowsAbsolute(cleaned)) {
    return normalize(cleaned, "\\");
  }

  const sep = detectSep(mdPath);
  const dir = dirname(mdPath);
  if (dir === "") {
    return normalize(cleaned, sep);
  }
  const joined = dir + sep + cleaned;
  return normalize(joined, sep);
}
