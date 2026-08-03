"use client";

import React, { useCallback, useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import {
  Check,
  Languages,
  Loader2,
  Pencil,
  Play,
  Plus,
  Trash2,
  X,
} from "lucide-react";
import { Button } from "../ui/button";
import { Input } from "../ui/input";
import { Switch } from "@/components/ui/switch";
import { fetchFromHasura } from "@/lib/hasuraClient";

type TutorialLanguage = {
  id: string;
  name: string;
  priority: number;
  is_active: boolean;
  videos_aggregate?: { aggregate?: { count: number } | null } | null;
};

type TutorialVideo = {
  id: string;
  language_id: string;
  title: string;
  youtube_id: string;
  priority: number;
  is_active: boolean;
};

const GET_LANGUAGES_QUERY = `
  query GetTutorialLanguages {
    tutorial_languages(order_by: {priority: asc, name: asc}) {
      id
      name
      priority
      is_active
      videos_aggregate {
        aggregate {
          count
        }
      }
    }
  }
`;

const GET_VIDEOS_QUERY = `
  query GetTutorialVideos($languageId: uuid!) {
    tutorial_videos(where: {language_id: {_eq: $languageId}}, order_by: {priority: asc, created_at: asc}) {
      id
      language_id
      title
      youtube_id
      priority
      is_active
    }
  }
`;

const INSERT_LANGUAGE_MUTATION = `
  mutation InsertTutorialLanguage($name: String!, $priority: Int!) {
    insert_tutorial_languages_one(object: {name: $name, priority: $priority}) {
      id
      name
      priority
      is_active
    }
  }
`;

const UPDATE_LANGUAGE_MUTATION = `
  mutation UpdateTutorialLanguage($id: uuid!, $set: tutorial_languages_set_input!) {
    update_tutorial_languages_by_pk(pk_columns: {id: $id}, _set: $set) {
      id
    }
  }
`;

// The FK is ON DELETE CASCADE, so this takes the language's videos with it.
const DELETE_LANGUAGE_MUTATION = `
  mutation DeleteTutorialLanguage($id: uuid!) {
    delete_tutorial_languages_by_pk(id: $id) {
      id
    }
  }
`;

const INSERT_VIDEO_MUTATION = `
  mutation InsertTutorialVideo($languageId: uuid!, $title: String!, $youtubeId: String!, $priority: Int!) {
    insert_tutorial_videos_one(object: {language_id: $languageId, title: $title, youtube_id: $youtubeId, priority: $priority}) {
      id
    }
  }
`;

const UPDATE_VIDEO_MUTATION = `
  mutation UpdateTutorialVideo($id: uuid!, $set: tutorial_videos_set_input!) {
    update_tutorial_videos_by_pk(pk_columns: {id: $id}, _set: $set) {
      id
    }
  }
`;

const DELETE_VIDEO_MUTATION = `
  mutation DeleteTutorialVideo($id: uuid!) {
    delete_tutorial_videos_by_pk(id: $id) {
      id
    }
  }
`;

const YOUTUBE_ID_RE = /^[A-Za-z0-9_-]{11}$/;

/**
 * People paste whatever the YouTube share sheet handed them — watch links,
 * youtu.be shorteners, embed/shorts URLs, all with tracking params glued on.
 * We store the bare id, so normalise here and reject anything we can't read
 * rather than persisting a link the player will choke on later.
 */
export function parseYouTubeId(input: string): string | null {
  const raw = (input || "").trim();
  if (!raw) return null;

  // A bare id pasted on its own.
  if (YOUTUBE_ID_RE.test(raw)) return raw;

  // URL() demands a scheme; "youtu.be/ID" is a very common paste.
  const withScheme = /^[a-zA-Z][a-zA-Z0-9+.-]*:\/\//.test(raw)
    ? raw
    : `https://${raw}`;

  let url: URL;
  try {
    url = new URL(withScheme);
  } catch {
    return null;
  }

  const host = url.hostname.replace(/^www\./i, "").toLowerCase();
  const segments = url.pathname.split("/").filter(Boolean);

  let candidate: string | null = null;
  if (host === "youtu.be") {
    candidate = segments[0] ?? null;
  } else if (
    host === "youtube.com" ||
    host === "m.youtube.com" ||
    host === "music.youtube.com" ||
    host === "youtube-nocookie.com"
  ) {
    const first = segments[0] ?? "";
    if (first === "watch" || segments.length === 0) {
      candidate = url.searchParams.get("v");
    } else if (["embed", "shorts", "v", "live"].includes(first)) {
      candidate = segments[1] ?? null;
    }
  } else {
    return null;
  }

  if (!candidate) return null;
  return YOUTUBE_ID_RE.test(candidate) ? candidate : null;
}

const TutorialsManagement = () => {
  const [languages, setLanguages] = useState<TutorialLanguage[]>([]);
  const [loadingLanguages, setLoadingLanguages] = useState(true);
  const [selectedLanguageId, setSelectedLanguageId] = useState<string | null>(
    null
  );

  const [newLanguageName, setNewLanguageName] = useState("");
  const [savingLanguage, setSavingLanguage] = useState(false);
  const [editingLanguageId, setEditingLanguageId] = useState<string | null>(
    null
  );
  const [editingLanguageName, setEditingLanguageName] = useState("");

  const [videos, setVideos] = useState<TutorialVideo[]>([]);
  const [loadingVideos, setLoadingVideos] = useState(false);
  const [videoTitle, setVideoTitle] = useState("");
  const [videoLink, setVideoLink] = useState("");
  const [linkError, setLinkError] = useState<string | null>(null);
  const [savingVideo, setSavingVideo] = useState(false);
  const [editingVideoId, setEditingVideoId] = useState<string | null>(null);
  const [busyVideoId, setBusyVideoId] = useState<string | null>(null);

  const selectedLanguage = useMemo(
    () => languages.find((l) => l.id === selectedLanguageId) || null,
    [languages, selectedLanguageId]
  );

  const loadLanguages = useCallback(async () => {
    setLoadingLanguages(true);
    try {
      const res = await fetchFromHasura(GET_LANGUAGES_QUERY);
      const rows = (res?.tutorial_languages || []) as TutorialLanguage[];
      setLanguages(rows);
      setSelectedLanguageId((current) =>
        current && rows.some((r) => r.id === current)
          ? current
          : rows[0]?.id ?? null
      );
    } catch {
      toast.error("Failed to load tutorial languages");
    } finally {
      setLoadingLanguages(false);
    }
  }, []);

  useEffect(() => {
    loadLanguages();
  }, [loadLanguages]);

  const loadVideos = useCallback(async (languageId: string) => {
    setLoadingVideos(true);
    try {
      const res = await fetchFromHasura(GET_VIDEOS_QUERY, { languageId });
      setVideos((res?.tutorial_videos || []) as TutorialVideo[]);
    } catch {
      toast.error("Failed to load videos");
    } finally {
      setLoadingVideos(false);
    }
  }, []);

  useEffect(() => {
    if (!selectedLanguageId) {
      setVideos([]);
      return;
    }
    loadVideos(selectedLanguageId);
    // Switching languages abandons any half-finished edit in the video form.
    setEditingVideoId(null);
    setVideoTitle("");
    setVideoLink("");
    setLinkError(null);
  }, [selectedLanguageId, loadVideos]);

  // ── Languages ────────────────────────────────────────────────────

  const addLanguage = async () => {
    const name = newLanguageName.trim();
    if (!name) {
      toast.error("Enter a language name");
      return;
    }
    setSavingLanguage(true);
    try {
      const priority = languages.length
        ? Math.max(...languages.map((l) => l.priority)) + 1
        : 0;
      const res = await fetchFromHasura(INSERT_LANGUAGE_MUTATION, {
        name,
        priority,
      });
      const created = res?.insert_tutorial_languages_one;
      setNewLanguageName("");
      toast.success(`Added "${name}"`);
      await loadLanguages();
      if (created?.id) setSelectedLanguageId(created.id);
    } catch {
      toast.error("Failed to add language");
    } finally {
      setSavingLanguage(false);
    }
  };

  const saveLanguageName = async (lang: TutorialLanguage) => {
    const name = editingLanguageName.trim();
    if (!name) {
      toast.error("Language name can't be empty");
      return;
    }
    if (name === lang.name) {
      setEditingLanguageId(null);
      return;
    }
    try {
      await fetchFromHasura(UPDATE_LANGUAGE_MUTATION, {
        id: lang.id,
        set: { name },
      });
      setLanguages((xs) =>
        xs.map((x) => (x.id === lang.id ? { ...x, name } : x))
      );
      setEditingLanguageId(null);
      toast.success("Language renamed");
    } catch {
      toast.error("Failed to rename language");
    }
  };

  const toggleLanguageActive = async (lang: TutorialLanguage) => {
    const next = !lang.is_active;
    setLanguages((xs) =>
      xs.map((x) => (x.id === lang.id ? { ...x, is_active: next } : x))
    );
    try {
      await fetchFromHasura(UPDATE_LANGUAGE_MUTATION, {
        id: lang.id,
        set: { is_active: next },
      });
    } catch {
      setLanguages((xs) =>
        xs.map((x) => (x.id === lang.id ? { ...x, is_active: !next } : x))
      );
      toast.error("Failed to update language");
    }
  };

  const deleteLanguage = async (lang: TutorialLanguage) => {
    const count = lang.videos_aggregate?.aggregate?.count ?? 0;
    if (
      !confirm(
        `Delete "${lang.name}"?${
          count ? ` This also deletes its ${count} video(s).` : ""
        }`
      )
    )
      return;
    try {
      await fetchFromHasura(DELETE_LANGUAGE_MUTATION, { id: lang.id });
      toast.success(`Deleted "${lang.name}"`);
      if (selectedLanguageId === lang.id) setSelectedLanguageId(null);
      loadLanguages();
    } catch {
      toast.error("Failed to delete language");
    }
  };

  // ── Videos ───────────────────────────────────────────────────────

  const resetVideoForm = () => {
    setEditingVideoId(null);
    setVideoTitle("");
    setVideoLink("");
    setLinkError(null);
  };

  const startEditVideo = (video: TutorialVideo) => {
    setEditingVideoId(video.id);
    setVideoTitle(video.title);
    setVideoLink(`https://www.youtube.com/watch?v=${video.youtube_id}`);
    setLinkError(null);
  };

  const saveVideo = async () => {
    if (!selectedLanguageId) return;
    const title = videoTitle.trim();
    if (!title) {
      toast.error("Enter a title");
      return;
    }
    const youtubeId = parseYouTubeId(videoLink);
    if (!youtubeId) {
      setLinkError(
        "That doesn't look like a YouTube link. Paste a watch, youtu.be, embed or shorts URL — or the 11-character video id."
      );
      return;
    }
    setLinkError(null);
    setSavingVideo(true);
    try {
      if (editingVideoId) {
        await fetchFromHasura(UPDATE_VIDEO_MUTATION, {
          id: editingVideoId,
          set: { title, youtube_id: youtubeId },
        });
        toast.success("Video updated");
      } else {
        const priority = videos.length
          ? Math.max(...videos.map((v) => v.priority)) + 1
          : 0;
        await fetchFromHasura(INSERT_VIDEO_MUTATION, {
          languageId: selectedLanguageId,
          title,
          youtubeId,
          priority,
        });
        toast.success("Video added");
      }
      resetVideoForm();
      await loadVideos(selectedLanguageId);
      loadLanguages();
    } catch {
      toast.error(editingVideoId ? "Failed to update video" : "Failed to add video");
    } finally {
      setSavingVideo(false);
    }
  };

  const toggleVideoActive = async (video: TutorialVideo) => {
    const next = !video.is_active;
    setVideos((xs) =>
      xs.map((x) => (x.id === video.id ? { ...x, is_active: next } : x))
    );
    try {
      await fetchFromHasura(UPDATE_VIDEO_MUTATION, {
        id: video.id,
        set: { is_active: next },
      });
    } catch {
      setVideos((xs) =>
        xs.map((x) => (x.id === video.id ? { ...x, is_active: !next } : x))
      );
      toast.error("Failed to update video");
    }
  };

  const deleteVideo = async (video: TutorialVideo) => {
    if (!confirm(`Delete "${video.title}"?`)) return;
    setBusyVideoId(video.id);
    try {
      await fetchFromHasura(DELETE_VIDEO_MUTATION, { id: video.id });
      setVideos((xs) => xs.filter((x) => x.id !== video.id));
      if (editingVideoId === video.id) resetVideoForm();
      toast.success("Video deleted");
      loadLanguages();
    } catch {
      toast.error("Failed to delete video");
    } finally {
      setBusyVideoId(null);
    }
  };

  // Preview the id we'd actually store, so a bad paste is obvious before saving.
  const previewId = videoLink.trim() ? parseYouTubeId(videoLink) : null;

  return (
    <div className="grid grid-cols-1 gap-5 lg:grid-cols-[320px_minmax(0,1fr)]">
      {/* ── Languages ───────────────────────────────────────────── */}
      <section className="rounded-xl border-2 border-[#ffba79]/20 bg-[#fffefd] p-4">
        <div className="mb-3 flex items-center gap-2">
          <Languages className="h-5 w-5 text-orange-600" />
          <h2 className="text-lg font-semibold">Languages</h2>
          {!loadingLanguages && (
            <span className="rounded bg-orange-100 px-2 py-0.5 text-xs text-orange-700">
              {languages.length}
            </span>
          )}
        </div>

        <div className="flex items-center gap-2">
          <Input
            value={newLanguageName}
            onChange={(e) => setNewLanguageName(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") addLanguage();
            }}
            placeholder="e.g. English, Malayalam"
            className="bg-white"
          />
          <Button
            onClick={addLanguage}
            disabled={savingLanguage}
            className="shrink-0 bg-orange-600 text-white hover:bg-orange-700"
          >
            {savingLanguage ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Plus className="h-4 w-4" />
            )}
          </Button>
        </div>

        <div className="mt-4 space-y-2">
          {loadingLanguages ? (
            <div className="flex items-center gap-2 py-6 text-sm text-muted-foreground">
              <Loader2 className="h-4 w-4 animate-spin" /> Loading…
            </div>
          ) : languages.length === 0 ? (
            <p className="py-6 text-sm text-muted-foreground">
              No languages yet. Add one above.
            </p>
          ) : (
            languages.map((lang) => {
              const isSelected = lang.id === selectedLanguageId;
              const count = lang.videos_aggregate?.aggregate?.count ?? 0;
              return (
                <div
                  key={lang.id}
                  className={`rounded-lg border p-3 transition-colors ${
                    isSelected
                      ? "border-orange-400 bg-orange-50"
                      : "border-gray-200 bg-white hover:border-orange-200"
                  }`}
                >
                  {editingLanguageId === lang.id ? (
                    <div className="flex items-center gap-1.5">
                      <Input
                        autoFocus
                        value={editingLanguageName}
                        onChange={(e) => setEditingLanguageName(e.target.value)}
                        onKeyDown={(e) => {
                          if (e.key === "Enter") saveLanguageName(lang);
                          if (e.key === "Escape") setEditingLanguageId(null);
                        }}
                        className="h-8 bg-white"
                      />
                      <Button
                        size="icon"
                        className="h-8 w-8 shrink-0 bg-orange-600 text-white hover:bg-orange-700"
                        onClick={() => saveLanguageName(lang)}
                      >
                        <Check className="h-4 w-4" />
                      </Button>
                      <Button
                        size="icon"
                        variant="outline"
                        className="h-8 w-8 shrink-0"
                        onClick={() => setEditingLanguageId(null)}
                      >
                        <X className="h-4 w-4" />
                      </Button>
                    </div>
                  ) : (
                    <div className="flex items-center justify-between gap-2">
                      <button
                        type="button"
                        onClick={() => setSelectedLanguageId(lang.id)}
                        className="min-w-0 flex-1 text-left"
                      >
                        <p className="truncate font-medium">{lang.name}</p>
                        <p className="text-xs text-muted-foreground">
                          {count} video{count === 1 ? "" : "s"}
                          {lang.is_active ? "" : " · hidden"}
                        </p>
                      </button>
                      <div className="flex shrink-0 items-center gap-1">
                        <Switch
                          checked={lang.is_active}
                          onCheckedChange={() => toggleLanguageActive(lang)}
                          title={lang.is_active ? "Visible" : "Hidden"}
                        />
                        <Button
                          size="icon"
                          variant="ghost"
                          className="h-8 w-8"
                          title="Rename"
                          onClick={() => {
                            setEditingLanguageId(lang.id);
                            setEditingLanguageName(lang.name);
                          }}
                        >
                          <Pencil className="h-3.5 w-3.5" />
                        </Button>
                        <Button
                          size="icon"
                          variant="ghost"
                          className="h-8 w-8 text-red-600 hover:text-red-700"
                          title="Delete"
                          onClick={() => deleteLanguage(lang)}
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </Button>
                      </div>
                    </div>
                  )}
                </div>
              );
            })
          )}
        </div>
      </section>

      {/* ── Videos for the selected language ────────────────────── */}
      <section className="rounded-xl border-2 border-[#ffba79]/20 bg-[#fffefd] p-4">
        <div className="mb-3 flex items-center gap-2">
          <Play className="h-5 w-5 text-orange-600" />
          <h2 className="text-lg font-semibold">
            {selectedLanguage
              ? `Videos — ${selectedLanguage.name}`
              : "Videos"}
          </h2>
        </div>

        {!selectedLanguage ? (
          <p className="py-10 text-center text-sm text-muted-foreground">
            Pick a language on the left (or add one) to manage its videos.
          </p>
        ) : (
          <>
            <div className="rounded-lg border bg-white p-3">
              <p className="mb-2 text-sm font-medium">
                {editingVideoId ? "Edit video" : "Add a video"}
              </p>
              <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
                <Input
                  value={videoTitle}
                  onChange={(e) => setVideoTitle(e.target.value)}
                  placeholder="Title — e.g. How to add a menu item"
                  className="bg-white"
                />
                <Input
                  value={videoLink}
                  onChange={(e) => {
                    setVideoLink(e.target.value);
                    if (linkError) setLinkError(null);
                  }}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") saveVideo();
                  }}
                  placeholder="Paste the YouTube link"
                  className={`bg-white ${
                    linkError ? "border-red-500 focus-visible:ring-red-500" : ""
                  }`}
                />
              </div>

              {linkError ? (
                <p className="mt-2 text-xs text-red-600">{linkError}</p>
              ) : previewId ? (
                <p className="mt-2 text-xs text-muted-foreground">
                  Video id: <span className="font-mono">{previewId}</span>
                </p>
              ) : null}

              <div className="mt-3 flex items-center gap-2">
                <Button
                  onClick={saveVideo}
                  disabled={savingVideo}
                  className="bg-orange-600 text-white hover:bg-orange-700"
                >
                  {savingVideo ? (
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  ) : (
                    <Plus className="mr-2 h-4 w-4" />
                  )}
                  {editingVideoId ? "Save changes" : "Add video"}
                </Button>
                {editingVideoId && (
                  <Button variant="outline" onClick={resetVideoForm}>
                    Cancel
                  </Button>
                )}
              </div>
            </div>

            <div className="mt-4 space-y-2">
              {loadingVideos ? (
                <div className="flex items-center gap-2 py-6 text-sm text-muted-foreground">
                  <Loader2 className="h-4 w-4 animate-spin" /> Loading videos…
                </div>
              ) : videos.length === 0 ? (
                <p className="py-6 text-sm text-muted-foreground">
                  No videos under {selectedLanguage.name} yet.
                </p>
              ) : (
                videos.map((video) => (
                  <div
                    key={video.id}
                    className="flex items-center gap-3 rounded-lg border bg-white p-2.5"
                  >
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={`https://i.ytimg.com/vi/${video.youtube_id}/mqdefault.jpg`}
                      alt=""
                      className="h-12 w-20 shrink-0 rounded object-cover"
                    />
                    <div className="min-w-0 flex-1">
                      <p className="truncate font-medium">{video.title}</p>
                      <a
                        href={`https://www.youtube.com/watch?v=${video.youtube_id}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="truncate font-mono text-xs text-orange-700 hover:underline"
                      >
                        {video.youtube_id}
                      </a>
                    </div>
                    <div className="flex shrink-0 items-center gap-1">
                      <Switch
                        checked={video.is_active}
                        onCheckedChange={() => toggleVideoActive(video)}
                        title={video.is_active ? "Visible" : "Hidden"}
                      />
                      <Button
                        size="icon"
                        variant="ghost"
                        className="h-8 w-8"
                        title="Edit"
                        onClick={() => startEditVideo(video)}
                      >
                        <Pencil className="h-3.5 w-3.5" />
                      </Button>
                      <Button
                        size="icon"
                        variant="ghost"
                        className="h-8 w-8 text-red-600 hover:text-red-700"
                        title="Delete"
                        disabled={busyVideoId === video.id}
                        onClick={() => deleteVideo(video)}
                      >
                        {busyVideoId === video.id ? (
                          <Loader2 className="h-3.5 w-3.5 animate-spin" />
                        ) : (
                          <Trash2 className="h-3.5 w-3.5" />
                        )}
                      </Button>
                    </div>
                  </div>
                ))
              )}
            </div>
          </>
        )}
      </section>
    </div>
  );
};

export default TutorialsManagement;
