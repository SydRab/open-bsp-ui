import { useEffect, useState } from "react";
import { pushMessageToDb } from "@/utils/MessageUtils";
import useBoundStore from "@/stores/useBoundStore";
import {
  type MessageInsert,
  type MessageRow,
  supabase,
  messageDirection,
} from "@/supabase/client";
import { mediaCategory } from "@/components/Message/media";

// [crm] P2-07: 240px is the chat bubble's own display width
// (ImageMessage.tsx's PORTRAIT_WIDTH/LANDSCAPE_WIDTH) -- no point asking
// imgproxy for more pixels than the bubble will ever show. quality 60 is a
// visibly-fine tradeoff for a preview that gets replaced by the full
// resolution the moment someone actually looks at it.
const THUMBNAIL_WIDTH = 240;
const THUMBNAIL_QUALITY = 60;

export function useMedia(message: MessageRow) {
  if (
    !(
      messageDirection(message) === "incoming" ||
      messageDirection(message) === "outgoing"
    )
  ) {
    throw new Error(
      `Message with id ${message.id} is not an incoming or outgoing message.`,
    );
  }

  if (message.content.type !== "file") {
    throw new Error(`Message with id ${message.id} is not a file message.`);
  }

  const content = message.content;
  const mediaId = content.file.uri.replace("internal://media/", ""); // Extract path from URI

  if (!mediaId) {
    throw new Error(`Message with id ${message.id} has no valid media URI.`);
  }

  const load = useBoundStore((store) =>
    store.chat.mediaLoads.get(message.id),
  ) || {
    type: "download",
    status: "pending",
    handledOnce: false,
  };
  const setLoad = useBoundStore((store) => store.chat.setMediaLoad);
  const [cancel, setCancel] = useState(false);

  // [crm] P2-07: a thumbnail only makes sense for an already-stored file
  // (load.type === "download") of a kind Storage can actually transform.
  // Stickers are images for rendering purposes (mediaCategory), but a
  // sticker is already small (animated 500KB / static 100KB, the WhatsApp
  // Cloud API limit) and often itself transparent/animated WebP -- not
  // worth a second network round-trip for.
  const canHaveThumbnail =
    load.type === "download" &&
    content.kind !== "sticker" &&
    mediaCategory(content.kind, content.file.mime_type || "") === "image";

  const thumbnail = useBoundStore((store) =>
    store.chat.mediaThumbnails.get(message.id),
  ) || { status: "pending" as const };
  const setThumbnail = useBoundStore((store) => store.chat.setMediaThumbnail);

  useEffect(() => {
    if (!canHaveThumbnail || thumbnail.status !== "pending") {
      return;
    }

    let cancelled = false;
    setThumbnail(message.id, { status: "loading" });

    supabase.storage
      .from("media")
      .download(mediaId, {
        transform: {
          width: THUMBNAIL_WIDTH,
          resize: "contain",
          quality: THUMBNAIL_QUALITY,
        },
      })
      .then(({ data, error }) => {
        if (cancelled) return;
        // Any failure -- an unsupported Storage tier, a network blip, a file
        // Storage cannot transform -- degrades identically: no thumbnail,
        // fall back to the existing full-load placeholder. No retry.
        setThumbnail(
          message.id,
          data ? { status: "done", blob: data } : { status: "unavailable" },
        );
        if (error) {
          console.warn(
            `Thumbnail unavailable for message ${message.id}, falling back to full load`,
            error,
          );
        }
      })
      .catch((error) => {
        if (cancelled) return;
        setThumbnail(message.id, { status: "unavailable" });
        console.warn(
          `Thumbnail unavailable for message ${message.id}, falling back to full load`,
          error,
        );
      });

    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [canHaveThumbnail, mediaId, message.id, thumbnail.status]);

  const uploadTask = async () => {
    if (
      !load.blob ||
      load.type === "download" ||
      load.status === "done" ||
      load.status === "loading"
    ) {
      return;
    }

    setLoad(message.id, { ...load, status: "loading", error: undefined });

    const { error } = await supabase.storage
      .from("media")
      .upload(mediaId, load.blob, {
        upsert: true,
      });

    if (cancel) {
      setCancel(false);
      return;
    }

    if (
      error &&
      error.message !== "new row violates row-level security policy" // weird Supabase bug, it might be related to React loading hooks twice during development - cabra 2024/07/30
    ) {
      setLoad(message.id, { ...load, status: "error", error: error.message });
      return;
    }

    setLoad(message.id, { ...load, status: "done" });

    !error && (await pushMessageToDb(message as MessageInsert));
  };

  const downloadTask = async () => {
    if (load.status === "done" || load.status === "loading") {
      return;
    }

    setLoad(message.id, { ...load, status: "loading", error: undefined });

    const { data, error } = await supabase.storage
      .from("media")
      .download(mediaId);

    if (cancel) {
      setCancel(false);
      return;
    }

    if (error) {
      setLoad(message.id, { ...load, status: "error", error: error.message });
      return;
    }

    setLoad(message.id, { ...load, status: "done", blob: data });
  };

  const startLoad = () => {
    setTimeout(load.type === "upload" ? uploadTask : downloadTask, 0);
  };

  const cancelLoad = () => {
    setCancel(true);
    setLoad(message.id, { ...load, status: "pending" });
  };

  const handleLoad = (filename?: string) => {
    if (!load.blob) {
      return;
    }

    setLoad(message.id, { ...load, handledOnce: true });

    const url = URL.createObjectURL(load.blob);

    const a = document.createElement("a");
    a.href = url;
    a.download = filename || crypto.randomUUID(); // TODO: improve default filename - cabra 28/05/2024
    a.click();

    URL.revokeObjectURL(url);
    // TODO: do not keep in memory files with size bigger than 10 MB, or... any document after being handled? - cabra 02/06/2024
  };

  return { load, startLoad, cancelLoad, handleLoad, thumbnail };
}
