import { useMemo, useRef, useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";

type FileKind =
  | "folder"
  | "pdf"
  | "doc"
  | "image"
  | "audio"
  | "video"
  | "other";

type FileItem = {
  id: string;
  name: string;
  size: number; // bytes
  kind: FileKind;
  tags: string[];
  updatedAt: string; // ISO
};

const initialFiles: FileItem[] = [
  {
    id: "1",
    name: "Project-Report.pdf",
    size: 235_000,
    kind: "pdf",
    tags: ["work", "Q3"],
    updatedAt: new Date().toISOString(),
  },
  {
    id: "2",
    name: "Holiday-Photo.png",
    size: 2_450_000,
    kind: "image",
    tags: ["travel"],
    updatedAt: new Date().toISOString(),
  },
  {
    id: "3",
    name: "Resume.docx",
    size: 145_000,
    kind: "doc",
    tags: ["career"],
    updatedAt: new Date().toISOString(),
  },
  {
    id: "4",
    name: "Podcast_Ep1.mp3",
    size: 8_450_000,
    kind: "audio",
    tags: ["learning"],
    updatedAt: new Date().toISOString(),
  },
  {
    id: "5",
    name: "Demo-Reel.mp4",
    size: 52_000_000,
    kind: "video",
    tags: ["portfolio"],
    updatedAt: new Date().toISOString(),
  },
];

function bytesToReadable(n: number) {
  const units = ["B", "KB", "MB", "GB", "TB"];
  let i = 0,
    v = n;
  while (v >= 1024 && i < units.length - 1) {
    v /= 1024;
    i++;
  }
  return `${v.toFixed(v >= 10 || i === 0 ? 0 : 1)} ${units[i]}`;
}

function guessKind(filename: string, mime?: string): FileKind {
  const name = filename.toLowerCase();
  if (mime?.startsWith("image/") || /\.(png|jpe?g|webp|gif|svg)$/i.test(name))
    return "image";
  if (mime?.startsWith("audio/") || /\.(mp3|wav|m4a|flac|aac)$/i.test(name))
    return "audio";
  if (mime?.startsWith("video/") || /\.(mp4|mov|avi|mkv|webm)$/i.test(name))
    return "video";
  if (/\.pdf$/i.test(name)) return "pdf";
  if (/\.(docx?|rtf|txt|md)$/i.test(name)) return "doc";
  return "other";
}

const KIND_EMOJI: Record<FileKind, string> = {
  folder: "📁",
  pdf: "📕",
  doc: "📄",
  image: "🖼️",
  audio: "🎵",
  video: "🎬",
  other: "📦",
};

type Tab = "all" | "docs" | "images" | "audio" | "videos" | "pdfs";

export default function App() {
  const [files, setFiles] = useState<FileItem[]>(initialFiles);
  const [query, setQuery] = useState("");
  const [tab, setTab] = useState<Tab>("all");
  const [dragOver, setDragOver] = useState(false);
  const [isLoggedIn, setIsLoggedIn] = useState(!!localStorage.getItem("token"));
  const [dropdownOpen, setdropdownOpen] = useState(false);
  const [selectedFileId, setSelectedFileId] = useState<string | null>(null);
  const [selectedSuggestions, setSelectedSuggestions] = useState<string[]>([]);
  const username = localStorage.getItem("username")
    ? JSON.parse(localStorage.getItem("username") as string)
    : null;
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const navigate = useNavigate();

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    const matches = (f: FileItem) =>
      (!q ||
        f.name.toLowerCase().includes(q) ||
        f.tags.some((t) => t.toLowerCase().includes(q))) &&
      (tab === "all" ||
        (tab === "docs" && (f.kind === "doc" || f.kind === "other")) ||
        (tab === "images" && f.kind === "image") ||
        (tab === "audio" && f.kind === "audio") ||
        (tab === "videos" && f.kind === "video") ||
        (tab === "pdfs" && f.kind === "pdf"));
    return files.filter(matches);
  }, [files, query, tab]);

  async function handleFiles(selected: FileList) {
    Array.from(selected).forEach(async (f, idx) => {
      const formData = new FormData();
      formData.append("file", f);

      try {
        const res = await fetch("http://localhost:5001/api/file/upload", {
          method: "POST",
          body: formData,
          headers: {
            Authorization: `Bearer ${localStorage.getItem("token")}`,
          },
        });

        if (!res.ok) throw new Error("Upload failed");
        const resp = await res.json();
        const saved = resp.file; // Assuming backend returns the saved file info

        // Update UI immediately with backend response
        setFiles((prev) => [
          {
            id: saved._id,
            name: saved.originalName,
            size: saved.size,
            kind: guessKind(saved.originalName, saved.mimeType),
            tags: saved.tags || [],
            updatedAt: saved.updatedAt,
          },
          ...prev,
        ]);
      } catch (err) {
        console.error("Upload error:", err);
      }
    });
  }

  useEffect(() => {
    // Get token from URL
    const urlParams = new URLSearchParams(window.location.search);
    const token = urlParams.get("token");

    if (token) {
      // Store in localStorage
      localStorage.setItem("token", token);
      setIsLoggedIn(true);

      // Remove token from URL
      window.history.replaceState({}, document.title, "/");
    }
  }, []);

  useEffect(() => {
    // Fetch all files from backend
    const fetchFiles = async () => {
      const token = localStorage.getItem("token");
      if (!token) return;

      try {
        const res = await fetch("http://localhost:5001/api/file/getAll", {
          headers: { Authorization: `Bearer ${token}` },
        });
        if (!res.ok) throw new Error("Failed to fetch files");
        const data = await res.json();

        // Map backend response to FileItem format
        const mapped: FileItem[] = data.map((f: any) => ({
          id: f._id,
          name: f.originalName,
          size: f.size,
          kind: guessKind(f.originalName, f.mimeType),
          tags: f.tags || [],
          updatedAt: f.updatedAt,
        }));

        setFiles(mapped);
        console.log("Fetched files:", mapped);
      } catch (err) {
        console.error("Error fetching files:", err);
      }
    };

    fetchFiles();
  }, []);

  const handleLogout = () => {
    localStorage.removeItem("token");
    setIsLoggedIn(false);
    navigate("/login");
  };

  async function applySuggestions(tags: string[]) {
    if (!selectedFileId) {
      alert("Please select a file first.");
      return;
    }

    try {
      const token = localStorage.getItem("token");
      const res = await fetch(
        `http://localhost:5001/api/file/${selectedFileId}/metadata`,
        {
          method: "PATCH",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({
            key: "tags",
            value: tags, // array of tags
          }),
        }
      );

      if (!res.ok) throw new Error("Failed to apply suggestions");

      const updatedFile = await res.json();

      // Update state with new tags
      setFiles((prev) =>
        prev.map((f) =>
          f.id === updatedFile._id ? { ...f, tags: updatedFile.tags } : f
        )
      );

      alert("Suggestions applied successfully!");
    } catch (err) {
      console.error("Error applying suggestions:", err);
      alert("Could not apply suggestions.");
    }
  }

  async function openFile(fileId: string) {
    try {
      const token = localStorage.getItem("token");
      const res = await fetch(`http://localhost:5001/api/file/${fileId}/open`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      if (!res.ok) throw new Error("Failed to open file");

      const data = await res.json();
      // data.url is the signed S3 URL
      window.open(data.url, "_blank");
    } catch (err) {
      console.error("Error opening file:", err);
      alert("Could not open the file.");
    }
  }

  async function deleteFile(fileId: string) {
    if (!window.confirm("Are you sure you want to delete this file?")) return;

    try {
      const token = localStorage.getItem("token");
      const res = await fetch(`http://localhost:5001/api/file/${fileId}`, {
        method: "DELETE",
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      if (!res.ok) throw new Error("Failed to delete file");

      // Update frontend state
      setFiles((prev) => prev.filter((f) => f.id !== fileId));
    } catch (err) {
      console.error("Delete error:", err);
      alert("Could not delete the file.");
    }
  }

  let clickTimeout: NodeJS.Timeout;

  function handleFileClick(fileId: string) {
    if (clickTimeout) clearTimeout(clickTimeout);

    clickTimeout = setTimeout(() => {
      // Single click -> select the file
      setSelectedFileId(fileId);
    }, 250); // 250ms threshold for double click
  }

  function handleFileDoubleClick(fileId: string) {
    if (clickTimeout) clearTimeout(clickTimeout);

    // Double click -> open the file
    openFile(fileId);
  }

  return (
    <div className="min-h-screen w-full bg-clouds text-white">
      {/* Top Bar */}
      <header className="sticky top-0 z-20 backdrop-blur-xl bg-black/30 border-b border-white/10">
        <div className="mx-auto max-w-7xl px-6 py-4 flex items-center gap-4">
          {/* Brand */}
          <div className="flex items-center gap-3">
            <span className="text-3xl">☁️</span>
            <h1 className="text-3xl md:text-4xl font-extrabold tracking-widest bg-gradient-to-r from-sky-400 via-fuchsia-400 to-pink-400 bg-clip-text text-transparent drop-shadow-[0_0_20px_rgba(56,189,248,0.35)]">
              MyCloud
            </h1>
          </div>

          {/* Search */}
          <div className="ml-auto flex-1 max-w-xl">
            <div className="flex items-center gap-3 rounded-2xl bg-white/5 border border-white/10 px-4 py-2 focus-within:ring-2 focus-within:ring-sky-400/60">
              <span className="text-sky-300">🔎</span>
              <input
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Search files, tags, or type…"
                className="bg-transparent outline-none w-full placeholder:text-gray-400"
              />
            </div>
          </div>

          {/* Upload */}
          <input
            ref={fileInputRef}
            type="file"
            className="hidden"
            multiple
            onChange={(e) => e.target.files && handleFiles(e.target.files)}
          />
          <button
            onClick={() => fileInputRef.current?.click()}
            className="rounded-xl bg-gradient-to-r from-sky-500 to-fuchsia-600 px-4 py-2 font-semibold shadow-[0_10px_30px_-10px_rgba(168,85,247,0.55)] hover:opacity-90 transition"
          >
            Upload
          </button>

          {isLoggedIn ? (
            <div
              onClick={() => setdropdownOpen(!dropdownOpen)}
              className="rounded-xl bg-red-500 px-4 py-2 font-semibold text-white border border-white/20 hover:bg-red-600 transition"
            >
              {username}
              {dropdownOpen && (
                <div className="absolute right-6 mt-12 w-48 bg-white/10 border border-white/20 rounded-xl shadow-lg backdrop-blur-md">
                  <button
                    onClick={handleLogout}
                    className="w-full text-left px-4 py-2 text-sm text-white hover:bg-red-600/80 rounded-t-xl"
                  >
                    Logout
                  </button>
                </div>
              )}
            </div>
          ) : (
            <button
              onClick={() => navigate("/login")}
              className="rounded-xl bg-white/10 px-4 py-2 font-semibold text-white border border-white/20 hover:bg-white/20 transition"
            >
              Login / Signup
            </button>
          )}
        </div>
      </header>

      <div className="mx-auto max-w-7xl px-6 py-6 grid grid-cols-12 gap-6">
        {/* Sidebar */}
        <aside className="col-span-12 md:col-span-3 lg:col-span-2">
          <nav className="rounded-2xl bg-white/5 border border-white/10 p-3 space-y-1 backdrop-blur-md">
            {[
              { key: "all", label: "All Files", icon: "🗂️" },
              { key: "docs", label: "Documents", icon: "📄" },
              { key: "images", label: "Images", icon: "🖼️" },
              { key: "audio", label: "Audio", icon: "🎵" },
              { key: "videos", label: "Videos", icon: "🎬" },
              { key: "pdfs", label: "PDFs", icon: "📕" },
            ].map(({ key, label, icon }) => (
              <button
                key={key}
                onClick={() => setTab(key as Tab)}
                className={`w-full flex items-center gap-3 px-3 py-2 rounded-xl transition ${
                  tab === key
                    ? "bg-gradient-to-r from-sky-500/20 to-fuchsia-600/20 border border-white/10"
                    : "hover:bg-white/10"
                }`}
              >
                <span className="text-lg">{icon}</span>
                <span className="text-sm font-medium">{label}</span>
              </button>
            ))}
          </nav>

          {/* AI Side Quick Actions */}
          <div className="mt-6 rounded-2xl bg-white/5 border border-white/10 p-4 backdrop-blur-md">
            <h3 className="text-sm font-semibold text-sky-300 mb-3">
              AI Quick Actions
            </h3>
            <div className="space-y-2">
              <button className="w-full text-left text-sm px-3 py-2 rounded-lg bg-white/5 hover:bg-white/10 transition">
                ✨ Auto-tag new uploads
              </button>
              <button className="w-full text-left text-sm px-3 py-2 rounded-lg bg-white/5 hover:bg-white/10 transition">
                🧠 Suggest smart folders
              </button>
              <button className="w-full text-left text-sm px-3 py-2 rounded-lg bg-white/5 hover:bg-white/10 transition">
                📝 Summarize long docs
              </button>
            </div>
          </div>
        </aside>

        {/* Main */}
        <main className="col-span-12 md:col-span-6 lg:col-span-7 space-y-6">
          {/* Breadcrumb + Actions */}
          <div className="flex items-center justify-between">
            <div className="text-sm text-gray-300">
              Home <span className="mx-2">/</span>
              <span className="text-white font-semibold">My Drive</span>
            </div>
            <div className="flex items-center gap-2">
              {/* Manual Folder Creation */}
              <button
                onClick={() => {
                  const folderName = prompt("Enter folder name:");
                  if (!folderName) return;
                  // Add folder to state (or send to backend)
                  setFiles((prev) => [
                    {
                      id: `folder-${Date.now()}`,
                      name: folderName,
                      size: 0,
                      kind: "folder",
                      tags: [],
                      updatedAt: new Date().toISOString(),
                    },
                    ...prev,
                  ]);
                }}
                className="rounded-lg px-3 py-2 text-sm bg-white/5 border border-white/10 hover:bg-white/10"
              >
                📁 New Folder
              </button>

              {/* File Upload */}
              <button
                onClick={() => fileInputRef.current?.click()}
                className="rounded-lg px-3 py-2 text-sm bg-gradient-to-r from-sky-500 to-fuchsia-600 hover:opacity-90"
              >
                Upload
              </button>
            </div>
          </div>

          {/* Dropzone */}
          <div
            onDragOver={(e) => {
              e.preventDefault();
              setDragOver(true);
            }}
            onDragLeave={() => setDragOver(false)}
            onDrop={(e) => {
              e.preventDefault();
              setDragOver(false);
              if (e.dataTransfer.files?.length)
                handleFiles(e.dataTransfer.files);
            }}
            className={`relative rounded-2xl border-2 border-dashed p-8 text-center transition
              ${
                dragOver
                  ? "border-sky-400 bg-sky-400/10"
                  : "border-white/15 bg-white/5"
              }
            `}
          >
            <div className="text-5xl mb-2">☁️</div>
            <div className="text-sm text-gray-300">
              Drag & drop files here, or{" "}
              <button
                className="underline decoration-sky-400/60"
                onClick={() => fileInputRef.current?.click()}
              >
                browse
              </button>
            </div>
          </div>

          {/* File Grid */}
          <section>
            <h2 className="text-sm font-semibold text-gray-300 mb-3">Files</h2>
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
              {filtered.map((f) => (
                <article
                  key={f.id}
                  onClick={() => handleFileClick(f.id)}
                  onDoubleClick={() => handleFileDoubleClick(f.id)}
                  className={`group relative cursor-pointer rounded-2xl border p-4 transition
                    ${
                      selectedFileId === f.id
                        ? "border-sky-500 bg-white/10"
                        : "border-white/10 bg-white/5"
                    }
                  `}
                  title={f.name}
                >
                  {/* Delete Button (appears on hover) */}
                  <button
                    onClick={(e) => {
                      e.stopPropagation(); // Prevent opening file
                      deleteFile(f.id);
                    }}
                    className="absolute top-2 right-2 text-red-400 hover:text-red-600 text-sm bg-white/5 px-1 rounded opacity-0 group-hover:opacity-100 transition"
                    title="Delete file"
                  >
                    🗑️
                  </button>

                  {/* File Icon */}
                  <div className="text-4xl mb-3">{KIND_EMOJI[f.kind]}</div>

                  {/* File Name */}
                  <div className="text-sm font-medium truncate">{f.name}</div>

                  {/* File Size */}
                  <div className="text-[11px] text-gray-400 mt-1">
                    {bytesToReadable(f.size)}
                  </div>

                  {/* Tags */}
                  <div className="mt-3 flex flex-wrap gap-1">
                    {f.tags.map((t, i) => (
                      <span
                        key={i}
                        className="text-[10px] px-2 py-0.5 rounded-full bg-sky-400/10 border border-sky-400/20 text-sky-300"
                      >
                        {t}
                      </span>
                    ))}
                  </div>

                  {/* Hover Glow */}
                  <div className="pointer-events-none absolute inset-0 rounded-2xl opacity-0 group-hover:opacity-100 transition bg-gradient-to-tr from-sky-500/5 via-fuchsia-500/5 to-pink-500/5 blur-2xl" />
                </article>
              ))}
              {filtered.length === 0 && (
                <div className="col-span-full text-center text-sm text-gray-400 py-10">
                  No files match your filters.
                </div>
              )}
            </div>
          </section>
        </main>

        {/* AI Suggestions Panel */}
        <aside className="col-span-12 md:col-span-3 lg:col-span-3 space-y-6">
          <div className="rounded-2xl bg-white/5 border border-white/10 p-4 backdrop-blur-md">
            <h3 className="text-sm font-semibold text-fuchsia-300">
              AI Suggestions
            </h3>
            <p className="text-xs text-gray-300 mt-2 mb-2">
              Based on names & content, here are suggested tags:
            </p>
            <div className="flex flex-wrap gap-2">
              {["work", "travel", "career", "portfolio", "learning"].map(
                (tag) => (
                  <button
                    key={tag}
                    onClick={() => {
                      setSelectedSuggestions((prev) =>
                        prev.includes(tag)
                          ? prev.filter((t) => t !== tag)
                          : [...prev, tag]
                      );
                    }}
                    className={`px-2 py-1 rounded-full text-xs ${
                      selectedSuggestions.includes(tag)
                        ? "bg-blue-500 text-white"
                        : "bg-white/10 text-white/70 hover:bg-white/20"
                    }`}
                  >
                    {tag}
                  </button>
                )
              )}
            </div>
            <button
              onClick={() => applySuggestions(selectedSuggestions)}
              disabled={selectedSuggestions.length === 0}
              className="mt-4 w-full text-center text-sm rounded-lg bg-white/5 border border-white/10 
             hover:bg-white/10 py-2 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Apply Suggestions
            </button>
          </div>

          <div className="rounded-2xl bg-white/5 border border-white/10 p-4 backdrop-blur-md">
            <h3 className="text-sm font-semibold text-sky-300">
              Smart Folders
            </h3>
            <ul className="mt-3 space-y-2 text-sm">
              <li className="flex items-center justify-between bg-white/5 rounded-lg px-3 py-2">
                <span>Receipts</span>
                <span className="text-xs text-gray-400">8 items</span>
              </li>
              <li className="flex items-center justify-between bg-white/5 rounded-lg px-3 py-2">
                <span>Travel</span>
                <span className="text-xs text-gray-400">12 items</span>
              </li>
              <li className="flex items-center justify-between bg-white/5 rounded-lg px-3 py-2">
                <span>Portfolio</span>
                <span className="text-xs text-gray-400">5 items</span>
              </li>
            </ul>
            <button className="mt-4 w-full text-center text-sm rounded-lg bg-gradient-to-r from-sky-500 to-fuchsia-600 hover:opacity-90 py-2">
              Create folders
            </button>
          </div>
        </aside>
      </div>

      {/* Footer */}
      <footer className="border-t border-white/10 bg-black/30 backdrop-blur-xl">
        <div className="mx-auto max-w-7xl px-6 py-4 text-xs text-gray-400">
          © {new Date().getFullYear()} MyCloud — Personal Cloud Storage with AI
          Organization
        </div>
      </footer>
    </div>
  );
}
