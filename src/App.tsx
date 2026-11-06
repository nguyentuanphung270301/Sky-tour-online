import { Canvas, useFrame, useThree } from "@react-three/fiber";
import { Html, OrbitControls, RoundedBox, Text, useAnimations, useGLTF, useTexture } from "@react-three/drei";
import { Component, memo, Suspense, useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { ReactNode } from "react";
import { Color, Group, LoopRepeat } from "three";
import type { Mesh, PointLight, SpotLight } from "three";
import { clone as cloneSkeleton } from "three/examples/jsm/utils/SkeletonUtils.js";

type Zone = {
  id: string;
  name: string;
  shortName: string;
  description: string;
  price: string;
  seats: string;
  accent: string;
  position: [number, number, number];
  size: [number, number, number];
  rotation?: number;
};

type UserAvatar = {
  name: string;
  asset: string;
  seatIndex: number;
  position: [number, number, number];
  rotation: number;
};

type RemoteParticipant = {
  id: string;
  name: string;
  asset: string;
  lightstickColor: string;
  zoneId: string;
  seatIndex: number;
  position: [number, number, number];
  rotation: number;
  dancing: boolean;
};

type ActId = "awakening" | "golden" | "love" | "rebel" | "ours" | "encore";

type Track = {
  id: string;
  title: string;
  duration: string;
};

type NightId = "hanoi" | "danang" | "hochiminh";

type NightTrack = Track & {
  actId: ActId;
  youtubeId: string;
};

type ConcertNight = {
  id: NightId;
  city: string;
  date: string;
  month: string;
  dateLabel: string;
  venue: string;
  tagline: string;
  tracks: NightTrack[];
};

type Act = {
  id: ActId;
  number: string;
  title: string;
  theme: string;
  description: string;
  accent: string;
  secondary: string;
  background: string;
  tracks: Track[];
};

type ZoneFilter = "all" | "standing" | "seated";

type CameraMode = "front" | "bird" | "side" | "audience" | "artist" | "thirdPerson";
type ConnectionStatus = "idle" | "connecting" | "connected" | "reconnecting" | "offline" | "full";

const defaultLightstickColor = "#8edbff";
const lightstickColors = [
  { name: "SKY BLUE", value: "#8edbff" },
  { name: "NEON CYAN", value: "#4fffe1" },
  { name: "VIOLET", value: "#b98cff" },
  { name: "GOLDEN", value: "#ffd36e" },
  { name: "PINK", value: "#ff82c8" },
  { name: "WHITE", value: "#f5fbff" },
];

const acts: Act[] = [
  {
    id: "awakening",
    number: "01",
    title: "THE AWAKENING",
    theme: "Sự thức tỉnh",
    description: "Cổng trời mở ra giữa midnight blue, nơi một biểu tượng bắt đầu xuất hiện.",
    accent: "#1677ff",
    secondary: "#8edbff",
    background: "#050b1c",
    tracks: [
      { id: "01", title: "There's No One At All", duration: "03:48" },
      { id: "02", title: "Hãy Trao Cho Anh", duration: "03:46" },
      { id: "03", title: "Chạy Ngay Đi", duration: "04:05" },
      { id: "04", title: "Lạc Trôi", duration: "04:32" },
    ],
  },
  {
    id: "golden",
    number: "02",
    title: "THE GOLDEN ERA",
    theme: "Kỷ nguyên hoàng kim",
    description: "Những ký ức rực sáng của một thời kỳ đã đưa SKY bay lên thật xa.",
    accent: "#f4c76a",
    secondary: "#fff1b3",
    background: "#17101b",
    tracks: [
      { id: "05", title: "Em Của Ngày Hôm Qua", duration: "04:09" },
      { id: "06", title: "Cơn Mưa Ngang Qua", duration: "03:58" },
      { id: "07", title: "Nắng Ấm Xa Dần", duration: "04:11" },
      { id: "08", title: "Không Phải Dạng Vừa Đâu", duration: "03:51" },
      { id: "09", title: "Remember Me", duration: "04:00" },
    ],
  },
  {
    id: "love",
    number: "03",
    title: "THE LOVE STORY",
    theme: "Câu chuyện tình yêu",
    description: "Mặt trăng, ngân hà và những ký ức thanh xuân trôi chậm giữa sân vận động.",
    accent: "#713dce",
    secondary: "#e2a7ff",
    background: "#110a29",
    tracks: [
      { id: "10", title: "Âm Thầm Bên Em", duration: "04:35" },
      { id: "11", title: "Chúng Ta Không Thuộc Về Nhau", duration: "04:06" },
      { id: "12", title: "Muộn Rồi Mà Sao Còn", duration: "04:12" },
      { id: "13", title: "Có Chắc Yêu Là Đây", duration: "03:45" },
      { id: "14", title: "Nơi Này Có Anh", duration: "04:18" },
    ],
  },
  {
    id: "rebel",
    number: "04",
    title: "THE REBEL",
    theme: "Sự nổi loạn",
    description: "Cyberpunk, glitch và những đường laser của bản sắc không thể trộn lẫn.",
    accent: "#ff3d63",
    secondary: "#1677ff",
    background: "#1b0715",
    tracks: [
      { id: "15", title: "Khuôn Mặt Đáng Thương", duration: "03:52" },
      { id: "16", title: "Buông Đôi Tay Nhau Ra", duration: "04:12" },
      { id: "17", title: "Bình Yên Những Phút Giây", duration: "03:54" },
      { id: "18", title: "Making My Way", duration: "03:28" },
      { id: "19", title: "Skyler / DJ Set", duration: "06:00" },
    ],
  },
  {
    id: "ours",
    number: "05",
    title: "THE SKY IS OURS",
    theme: "Chúng ta là bầu trời",
    description: "Phượng hoàng ánh sáng bay lên, kết nối nghệ sĩ và SKY trong một đại tiệc xanh điện.",
    accent: "#1677ff",
    secondary: "#f4c76a",
    background: "#061735",
    tracks: [
      { id: "20", title: "Đừng Làm Trái Tim Anh Đau", duration: "03:32" },
      { id: "21", title: "Âm Nhạc Của Tương Lai", duration: "03:40" },
      { id: "22", title: "Hãy Trao Cho Anh (Remix)", duration: "04:02" },
      { id: "23", title: "Chạy Ngay Đi (Remix)", duration: "04:08" },
      { id: "24", title: "Lạc Trôi (Final Version)", duration: "04:44" },
    ],
  },
  {
    id: "encore",
    number: "EN",
    title: "WE ARE SKY",
    theme: "Giao lưu và kết thúc",
    description: "Hàng nghìn lightstick cùng bật sáng cho lời cảm ơn cuối cùng: the sky is where we belong.",
    accent: "#8edbff",
    secondary: "#ffffff",
    background: "#08152e",
    tracks: [
      { id: "25", title: "Tiến Lên Việt Nam Ơi", duration: "03:24" },
      { id: "26", title: "Nơi Này Có Anh", duration: "04:18" },
      { id: "27", title: "Muộn Rồi Mà Sao Còn", duration: "04:12" },
      { id: "28", title: "Em Của Ngày Hôm Qua", duration: "04:09" },
      { id: "29", title: "Chúng Ta Của Hiện Tại", duration: "04:21" },
      { id: "30", title: "There's No One At All (Reprise)", duration: "04:00" },
    ],
  },
];

type ActEffectProfile = {
  laserCount: number;
  beamOpacity: number;
  flashRate: number;
  cueSpeed: number;
};

const actEffectProfiles: Record<ActId, ActEffectProfile> = {
  awakening: { laserCount: 6, beamOpacity: 0.82, flashRate: 1.1, cueSpeed: 0.7 },
  golden: { laserCount: 8, beamOpacity: 0.62, flashRate: 0.8, cueSpeed: 0.52 },
  love: { laserCount: 4, beamOpacity: 0.42, flashRate: 0.55, cueSpeed: 0.38 },
  rebel: { laserCount: 10, beamOpacity: 0.95, flashRate: 1.8, cueSpeed: 1.05 },
  ours: { laserCount: 12, beamOpacity: 0.88, flashRate: 2.2, cueSpeed: 1.25 },
  encore: { laserCount: 8, beamOpacity: 0.72, flashRate: 1.35, cueSpeed: 0.82 },
};

const trackLightPalettes: Array<[string, string, string]> = [
  ["#1677ff", "#8edbff", "#dffaff"],
  ["#4fffe1", "#2f6cff", "#e5ffff"],
  ["#ffd36e", "#ff82c8", "#fff4c2"],
  ["#b98cff", "#713dce", "#f0ddff"],
  ["#ff3d63", "#ff9c5b", "#ffe0b4"],
  ["#2366d8", "#5369e8", "#d9e6ff"],
];

const getTrackLighting = (track: NightTrack, act: Act): { primary: string; secondary: string; flash: string } => {
  const parsedId = Number.parseInt(track.id, 10);
  const palette = trackLightPalettes[Number.isFinite(parsedId) ? Math.max(0, parsedId - 1) % trackLightPalettes.length : 0];
  return { primary: palette[0] ?? act.accent, secondary: palette[1] ?? act.secondary, flash: palette[2] ?? act.secondary };
};

const defaultConcertNights: ConcertNight[] = [
  {
    id: "hochiminh",
    city: "TP. Hồ Chí Minh",
    date: "27",
    month: "MAR",
    dateLabel: "27.03.2027",
    venue: "THE ORBIT · NIGHT 03 · 2027",
    tagline: "the sky legacy.",
    tracks: [
      { id: "01", actId: "awakening", title: "Hãy Trao Cho Anh · Official MV", duration: "YouTube", youtubeId: "knW7-x7Y7RE" },
      { id: "02", actId: "awakening", title: "Lạc Trôi · 360 Degree Official MV", duration: "YouTube", youtubeId: "HZaShvbm8Q0" },
      { id: "03", actId: "golden", title: "Em Của Ngày Hôm Qua · Stage Version", duration: "YouTube", youtubeId: "ARXu55-KJLo" },
      { id: "04", actId: "golden", title: "Âm Thầm Bên Em · Live Streaming", duration: "YouTube", youtubeId: "9iTNUi0Siuc" },
      { id: "05", actId: "golden", title: "Buông Đôi Tay Nhau Ra · Official MV", duration: "YouTube", youtubeId: "LCyo565N_5w" },
      { id: "06", actId: "love", title: "Nơi Này Có Anh · Official MV", duration: "YouTube", youtubeId: "FN7ALfpGxiI" },
      { id: "07", actId: "love", title: "Có Chắc Yêu Là Đây · Official MV", duration: "YouTube", youtubeId: "6t-MjBazs3o" },
      { id: "08", actId: "love", title: "Muộn Rồi Mà Sao Còn · Official MV", duration: "YouTube", youtubeId: "xypzmu5mMPY" },
      { id: "09", actId: "rebel", title: "Chạy Ngay Đi · Official MV", duration: "YouTube", youtubeId: "32sYGCOYJUM" },
      { id: "10", actId: "rebel", title: "Đừng Làm Trái Tim Anh Đau", duration: "YouTube", youtubeId: "abPmZCZZrFA" },
      { id: "11", actId: "ours", title: "Chúng Ta Của Hiện Tại · Official MV", duration: "YouTube", youtubeId: "psZ1g9fMfeo" },
      { id: "12", actId: "ours", title: "Chúng Ta Của Tương Lai · Official MV", duration: "YouTube", youtubeId: "zoEtcR5EW08" },
      { id: "13", actId: "encore", title: "Making My Way · Official Visualizer", duration: "YouTube", youtubeId: "niPkap1ozUA" },
    ],
  },
  {
    id: "danang",
    city: "Đà Nẵng",
    date: "27",
    month: "MAY",
    dateLabel: "27.05.2027",
    venue: "OCEAN STAGE · NIGHT 02 · 2027",
    tagline: "the sky dream.",
    tracks: [
      { id: "01", actId: "awakening", title: "SKY DECADE · Intro", duration: "YouTube", youtubeId: "HJiRzTmn5X4" },
      { id: "02", actId: "awakening", title: "Muộn Rồi Mà Sao Còn · Official MV", duration: "YouTube", youtubeId: "xypzmu5mMPY" },
      { id: "03", actId: "awakening", title: "Nơi Này Có Anh · Official MV", duration: "YouTube", youtubeId: "FN7ALfpGxiI" },
      { id: "04", actId: "golden", title: "Em Của Ngày Hôm Qua · Stage Version", duration: "YouTube", youtubeId: "ARXu55-KJLo" },
      { id: "05", actId: "golden", title: "Chắc Ai Đó Sẽ Về · Stage Version", duration: "YouTube", youtubeId: "Iigcc1sQNSk" },
      { id: "06", actId: "golden", title: "Âm Thầm Bên Em · Live Streaming", duration: "YouTube", youtubeId: "9iTNUi0Siuc" },
      { id: "07", actId: "love", title: "Âm Thầm Bên Em · Official MV", duration: "YouTube", youtubeId: "30KI5SuECuc" },
      { id: "08", actId: "love", title: "Không Phải Dạng Vừa Đâu · Official Audio", duration: "YouTube", youtubeId: "fxap5apAGzo" },
      { id: "09", actId: "love", title: "Có Chắc Yêu Là Đây · Official MV", duration: "YouTube", youtubeId: "6t-MjBazs3o" },
      { id: "10", actId: "rebel", title: "Chạy Ngay Đi · Official MV", duration: "YouTube", youtubeId: "32sYGCOYJUM" },
      { id: "11", actId: "rebel", title: "Chúng Ta Của Hiện Tại · Official MV", duration: "YouTube", youtubeId: "psZ1g9fMfeo" },
      { id: "12", actId: "ours", title: "Chúng Ta Của Tương Lai · Official MV", duration: "YouTube", youtubeId: "zoEtcR5EW08" },
      { id: "13", actId: "encore", title: "Come My Way · Official MV", duration: "YouTube", youtubeId: "SlQR9iu09bQ" },
    ],
  },
  {
    id: "hanoi",
    city: "Hà Nội",
    date: "05",
    month: "JUL",
    dateLabel: "05.07.2027",
    venue: "SKY DOME · NIGHT 01 · 2027",
    tagline: "the first light.",
    tracks: [
      { id: "01", actId: "awakening", title: "SKY DECADE · Intro", duration: "YouTube", youtubeId: "HJiRzTmn5X4" },
      { id: "02", actId: "awakening", title: "Hãy Trao Cho Anh · Official MV", duration: "YouTube", youtubeId: "knW7-x7Y7RE" },
      { id: "03", actId: "awakening", title: "Em Của Ngày Hôm Qua · Stage Version", duration: "YouTube", youtubeId: "ARXu55-KJLo" },
      { id: "04", actId: "golden", title: "Nắng Ấm Xa Dần · Stage Version", duration: "YouTube", youtubeId: "keU1tFStlwk" },
      { id: "05", actId: "golden", title: "Chúng Ta Không Thuộc Về Nhau · Official MV", duration: "YouTube", youtubeId: "qGRU3sRbaYw" },
      { id: "06", actId: "golden", title: "Thái Bình Mồ Hôi Rơi · Official", duration: "YouTube", youtubeId: "5Jm9g0YdGDU" },
      { id: "07", actId: "love", title: "Nơi Này Có Anh · Official MV", duration: "YouTube", youtubeId: "FN7ALfpGxiI" },
      { id: "08", actId: "love", title: "Không Phải Dạng Vừa Đâu · Official Audio", duration: "YouTube", youtubeId: "fxap5apAGzo" },
      { id: "09", actId: "love", title: "Có Chắc Yêu Là Đây · Official MV", duration: "YouTube", youtubeId: "6t-MjBazs3o" },
      { id: "10", actId: "rebel", title: "Chạy Ngay Đi · Official MV", duration: "YouTube", youtubeId: "32sYGCOYJUM" },
      { id: "11", actId: "rebel", title: "Chúng Ta Của Hiện Tại · Official MV", duration: "YouTube", youtubeId: "psZ1g9fMfeo" },
      { id: "12", actId: "ours", title: "Chúng Ta Của Tương Lai · Official MV", duration: "YouTube", youtubeId: "zoEtcR5EW08" },
      { id: "13", actId: "encore", title: "Come My Way · Official MV", duration: "YouTube", youtubeId: "SlQR9iu09bQ" },
    ],
  },
];

type YouTubePlayer = {
  mute: () => void;
  unMute: () => void;
  playVideo: () => void;
  getCurrentTime: () => number;
  getPlayerState: () => number;
  seekTo: (seconds: number, allowSeekAhead?: boolean) => void;
  destroy: () => void;
};
type YouTubePlayerEvent = { data: number; target: YouTubePlayer };
type YouTubeApi = { Player: new (element: HTMLIFrameElement, options: { events: { onReady: (event: YouTubePlayerEvent) => void; onStateChange: (event: YouTubePlayerEvent) => void } }) => YouTubePlayer; PlayerState: { ENDED: number; PLAYING: number } };

declare global {
  interface Window {
    YT?: YouTubeApi;
    onYouTubeIframeAPIReady?: () => void;
  }
}

let youtubeApiPromise: Promise<void> | null = null;

const ensureYouTubeApi = () => {
  if (window.YT?.Player) return Promise.resolve();
  if (youtubeApiPromise) return youtubeApiPromise;
  youtubeApiPromise = new Promise((resolve) => {
    const previousReady = window.onYouTubeIframeAPIReady;
    window.onYouTubeIframeAPIReady = () => {
      previousReady?.();
      resolve();
    };
    if (!document.querySelector('script[src="https://www.youtube.com/iframe_api"]')) {
      const script = document.createElement("script");
      script.src = "https://www.youtube.com/iframe_api";
      document.head.appendChild(script);
    }
  });
  return youtubeApiPromise;
};

function YouTubePlaybackController({ videoId, onEnded, onTimeUpdate }: { videoId: string; onEnded: () => void; onTimeUpdate: (seconds: number) => void }) {
  const iframe = useRef<HTMLIFrameElement>(null);
  const player = useRef<YouTubePlayerEvent["target"] | null>(null);
  const playerReady = useRef(false);
  const onEndedRef = useRef(onEnded);
  const onTimeUpdateRef = useRef(onTimeUpdate);

  useEffect(() => {
    onEndedRef.current = onEnded;
    onTimeUpdateRef.current = onTimeUpdate;
  }, [onEnded, onTimeUpdate]);

  useEffect(() => {
    let cancelled = false;
    ensureYouTubeApi().then(() => {
      if (cancelled || !iframe.current || !window.YT?.Player) return;
      player.current?.destroy();
      playerReady.current = false;
      player.current = new window.YT.Player(iframe.current, {
        events: {
          onReady: (event) => {
            playerReady.current = true;
            event.target.mute();
            event.target.playVideo();
          },
          onStateChange: (event) => {
            if (event.data === window.YT?.PlayerState.ENDED) onEndedRef.current();
          },
        },
      });
    });
    return () => {
      cancelled = true;
      playerReady.current = false;
      player.current?.destroy();
      player.current = null;
    };
  }, [videoId]);

  useEffect(() => {
    const timer = window.setInterval(() => {
      if (!playerReady.current || player.current?.getPlayerState?.() !== window.YT?.PlayerState.PLAYING) return;
      const seconds = player.current?.getCurrentTime?.();
      if (typeof seconds === "number" && Number.isFinite(seconds) && seconds > 0.1) onTimeUpdateRef.current(seconds);
    }, 500);
    return () => window.clearInterval(timer);
  }, []);

  return <div className="setlist-controller" aria-hidden="true"><iframe ref={iframe} src={`https://www.youtube.com/embed/${videoId}?enablejsapi=1&autoplay=1&mute=1&controls=0&rel=0&playsinline=1&origin=${encodeURIComponent(window.location.origin)}`} title="SKY TOUR background setlist controller" /></div>;
}

function SynchronizedYouTubeScreen({ videoId, title, startAt, soundEnabled }: { videoId: string; title: string; startAt: number; soundEnabled: boolean }) {
  const iframe = useRef<HTMLIFrameElement>(null);
  const player = useRef<YouTubePlayer | null>(null);
  const desiredTime = useRef(startAt);
  const hasStableMasterTime = useRef(startAt > 0.25);

  useEffect(() => {
    // Do not overwrite a valid master position with a transient zero while the hidden player is loading.
    if (startAt > 0.25 || !hasStableMasterTime.current) {
      desiredTime.current = startAt;
      hasStableMasterTime.current = startAt > 0.25;
    }
  }, [startAt]);

  useEffect(() => {
    let cancelled = false;
    ensureYouTubeApi().then(() => {
      if (cancelled || !iframe.current || !window.YT?.Player) return;
      player.current?.destroy();
      player.current = new window.YT.Player(iframe.current, {
        events: {
          onReady: (event) => {
            if (soundEnabled) event.target.unMute();
            else event.target.mute();
            event.target.seekTo(Math.max(0, desiredTime.current), true);
            event.target.playVideo();
          },
          onStateChange: () => undefined,
        },
      });
    });
    return () => {
      cancelled = true;
      player.current?.destroy();
      player.current = null;
    };
  }, [videoId]);

  useEffect(() => {
    if (!player.current) return;
    if (soundEnabled) player.current.unMute();
    else player.current.mute();
  }, [soundEnabled]);

  useEffect(() => {
    const syncTimer = window.setInterval(() => {
      const currentTime = player.current?.getCurrentTime?.();
      if (typeof currentTime !== "number" || !Number.isFinite(currentTime)) return;
      const drift = desiredTime.current - currentTime;
      // A small tolerance prevents the four screens from seeking backwards every time the master updates.
      // Never seek to zero just because the hidden controller has not reported its first timestamp yet.
      if (desiredTime.current > 0.25 && Math.abs(drift) > 1.5) player.current?.seekTo(Math.max(0, desiredTime.current), true);
      if (player.current?.getPlayerState?.() !== window.YT?.PlayerState.PLAYING) player.current?.playVideo();
    }, 750);
    return () => window.clearInterval(syncTimer);
  }, []);

  return <iframe ref={iframe} src={`https://www.youtube.com/embed/${videoId}?enablejsapi=1&autoplay=0&mute=${soundEnabled ? 0 : 1}&controls=0&rel=0&modestbranding=1&playsinline=1&origin=${encodeURIComponent(window.location.origin)}`} title={title} allow="autoplay; encrypted-media; picture-in-picture" allowFullScreen />;
}

const cameraPresets: Record<CameraMode, { label: string; position: [number, number, number]; target: [number, number, number] }> = {
  front: { label: "FRONT VIEW", position: [0, 8.4, 15.6], target: [0, 1.05, -1.15] },
  bird: { label: "BIRD'S EYE", position: [0, 16.5, 5.2], target: [0, 0.4, -0.8] },
  side: { label: "SIDE VIEW", position: [14.6, 7.3, 1.1], target: [0, 1.05, -1.25] },
  audience: { label: "AUDIENCE POV", position: [0, 3.1, 13.3], target: [0, 1.8, -1.55] },
  artist: { label: "ARTIST POV", position: [0, 4.8, -0.35], target: [0, 1.2, 4.2] },
  thirdPerson: { label: "THIRD PERSON", position: [0, 3.3, 12.5], target: [0, 1.1, 0] },
};

// Các thanh khu vực đứng cũ đã được bỏ; khán giả chỉ còn được chọn từ các block khán đài.
const zones: Zone[] = [];

const demoVideo = "https://interactive-examples.mdn.mozilla.net/media/cc0-videos/flower.mp4";
const logoAsset = "/assets/mtp-logo-transparent.png";
const stageLogoAsset = "/assets/sky-tour-stage-logo.png";
const lightstickAsset = "/assets/mtp-lightstick-transparent.png";
// Full glTF catalog from Quaternius Ultimate Animated Character Pack.
// The selected asset is sent with the multiplayer join payload so every user
// can keep their chosen character when entering the same concert room.
const crowdCharacterAssets = [
  "/assets/quaternius-crowd/BaseCharacter.gltf",
  "/assets/quaternius-crowd/BlueSoldier_Female.gltf",
  "/assets/quaternius-crowd/BlueSoldier_Male.gltf",
  "/assets/quaternius-crowd/Casual_Bald.gltf",
  "/assets/quaternius-crowd/Casual_Female.gltf",
  "/assets/quaternius-crowd/Casual_Male.gltf",
  "/assets/quaternius-crowd/Casual2_Female.gltf",
  "/assets/quaternius-crowd/Casual2_Male.gltf",
  "/assets/quaternius-crowd/Casual3_Female.gltf",
  "/assets/quaternius-crowd/Casual3_Male.gltf",
  "/assets/quaternius-crowd/Chef_Female.gltf",
  "/assets/quaternius-crowd/Chef_Hat.gltf",
  "/assets/quaternius-crowd/Chef_Male.gltf",
  "/assets/quaternius-crowd/Cow.gltf",
  "/assets/quaternius-crowd/Cowboy_Female.gltf",
  "/assets/quaternius-crowd/Cowboy_Hair.gltf",
  "/assets/quaternius-crowd/Cowboy_Male.gltf",
  "/assets/quaternius-crowd/Doctor_Female_Old.gltf",
  "/assets/quaternius-crowd/Doctor_Female_Young.gltf",
  "/assets/quaternius-crowd/Doctor_Male_Old.gltf",
  "/assets/quaternius-crowd/Doctor_Male_Young.gltf",
  "/assets/quaternius-crowd/Elf.gltf",
  "/assets/quaternius-crowd/Goblin_Female.gltf",
  "/assets/quaternius-crowd/Goblin_Male.gltf",
  "/assets/quaternius-crowd/Kimono_Female.gltf",
  "/assets/quaternius-crowd/Kimono_Male.gltf",
  "/assets/quaternius-crowd/Knight_Golden_Female.gltf",
  "/assets/quaternius-crowd/Knight_Golden_Male.gltf",
  "/assets/quaternius-crowd/Knight_Male.gltf",
  "/assets/quaternius-crowd/Ninja_Female.gltf",
  "/assets/quaternius-crowd/Ninja_Male_Hair.gltf",
  "/assets/quaternius-crowd/Ninja_Male.gltf",
  "/assets/quaternius-crowd/Ninja_Sand_Female.gltf",
  "/assets/quaternius-crowd/Ninja_Sand.gltf",
  "/assets/quaternius-crowd/OldClassy_Female.gltf",
  "/assets/quaternius-crowd/OldClassy_Male.gltf",
  "/assets/quaternius-crowd/Pirate_Female.gltf",
  "/assets/quaternius-crowd/Pirate_Male.gltf",
  "/assets/quaternius-crowd/Pug.gltf",
  "/assets/quaternius-crowd/Soldier_Female.gltf",
  "/assets/quaternius-crowd/Soldier_Male.gltf",
  "/assets/quaternius-crowd/Suit_Female.gltf",
  "/assets/quaternius-crowd/Suit_Male.gltf",
  "/assets/quaternius-crowd/Viking_Female.gltf",
  "/assets/quaternius-crowd/Viking_Male.gltf",
  "/assets/quaternius-crowd/VikingHelmet.gltf",
  "/assets/quaternius-crowd/Witch.gltf",
  "/assets/quaternius-crowd/Wizard.gltf",
  "/assets/quaternius-crowd/Worker_Female.gltf",
  "/assets/quaternius-crowd/Worker_Male.gltf",
] as const;
const formatCharacterName = (asset: string) => asset.split("/").pop()?.replace(/\.gltf$/, "").replace(/_/g, " ") ?? "SKY CHARACTER";
const crowdCharacterScale = 0.38;

class CrowdErrorBoundary extends Component<{ children: ReactNode }, { hasError: boolean }> {
  state = { hasError: false };

  static getDerivedStateFromError() {
    return { hasError: true };
  }

  render() {
    return this.state.hasError ? null : this.props.children;
  }
}

type SeatingBlock = {
  id: string;
  label: string;
  position: [number, number, number];
  size: [number, number, number];
  color: string;
  rotation?: number;
};

const ringLabels = [
  "M-TP SIGNATURE", "SKYLINE CREW", "BLUE HORIZON", "CITY LIGHTS", "SUNSET SQUAD", "MIDNIGHT RUSH",
  "THE CHASE", "FUTURE VISION", "SKY LETTERS", "TO THE MOON", "CLOUD NINE", "M-TP WAVE",
];
const ringColors = ["#2f6cff", "#4b75ff", "#27bde8", "#159fc5", "#5369e8", "#344fcb", "#1e2e9c"];

const createAudienceRing = (ringIndex: number): SeatingBlock[] => {
  const blocks: SeatingBlock[] = [];
  const sideSegments = 4;
  const halfWidth = 9.8 + ringIndex * 1.25;
  const halfDepth = 9.8 + ringIndex * 1.25;
  const cornerRadius = 2.25 + ringIndex * 0.1;
  const height = 0.56 + ringIndex * 0.18;
  const depth = 1.12;

  const addBlock = (x: number, z: number, tangentAngle: number, width: number) => {
    const index = blocks.length;
    const sequence = String(index + 1).padStart(2, "0");
    const label = ringLabels[index % ringLabels.length];
    blocks.push({
      id: `ring-${ringIndex + 1}-${sequence}`,
      label: `${label} · R${ringIndex + 1}-${sequence}`,
      position: [x, height / 2, z],
      size: [width, height, depth],
      color: ringColors[index % ringColors.length],
      rotation: -tangentAngle,
    });
  };

  const addLine = (start: [number, number], end: [number, number]) => {
    const dx = end[0] - start[0];
    const dz = end[1] - start[1];
    const length = Math.hypot(dx, dz);
    const tangentAngle = Math.atan2(dz, dx);
    for (let index = 0; index < sideSegments; index += 1) {
      const t = (index + 0.5) / sideSegments;
      addBlock(start[0] + dx * t, start[1] + dz * t, tangentAngle, (length / sideSegments) * 1.04);
    }
  };

  const addArc = (center: [number, number], startAngle: number, endAngle: number) => {
    const angleSpan = endAngle - startAngle;
    for (let index = 0; index < sideSegments; index += 1) {
      const t = (index + 0.5) / sideSegments;
      const angle = startAngle + angleSpan * t;
      const tangentAngle = angle - Math.PI / 2;
      addBlock(
        center[0] + Math.cos(angle) * cornerRadius,
        center[1] + Math.sin(angle) * cornerRadius,
        tangentAngle,
        (Math.abs(angleSpan) * cornerRadius / sideSegments) * 1.08,
      );
    }
  };

  // Khán đài hình chữ U: bỏ hàng ghế phía sau sân khấu để sân khấu một mặt có khoảng thở rõ ràng.
  const stageClearanceZ = -1.15;
  addLine([-halfWidth, stageClearanceZ], [-halfWidth, halfDepth - cornerRadius]);
  addArc([-halfWidth + cornerRadius, halfDepth - cornerRadius], Math.PI, Math.PI / 2);
  addLine([-halfWidth + cornerRadius, halfDepth], [halfWidth - cornerRadius, halfDepth]);
  addArc([halfWidth - cornerRadius, halfDepth - cornerRadius], Math.PI / 2, 0);
  addLine([halfWidth, halfDepth - cornerRadius], [halfWidth, stageClearanceZ]);

  return blocks;
};

const seatingBlocks: SeatingBlock[] = Array.from({ length: 5 }, (_, ringIndex) => createAudienceRing(ringIndex)).flat();
const allSeatingZones = seatingBlocks.map(seatingBlockToZone);

const standingZoneIds = new Set<string>();
const getZoneFilter = (id: string): ZoneFilter => standingZoneIds.has(id) ? "standing" : "seated";

function MovingBeam({ position, color, phase, scale = 1 }: { position: [number, number, number]; color: string; phase: number; scale?: number }) {
  const beam = useRef<Mesh>(null);

  useFrame(({ clock }) => {
    if (beam.current) {
      const t = clock.elapsedTime * 0.72 + phase;
      beam.current.rotation.z = Math.sin(t) * 0.3;
      beam.current.rotation.x = Math.cos(t * 0.8) * 0.12;
      beam.current.scale.y = scale + Math.sin(t * 1.6) * 0.07;
    }
  });

  return (
    <mesh ref={beam} position={position} scale={[scale, scale, scale]}>
      <coneGeometry args={[0.7, 7.2, 32, 1, true]} />
      <meshBasicMaterial color={color} transparent opacity={0.075} depthWrite={false} />
    </mesh>
  );
}

function Halo({ position, color, phase }: { position: [number, number, number]; color: string; phase: number }) {
  const ring = useRef<Mesh>(null);

  useFrame(({ clock }) => {
    if (ring.current) {
      const t = clock.elapsedTime * 0.45 + phase;
      ring.current.rotation.z = t;
      ring.current.rotation.y = Math.sin(t) * 0.18;
    }
  });

  return (
    <mesh ref={ring} position={position}>
      <torusGeometry args={[1.7, 0.045, 12, 64]} />
      <meshBasicMaterial color={color} transparent opacity={0.8} />
    </mesh>
  );
}

function PhoenixWing({ side, color }: { side: "left" | "right"; color: string }) {
  const direction = side === "left" ? -1 : 1;
  return (
    <group position={[direction * 4.6, 2.35, -1.9]} rotation={[0, direction * 0.06, direction * 0.08]}>
      {[0, 1, 2, 3].map((index) => (
        <mesh key={index} position={[direction * index * 0.38, index * 0.28, index * 0.1]} rotation={[0, 0, direction * (0.2 + index * 0.08)]}>
          <boxGeometry args={[0.22, 2.2 - index * 0.28, 0.12]} />
          <meshBasicMaterial color={color} transparent opacity={0.58 - index * 0.08} />
        </mesh>
      ))}
      <mesh position={[direction * 0.62, 0.5, 0.12]} rotation={[0, 0, direction * 0.52]}>
        <boxGeometry args={[0.08, 4.2, 0.05]} />
        <meshBasicMaterial color={color} transparent opacity={0.9} />
      </mesh>
    </group>
  );
}

function ArenaLaserBeam({ position, color, phase, opacity = 0.82 }: { position: [number, number, number]; color: string; phase: number; opacity?: number }) {
  const rig = useRef<Group>(null);
  const beamLength = Math.hypot(position[0], position[1] - 0.78, position[2]) + 1.2;

  useFrame(({ clock }) => {
    if (rig.current) {
      const t = clock.elapsedTime * 0.62 + phase;
      rig.current.lookAt(Math.cos(t) * 1.9, 0.72 + Math.sin(t * 0.7) * 0.55, Math.sin(t) * 1.9);
    }
  });

  return (
    <group ref={rig} position={position}>
      <mesh position={[0, beamLength / 2, 0]} rotation={[-Math.PI / 2, 0, 0]}>
        <cylinderGeometry args={[0.025, 0.008, beamLength, 8]} />
        <meshBasicMaterial color={color} transparent opacity={opacity} depthWrite={false} />
      </mesh>
      <mesh position={[0, 0.08, 0]}>
        <sphereGeometry args={[0.08, 12, 12]} />
        <meshBasicMaterial color={color} transparent opacity={0.95} />
      </mesh>
    </group>
  );
}

function LaserLattice({ color, secondary, count = 10, opacity = 0.82 }: { color: string; secondary: string; count?: number; opacity?: number }) {
  return (
    <group>
      {Array.from({ length: count }, (_, index) => {
        const angle = (index / count) * Math.PI * 2;
        return (
          <ArenaLaserBeam
            key={index}
            position={[Math.cos(angle) * 4.7, 5.55 + (index % 2) * 0.18, Math.sin(angle) * 4.7]}
            color={index % 2 ? secondary : color}
            phase={index * 0.48}
            opacity={opacity}
          />
        );
      })}
    </group>
  );
}

function StageTower({ side, color }: { side: "left" | "right"; color: string }) {
  const x = side === "left" ? -6.3 : 6.3;
  return (
    <group position={[x, 0, -1.9]}>
      <mesh position={[0, 2.15, 0]} castShadow>
        <boxGeometry args={[0.26, 4.3, 0.34]} />
        <meshStandardMaterial color="#263255" metalness={0.75} roughness={0.22} />
      </mesh>
      {[0.75, 1.65, 2.55, 3.45].map((y, index) => (
        <mesh key={y} position={[0, y, 0]}>
          <boxGeometry args={[0.53, 0.06, 0.55]} />
          <meshBasicMaterial color={index % 2 ? color : "#e9fbff"} transparent opacity={0.9} />
        </mesh>
      ))}
      <mesh position={[0, 3.4, 0.28]} rotation={[0.2, 0, side === "left" ? -0.18 : 0.18]}>
        <boxGeometry args={[0.62, 0.8, 0.16]} />
        <meshStandardMaterial color="#111b35" emissive={color} emissiveIntensity={1.6} />
      </mesh>
      <mesh position={[0, 2.8, 0.28]} rotation={[0.2, 0, side === "left" ? -0.12 : 0.12]}>
        <boxGeometry args={[0.62, 0.55, 0.16]} />
        <meshStandardMaterial color="#111b35" emissive={color} emissiveIntensity={1.35} />
      </mesh>
    </group>
  );
}

function seatingBlockToZone(block: SeatingBlock): Zone {
  return {
    id: block.id,
    name: block.label,
    shortName: block.label,
    description: `Khu khán giả ${block.label}, một bậc nhìn riêng trong không gian SKY TOUR.`,
    price: "Sky pass",
    seats: "Khu vực đang mở",
    accent: block.color,
    position: block.position,
    size: block.size,
    rotation: block.rotation,
  };
}

const SEAT_TIERS = 3;
const SEATS_PER_TIER = 4;
const MAX_SEATS_PER_ZONE = SEAT_TIERS * SEATS_PER_TIER;

type SeatPlacement = {
  position: [number, number, number];
  rotation: number;
};

// Each seating block is made of three visible steps. Fill one step from left
// to right before moving to the next step, keeping avatars separated even
// when multiple people join the same audience zone.
const getSeatPlacement = (zone: Zone, seatIndex: number): SeatPlacement => {
  const normalizedIndex = Math.max(0, Math.min(MAX_SEATS_PER_ZONE - 1, seatIndex));
  const tier = Math.floor(normalizedIndex / SEATS_PER_TIER);
  const slotInTier = normalizedIndex % SEATS_PER_TIER;
  const stepHeight = zone.size[1] / SEAT_TIERS;
  const stepDepth = zone.size[2] / SEAT_TIERS;
  const spacing = Math.max(0.36, Math.min(0.56, (zone.size[0] * 0.72) / (SEATS_PER_TIER - 1)));
  const localX = (slotInTier - (SEATS_PER_TIER - 1) / 2) * spacing;
  const localZ = -zone.size[2] / 2 + stepDepth * (tier + 0.5);
  const rotation = zone.rotation ?? 0;
  const cos = Math.cos(rotation);
  const sin = Math.sin(rotation);
  const worldX = zone.position[0] + localX * cos + localZ * sin;
  const worldZ = zone.position[2] - localX * sin + localZ * cos;
  return {
    // SeatingBlock raises each step independently; match the avatar feet to
    // that step's top surface instead of using the height of tier three for
    // every character.
    position: [worldX, zone.position[1] + stepHeight * (tier + 1) + 0.04, worldZ],
    rotation: Math.atan2(-worldX, -worldZ),
  };
};

const normalizeParticipantSeat = (participant: RemoteParticipant): RemoteParticipant => {
  const zone = allSeatingZones.find((candidate) => candidate.id === participant.zoneId);
  if (!zone) return { ...participant, seatIndex: participant.seatIndex ?? 0, lightstickColor: participant.lightstickColor ?? defaultLightstickColor };
  const seatIndex = participant.seatIndex ?? 0;
  const placement = getSeatPlacement(zone, seatIndex);
  return { ...participant, seatIndex, position: placement.position, rotation: placement.rotation, lightstickColor: participant.lightstickColor ?? defaultLightstickColor };
};

function CrowdCharacter({ asset, dancing, position, rotation, phase, name, highlighted = false, holdingLightstick = false, lightstickGlow = true, lightstickColor = defaultLightstickColor }: { asset: string; dancing: boolean; position: [number, number, number]; rotation: number; phase: number; name?: string; highlighted?: boolean; holdingLightstick?: boolean; lightstickGlow?: boolean; lightstickColor?: string }) {
  const group = useRef<Group>(null);
  const visibleLightstick = useRef<Group>(null);
  const { scene: characterScene, animations: characterAnimations } = useGLTF(asset);
  const lightstickTexture = useTexture(lightstickAsset);
  const model = useMemo(() => {
    const clonedModel = cloneSkeleton(characterScene);
    return clonedModel;
  }, [characterScene]);
  const { actions } = useAnimations(characterAnimations, group);
  const animationName = dancing && actions.Victory ? "Victory" : "Idle";

  useEffect(() => {
    const action = actions[animationName];
    if (!action) return;
    action.reset().setLoop(LoopRepeat, Infinity).fadeIn(0.2).play();
    action.time = phase;
    return () => {
      action.fadeOut(0.16);
      action.stop();
    };
  }, [actions, animationName, phase]);

  useFrame(({ clock }) => {
    if (!group.current) return;
    const t = clock.elapsedTime * 6 + phase;
    group.current.position.y = dancing ? Math.abs(Math.sin(t)) * 0.035 : 0;
    group.current.rotation.z = dancing ? Math.sin(t * 0.5) * 0.035 : 0;
    if (visibleLightstick.current) {
      visibleLightstick.current.position.y = 0.68 + (dancing ? Math.abs(Math.sin(t)) * 0.035 : 0);
      visibleLightstick.current.rotation.z = dancing ? Math.sin(t * 0.5) * 0.08 : -0.16;
    }
  });

  return (
    <group position={position} rotation={[0, rotation, 0]}>
      <group ref={group} scale={crowdCharacterScale}>
        <primitive object={model} />
      </group>
      {holdingLightstick && <group ref={visibleLightstick} position={[0.32, 0.68, 0.08]}>
        <sprite scale={[0.24, 0.43, 1]}>
          <spriteMaterial map={lightstickTexture} color={lightstickColor} transparent opacity={0.98} depthWrite={false} depthTest />
        </sprite>
        {lightstickGlow && <pointLight color={lightstickColor} intensity={0.32} distance={1.15} decay={2} />}
      </group>}
      {name && <Html position={[0, highlighted ? 1.42 : 1.25, 0]} center distanceFactor={8} style={{ pointerEvents: "none" }}>
        <span className={`avatar-nameplate ${highlighted ? "is-user" : ""}`}>{highlighted ? "BẠN · " : ""}{name}</span>
      </Html>}
    </group>
  );
}

const remoteParticipantPhase = (id: string) => {
  let hash = 0;
  for (const character of id) hash = (hash * 31 + character.charCodeAt(0)) | 0;
  return 0.35 + (Math.abs(hash) % 180) / 100;
};

const RemoteCrowdCharacter = memo(function RemoteCrowdCharacter({ participant }: { participant: RemoteParticipant }) {
  return <CrowdCharacter asset={participant.asset} dancing={participant.dancing} position={participant.position} rotation={participant.rotation} phase={remoteParticipantPhase(participant.id)} name={participant.name} holdingLightstick lightstickGlow={false} lightstickColor={participant.lightstickColor} />;
}, (previous, next) => previous.participant === next.participant);

function SceneCamera({ position, target, resetToken }: { position: [number, number, number]; target: [number, number, number]; resetToken: number }) {
  const { camera } = useThree();

  useEffect(() => {
    camera.position.set(...position);
    camera.lookAt(...target);
    camera.updateProjectionMatrix();
  }, [camera, position, target, resetToken]);

  return null;
}

function SeatingBlock({ block, active, onSelect, lightsticksOn, showLabel }: { block: SeatingBlock; active: boolean; onSelect: (zone: Zone) => void; lightsticksOn: boolean; showLabel: boolean }) {
  const stepCount = 3;
  const stepHeight = block.size[1] / stepCount;
  const stepDepth = block.size[2] / stepCount;
  const blockSequence = Number(block.id.split("-").at(-1) ?? 0);
  const ringNumber = Number(block.id.split("-")[1] ?? 1);
  // Ten blocks per ring × five rings = 50 visible crowd slots. This cycles
  // through the complete character catalog instead of reusing only 10–15 models.
  const shouldShowCrowd = blockSequence % 2 === 0;
  const crowdSlot = (ringNumber - 1) * 10 + (blockSequence / 2 - 1);
  const crowdAsset = crowdCharacterAssets[crowdSlot % crowdCharacterAssets.length];
  const crowdPosition: [number, number, number] = [0, block.size[1] + 0.02, -block.size[2] / 2 + stepDepth * 2.5];
  const crowdRotation = Math.atan2(-block.position[0], -block.position[2]) - (block.rotation ?? 0);
  return (
    <group
      position={block.position}
      rotation={[0, block.rotation ?? 0, 0]}
      onClick={(event) => {
        event.stopPropagation();
        onSelect(seatingBlockToZone(block));
      }}
    >
      {Array.from({ length: stepCount }).map((_, step) => {
        const stepZ = -block.size[2] / 2 + stepDepth / 2 + step * stepDepth;
        const stepWidth = block.size[0] * (1 - step * 0.035);
        return (
          <group key={step}>
            <mesh position={[0, stepHeight * (step + 0.5), stepZ]} castShadow>
              <boxGeometry args={[stepWidth, stepHeight, stepDepth + 0.035]} />
              <meshStandardMaterial color={active ? "#efffff" : block.color} emissive={active ? block.color : "#071329"} emissiveIntensity={active ? 0.75 : 0.18} metalness={0.35} roughness={0.38} />
            </mesh>
            <mesh position={[0, stepHeight * (step + 1) + 0.02, stepZ]}>
              <boxGeometry args={[stepWidth * 0.88, 0.025, stepDepth * 0.82]} />
              <meshBasicMaterial color={block.color} transparent opacity={lightsticksOn ? (active ? 0.85 : 0.48) : 0.08} />
            </mesh>
          </group>
        );
      })}
      {showLabel && active && <Html position={[0, block.size[1] + 0.26, 0]} center distanceFactor={10} style={{ pointerEvents: "none" }}>
        <span className={`zone-label ${active ? "is-active" : ""}`} style={{ "--zone-color": block.color } as React.CSSProperties}>{block.label}</span>
      </Html>}
      {shouldShowCrowd && (
        <CrowdErrorBoundary>
          <Suspense fallback={null}>
            <CrowdCharacter asset={crowdAsset} dancing={blockSequence % 4 !== 0} position={crowdPosition} rotation={crowdRotation} phase={(blockSequence + ringNumber) * 0.37} />
          </Suspense>
        </CrowdErrorBoundary>
      )}
    </group>
  );
}

function CornerLightTower({ position, color, phase, lightingOn }: { position: [number, number, number]; color: string; phase: number; lightingOn: boolean }) {
  const head = useRef<Group>(null);

  useFrame(({ clock }) => {
    if (head.current) {
      head.current.rotation.y = Math.sin(clock.elapsedTime * 0.52 + phase) * 0.42;
      head.current.rotation.x = Math.sin(clock.elapsedTime * 0.38 + phase) * 0.08;
    }
  });

  return (
    <group position={position}>
      <mesh position={[0, 3.05, 0]} castShadow>
        <boxGeometry args={[0.18, 6.1, 0.18]} />
        <meshStandardMaterial color="#25365d" metalness={0.78} roughness={0.22} />
      </mesh>
      {[1.1, 2.25, 3.4, 4.55].map((y, index) => (
        <mesh key={y} position={[0, y, 0]}>
          <boxGeometry args={[0.52, 0.055, 0.52]} />
          <meshBasicMaterial color={index % 2 ? color : "#9eeeff"} transparent opacity={0.82} />
        </mesh>
      ))}
      <mesh position={[0, 0.08, 0]}>
        <boxGeometry args={[0.72, 0.16, 0.72]} />
        <meshStandardMaterial color="#111b35" metalness={0.72} roughness={0.3} />
      </mesh>
      <group ref={head} position={[0, 5.35, 0]}>
        <mesh>
          <boxGeometry args={[0.66, 0.3, 0.34]} />
          <meshStandardMaterial color="#10182d" emissive={color} emissiveIntensity={1.4} metalness={0.65} roughness={0.24} />
        </mesh>
        <mesh position={[0, -0.02, 0.22]} rotation={[0.2, 0, 0]}>
          <boxGeometry args={[0.42, 0.18, 0.08]} />
          <meshBasicMaterial color={color} transparent opacity={0.95} />
        </mesh>
        <pointLight color={color} intensity={lightingOn ? 4.6 : 0} distance={8.5} decay={2} />
      </group>
    </group>
  );
}

function ConcertLighting({ act, track, performanceMode, lightingOn }: { act: Act; track: NightTrack; performanceMode: boolean; lightingOn: boolean }) {
  const pointLights = useRef<Array<PointLight | null>>([]);
  const spotLights = useRef<Array<SpotLight | null>>([]);
  const beams = useRef<Array<Mesh | null>>([]);
  const flash = useRef<Mesh>(null);
  const trackCue = getTrackLighting(track, act);
  const effectProfile = actEffectProfiles[act.id];
  const colors = useMemo(() => [new Color(trackCue.primary), new Color(trackCue.secondary), new Color(act.accent), new Color(act.secondary)], [act.accent, act.secondary, trackCue.primary, trackCue.secondary]);
  const mixedColor = useMemo(() => new Color(), []);
  const nextColor = useMemo(() => new Color(), []);

  useFrame(({ clock }) => {
    const lightsActive = performanceMode && lightingOn;
    const t = clock.elapsedTime * effectProfile.cueSpeed;
    const cue = Math.floor(t / 2.8);
    const cueProgress = (t % 2.8) / 2.8;
    const baseIndex = cue % colors.length;
    const nextIndex = (baseIndex + 1) % colors.length;
    mixedColor.copy(colors[baseIndex]).lerp(colors[nextIndex], (1 - Math.cos(cueProgress * Math.PI)) / 2);
    nextColor.copy(mixedColor);

    pointLights.current.forEach((light, index) => {
      if (!light) return;
      const phase = index * 0.85;
      const pulse = (Math.sin(t * 2.1 + phase) + 1) / 2;
      light.intensity = lightsActive ? 2.2 + pulse * 4.8 : 0;
      light.color.copy(mixedColor).offsetHSL((index - 1.5) * 0.035, 0, 0.02);
    });

    spotLights.current.forEach((light, index) => {
      if (!light) return;
      const phase = index * 1.2;
      const sweep = (Math.sin(t * 0.78 + phase) + 1) / 2;
      light.intensity = lightsActive ? 3.5 + sweep * 5.5 : 0;
      light.color.copy(mixedColor).offsetHSL((index % 2 ? 0.06 : -0.04), 0, 0.04);
      light.angle = 0.28 + sweep * 0.14;
    });

    beams.current.forEach((beam, index) => {
      if (!beam) return;
      const phase = index * 0.72;
      beam.rotation.z = Math.sin(t * 0.82 + phase) * 0.2;
      beam.rotation.x = Math.cos(t * 0.65 + phase) * 0.1;
      beam.scale.y = 0.92 + Math.sin(t * 1.7 + phase) * 0.08;
      const material = beam.material as { color?: Color; opacity?: number };
      material.color?.copy(nextColor).offsetHSL(index % 2 ? 0.04 : -0.03, 0, 0.06);
      if (typeof material.opacity === "number") material.opacity = lightsActive ? (0.035 + Math.sin(t * 1.8 + phase) * 0.014) * effectProfile.beamOpacity : 0;
    });

    if (flash.current) {
      const material = flash.current.material as { color?: Color; opacity?: number };
      const flashPulse = Math.pow(Math.max(0, Math.sin(clock.elapsedTime * effectProfile.flashRate * Math.PI)), 14);
      material.color?.set(trackCue.flash);
      if (typeof material.opacity === "number") material.opacity = lightsActive ? flashPulse * 0.55 : 0;
    }
  });

  const lightPositions: Array<[number, number, number]> = [
    [-3.8, 5.8, -3.8], [3.8, 5.8, -3.8], [3.8, 5.8, 3.8], [-3.8, 5.8, 3.8],
  ];

  return (
    <group>
      {lightPositions.map((position, index) => <pointLight key={`concert-wash-${index}`} ref={(node) => { pointLights.current[index] = node; }} position={position} distance={13} decay={2} intensity={0} />)}
      {lightPositions.map((position, index) => <spotLight key={`concert-spot-${index}`} ref={(node) => { spotLights.current[index] = node; }} position={[position[0] * 1.25, 8.4, position[2] * 1.25]} distance={25} intensity={0} angle={0.35} penumbra={0.8} decay={1.7} />)}
      {lightPositions.map((position, index) => <mesh key={`concert-beam-${index}`} ref={(node) => { beams.current[index] = node; }} position={position} rotation={[0, 0, index % 2 ? 0.12 : -0.12]}>
        <coneGeometry args={[0.82, 7.8, 20, 1, true]} />
        <meshBasicMaterial transparent opacity={0} depthWrite={false} color={trackCue.primary} />
      </mesh>)}
      <mesh ref={flash} position={[0, 0.84, -3.9]} rotation={[-Math.PI / 2, 0, 0]}>
        <planeGeometry args={[8.8, 2.2]} />
        <meshBasicMaterial transparent opacity={0} depthWrite={false} color={trackCue.flash} />
      </mesh>
    </group>
  );
}

function Prototype360Stage({ act, track }: { act: Act; track: NightTrack }) {
  const stageLogoTexture = useTexture(stageLogoAsset);
  const trackCue = getTrackLighting(track, act);
  const stageMaterial = <meshStandardMaterial color="#102a62" emissive={trackCue.primary} emissiveIntensity={0.28} metalness={0.64} roughness={0.27} />;
  const deckGlow = <meshBasicMaterial color={trackCue.primary} transparent opacity={0.22} />;

  return (
    <group>
      {/* Sân khấu một mặt: khối chính phía sau, runway giữa và bục tròn phía trước. */}
      <RoundedBox position={[0, 0.46, -4.65]} args={[12.4, 0.62, 3.45]} radius={0.22} smoothness={6} castShadow receiveShadow>
        {stageMaterial}
      </RoundedBox>
      <RoundedBox position={[0, 0.47, -0.15]} args={[2.72, 0.64, 5.65]} radius={0.18} smoothness={6} castShadow receiveShadow>
        {stageMaterial}
      </RoundedBox>
      <mesh position={[0, 0.47, 2.52]} castShadow receiveShadow>
        <cylinderGeometry args={[2.08, 2.08, 0.64, 64]} />
        {stageMaterial}
      </mesh>
      <mesh position={[0, 0.79, -4.65]}>
        <boxGeometry args={[11.8, 0.035, 2.88]} />
        {deckGlow}
      </mesh>
      <mesh position={[0, 0.8, -0.15]}>
        <boxGeometry args={[2.25, 0.035, 5.1]} />
        {deckGlow}
      </mesh>
      <mesh position={[0, 0.81, 2.52]} rotation={[-Math.PI / 2, 0, 0]}>
        <circleGeometry args={[1.72, 64]} />
        {deckGlow}
      </mesh>
      <mesh position={[0, 0.84, -4.65]} rotation={[-Math.PI / 2, 0, 0]}>
        <planeGeometry args={[5.6, 1.85]} />
        <meshBasicMaterial map={stageLogoTexture} transparent color="#ffffff" />
      </mesh>
      <Text position={[0, 0.86, -0.1]} rotation={[-Math.PI / 2, 0, 0]} fontSize={0.16} color="#d9fbff" anchorX="center" anchorY="middle" letterSpacing={0.14}>
        SKY TOUR RUNWAY
      </Text>
      {[[-5.8, -2.92], [5.8, -2.92], [-1.32, 2.2], [1.32, 2.2]].map(([x, z], index) => (
        <mesh key={`stage-edge-${index}`} position={[x, 0.84, z]}>
          <boxGeometry args={[index < 2 ? 0.12 : 2.32, 0.05, index < 2 ? 0.3 : 0.12]} />
          <meshBasicMaterial color={index % 2 ? trackCue.secondary : trackCue.primary} transparent opacity={0.9} />
        </mesh>
      ))}
      {/* Truss ngang phía trên sân khấu, không còn vòng trụ 360°. */}
      <group position={[0, 8.25, -4.65]}>
        <mesh>
          <boxGeometry args={[12.5, 0.18, 0.18]} />
          <meshStandardMaterial color="#111a31" metalness={0.84} roughness={0.2} />
        </mesh>
        <mesh position={[0, -0.08, 1.05]}>
          <boxGeometry args={[12.1, 0.1, 0.1]} />
          <meshBasicMaterial color={trackCue.primary} transparent opacity={0.8} />
        </mesh>
        {[-4.8, -1.6, 1.6, 4.8].map((x, index) => (
          <group key={`stage-head-${index}`} position={[x, -0.36, 0]}>
            <mesh>
              <boxGeometry args={[0.34, 0.24, 0.34]} />
              <meshStandardMaterial color="#0d1730" emissive={trackCue.primary} emissiveIntensity={1.2} metalness={0.72} roughness={0.22} />
            </mesh>
            <mesh position={[0, -0.22, 0.08]} rotation={[0.28, 0, 0]}>
              <boxGeometry args={[0.12, 0.25, 0.12]} />
              <meshBasicMaterial color={trackCue.secondary} />
            </mesh>
          </group>
        ))}
      </group>
    </group>
  );
}

function ArenaStageScreens({ act, track, trackOffset, isPlaying, soundOn }: { act: Act; track: NightTrack; trackOffset: number; isPlaying: boolean; soundOn: boolean }) {
  const logoTexture = useTexture(logoAsset);
  const trackCue = getTrackLighting(track, act);
  const screenPosition: [number, number, number] = [0, 6.05, -4.55];

  return (
    <group>
      {/* Một màn LED duy nhất, treo chính giữa và hướng về khán giả. */}
      <group position={screenPosition}>
        {[-5.4, 5.4].map((x) => <mesh key={`screen-cable-${x}`} position={[x, 2.05, 0]}>
          <cylinderGeometry args={[0.025, 0.025, 4.2, 8]} />
          <meshBasicMaterial color="#8ddfff" transparent opacity={0.78} />
        </mesh>)}
        <RoundedBox args={[14.8, 4.8, 0.18]} radius={0.28} smoothness={7} castShadow>
          <meshStandardMaterial color="#061535" emissive={trackCue.primary} emissiveIntensity={0.82} metalness={0.54} roughness={0.3} />
        </RoundedBox>
        <mesh position={[0, 0, 0.12]}>
          <planeGeometry args={[14.25, 4.3]} />
          <meshBasicMaterial color={isPlaying ? "#020713" : trackCue.primary} transparent opacity={isPlaying ? 1 : 0.12} />
        </mesh>
        {isPlaying ? <Html position={[0, 0, 0.2]} center transform distanceFactor={7} zIndexRange={[3, 1]} style={{ pointerEvents: "none" }}>
          <div className="stage-video-frame stage-video-frame--led stage-video-frame--single"><SynchronizedYouTubeScreen videoId={track.youtubeId} title={`${track.title} · SKY TOUR central LED`} startAt={trackOffset} soundEnabled={soundOn} /></div>
        </Html> : <mesh position={[0, 0, 0.2]}>
          <planeGeometry args={[13.7, 3.95]} />
          <meshBasicMaterial map={logoTexture} transparent color="#ffffff" />
        </mesh>}
        <mesh position={[0, 1.7, 0.2]}>
          <boxGeometry args={[14.1, 0.06, 0.03]} />
          <meshBasicMaterial color={trackCue.secondary} transparent opacity={0.95} />
        </mesh>
        <mesh position={[0, -1.7, 0.2]}>
          <boxGeometry args={[14.1, 0.06, 0.03]} />
          <meshBasicMaterial color={trackCue.primary} transparent opacity={0.95} />
        </mesh>
        <Text position={[0, -2.1, 0.22]} fontSize={0.15} color="#b9d4ff" anchorX="center" anchorY="middle" letterSpacing={0.16}>
          {act.number} · {act.title}
        </Text>
      </group>
    </group>
  );
}

function VenueScene({ selectedZone, onSelectZone, userAvatar, remoteParticipants, isDancing, lightstickColor, act, activeTrack, activeTrackOffset, soundOn, cameraMode, cameraResetToken, lightingOn, laserOn, lightsticksOn, showZoneLabels, zoneFilter }: { selectedZone: Zone; onSelectZone: (zone: Zone) => void; userAvatar: UserAvatar | null; remoteParticipants: Record<string, RemoteParticipant>; isDancing: boolean; lightstickColor: string; act: Act; activeTrack: NightTrack; activeTrackOffset: number; soundOn: boolean; cameraMode: CameraMode; cameraResetToken: number; lightingOn: boolean; laserOn: boolean; lightsticksOn: boolean; showZoneLabels: boolean; zoneFilter: ZoneFilter }) {
  const fallbackSeat = getSeatPlacement(selectedZone, 0);
  const avatarWorldPosition = userAvatar?.position ?? fallbackSeat.position;
  const avatarWorldX = avatarWorldPosition[0];
  const avatarWorldY = avatarWorldPosition[1];
  const avatarWorldZ = avatarWorldPosition[2];
  const trackCue = getTrackLighting(activeTrack, act);
  const effectProfile = actEffectProfiles[act.id];
  const camera = useMemo(() => {
    const selectedRadius = Math.hypot(avatarWorldX, avatarWorldZ) || 1;
    const outward = [avatarWorldX / selectedRadius, avatarWorldZ / selectedRadius] as const;
    const inward = [-outward[0], -outward[1]] as const;
    return cameraMode === "thirdPerson"
      ? {
          label: "THIRD PERSON",
          position: [avatarWorldX + outward[0] * 3.6, 3.35, avatarWorldZ + outward[1] * 3.6] as [number, number, number],
          target: [avatarWorldX + inward[0] * 1.8, avatarWorldY + 0.7, avatarWorldZ + inward[1] * 1.8] as [number, number, number],
        }
      : cameraPresets[cameraMode];
  }, [avatarWorldX, avatarWorldY, avatarWorldZ, cameraMode]);
  // Avatar đứng độc lập trong world (không nằm bên trong group của block),
  // vì vậy hướng nhìn phải tính trực tiếp về tâm sân khấu, không trừ rotation của block.
  const avatarRotation = userAvatar?.rotation ?? fallbackSeat.rotation;
  return (
    <Canvas camera={{ position: camera.position, fov: 43 }} dpr={[1, 2]} shadows>
      <SceneCamera position={camera.position} target={camera.target} resetToken={cameraResetToken} />
      <color attach="background" args={[act.background]} />
      <fog attach="fog" args={[act.background, 12, 29]} />
      <ambientLight intensity={lightingOn ? 0.55 : 0.22} />
      <pointLight position={[0, 7, -1]} intensity={lightingOn ? 12 : 3} distance={18} color={trackCue.primary} />
      <pointLight position={[-4, 3, 4]} intensity={lightingOn ? 7 : 1.5} distance={11} color={trackCue.secondary} />
      <pointLight position={[4, 3, 4]} intensity={lightingOn ? 6 : 1.5} distance={11} color={trackCue.primary} />
      <ConcertLighting act={act} track={activeTrack} performanceMode={Boolean(userAvatar)} lightingOn={lightingOn} />
      {lightingOn && Array.from({ length: 8 }, (_, index) => {
        const angle = (index / 8) * Math.PI * 2;
        return <pointLight key={`arena-led-${index}`} position={[Math.cos(angle) * 4.3, 2.1, Math.sin(angle) * 4.3]} intensity={2.8} distance={7.5} color={index % 2 ? trackCue.secondary : trackCue.primary} />;
      })}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.05, 0]} receiveShadow>
        <planeGeometry args={[32, 32]} />
        <meshStandardMaterial color="#10172b" roughness={0.7} metalness={0.25} />
      </mesh>
      <gridHelper args={[32, 52, "#293353", "#18223c"]} position={[0, 0.01, 0]} />

      {false && <group position={[0, 0, -1.7]}>
        <mesh position={[0, 0.26, 0]} castShadow>
          <boxGeometry args={[14.2, 0.34, 2.05]} />
          <meshStandardMaterial color="#1b2540" metalness={0.78} roughness={0.22} />
        </mesh>
        <mesh position={[0, 0.45, 0.98]} castShadow>
          <boxGeometry args={[14.55, 0.14, 0.72]} />
          <meshStandardMaterial color="#28365d" metalness={0.84} roughness={0.2} />
        </mesh>
        <mesh position={[0, 0.43, 1.55]} castShadow>
          <boxGeometry args={[4.2, 0.14, 3.7]} />
          <meshStandardMaterial color="#202b4e" metalness={0.7} roughness={0.22} />
        </mesh>
        <mesh position={[0, 0.52, 1.55]}>
          <boxGeometry args={[3.7, 0.025, 3.25]} />
          <meshBasicMaterial color={act.accent} transparent opacity={0.25} />
        </mesh>
        <mesh position={[-1.15, 0.53, 2.85]} rotation={[0, -0.42, 0]} castShadow>
          <boxGeometry args={[1.38, 0.14, 3.25]} />
          <meshStandardMaterial color="#26375c" metalness={0.78} roughness={0.22} />
        </mesh>
        <mesh position={[1.15, 0.53, 2.85]} rotation={[0, 0.42, 0]} castShadow>
          <boxGeometry args={[1.38, 0.14, 3.25]} />
          <meshStandardMaterial color="#26375c" metalness={0.78} roughness={0.22} />
        </mesh>
        <mesh position={[0, 0.62, 4.02]} castShadow>
          <boxGeometry args={[3.3, 0.16, 1.45]} />
          <meshStandardMaterial color="#2c3e68" metalness={0.82} roughness={0.2} />
        </mesh>
        <mesh position={[0, 0.73, 4.02]}>
          <boxGeometry args={[2.85, 0.025, 1.05]} />
          <meshBasicMaterial color={act.secondary} transparent opacity={0.45} />
        </mesh>
        <Text position={[0, 0.85, 4.02]} rotation={[-Math.PI / 2, 0, 0]} fontSize={0.13} color="#eefdf9" anchorX="center" anchorY="middle" letterSpacing={0.15}>
          THRUST STAGE
        </Text>
        <mesh position={[0, 2.55, -0.63]} castShadow>
          <boxGeometry args={[10.6, 2.9, 0.25]} />
          <meshBasicMaterial color="#172849" transparent opacity={0.62} />
        </mesh>
        <mesh position={[0, 2.55, -0.78]}>
          <boxGeometry args={[9.75, 2.34, 0.06]} />
          <meshBasicMaterial color="#93f7ff" transparent opacity={0.15} />
        </mesh>
        <mesh position={[-5.45, 2.28, -0.56]}>
          <boxGeometry args={[1.55, 2.1, 0.18]} />
          <meshStandardMaterial color="#14213f" emissive={act.accent} emissiveIntensity={0.5} />
        </mesh>
        <mesh position={[5.45, 2.28, -0.56]}>
          <boxGeometry args={[1.55, 2.1, 0.18]} />
          <meshStandardMaterial color="#14213f" emissive={act.secondary} emissiveIntensity={0.5} />
        </mesh>
        <mesh position={[0, 4.25, -0.7]}>
          <boxGeometry args={[16.2, 0.18, 0.22]} />
          <meshStandardMaterial color="#324269" metalness={0.82} roughness={0.2} />
        </mesh>
        <mesh position={[0, 3.82, -0.72]}>
          <boxGeometry args={[13.25, 0.08, 0.12]} />
          <meshBasicMaterial color={act.accent} />
        </mesh>
        <mesh position={[-6.5, 2.25, -0.7]}>
          <boxGeometry args={[0.18, 4.05, 0.22]} />
          <meshStandardMaterial color="#324269" metalness={0.82} roughness={0.2} />
        </mesh>
        <mesh position={[6.5, 2.25, -0.7]}>
          <boxGeometry args={[0.18, 4.05, 0.22]} />
          <meshStandardMaterial color="#324269" metalness={0.82} roughness={0.2} />
        </mesh>
        <mesh position={[0, 4.48, -0.7]}>
          <boxGeometry args={[15.25, 0.04, 0.35]} />
          <meshBasicMaterial color={act.secondary} transparent opacity={0.8} />
        </mesh>
        <Text position={[0, 2.77, -0.91]} fontSize={0.52} color={act.secondary} anchorX="center" anchorY="middle" letterSpacing={0.14}>
          SKY TOUR
        </Text>
        <Html position={[0, 2.55, -0.95]} center distanceFactor={8} style={{ pointerEvents: "none" }}>
          <img className="stage-logo" src={logoAsset} alt="Sơn Tùng M-TP logo trên màn LED" />
        </Html>
        <Text position={[0, 2.22, -0.91]} fontSize={0.14} color="#91a8c7" anchorX="center" anchorY="middle" letterSpacing={0.16}>
          {act.number} · {act.title}
        </Text>
        <Text position={[0, 1.02, 1.4]} rotation={[-Math.PI / 2, 0, 0]} fontSize={0.16} color="#9cf9e8" anchorX="center" anchorY="middle" letterSpacing={0.18}>
          MAIN RUNWAY
        </Text>
        <Halo position={[0, 2.7, -1.04]} color={act.accent} phase={0} />
        <Halo position={[0, 2.7, -1.03]} color={act.secondary} phase={1.8} />
      </group>}

      <Suspense fallback={null}>
        <Prototype360Stage act={act} track={activeTrack} />
        <ArenaStageScreens key={`${userAvatar ? "playing" : "idle"}-${activeTrack.youtubeId}`} act={act} track={activeTrack} trackOffset={activeTrackOffset} isPlaying={Boolean(userAvatar)} soundOn={soundOn} />
      </Suspense>
      {userAvatar && (
        <CrowdErrorBoundary>
          <Suspense fallback={null}>
            <CrowdCharacter asset={userAvatar.asset} dancing={isDancing} position={avatarWorldPosition} rotation={avatarRotation} phase={0.6} name={userAvatar.name} highlighted holdingLightstick lightstickColor={lightstickColor} />
          </Suspense>
        </CrowdErrorBoundary>
      )}
      {Object.values(remoteParticipants).map((participant) => (
        <CrowdErrorBoundary key={participant.id}>
          <Suspense fallback={null}>
            <RemoteCrowdCharacter participant={participant} />
          </Suspense>
        </CrowdErrorBoundary>
      ))}

      {[
        { position: [-15.7, 0, -15.7] as [number, number, number], phase: 0 },
        { position: [15.7, 0, -15.7] as [number, number, number], phase: 1.4 },
        { position: [15.7, 0, 15.7] as [number, number, number], phase: 2.8 },
        { position: [-15.7, 0, 15.7] as [number, number, number], phase: 4.2 },
      ].map((tower, index) => (
        <CornerLightTower key={`corner-light-tower-${index}`} position={tower.position} color={index % 2 ? trackCue.secondary : trackCue.primary} phase={tower.phase} lightingOn={lightingOn} />
      ))}

      {false && <>
        <StageTower side="left" color={act.accent} />
        <StageTower side="right" color={act.secondary} />
        <PhoenixWing side="left" color={act.accent} />
        <PhoenixWing side="right" color={act.secondary} />
      </>}
      {lightingOn && Array.from({ length: 8 }, (_, index) => {
        const angle = (index / 8) * Math.PI * 2;
        return <MovingBeam key={`wash-beam-${index}`} position={[Math.cos(angle) * 4.35, 5.25, Math.sin(angle) * 4.35]} color={index % 2 ? trackCue.secondary : trackCue.primary} phase={index * 0.7} scale={0.88} />;
      })}
      {laserOn && <LaserLattice color={trackCue.primary} secondary={trackCue.secondary} count={effectProfile.laserCount} opacity={effectProfile.beamOpacity} />}
      {seatingBlocks.filter((block) => zoneFilter === "all" || getZoneFilter(block.id) === zoneFilter).map((block) => <SeatingBlock key={block.id} block={block} active={selectedZone.id === block.id} onSelect={onSelectZone} lightsticksOn={lightsticksOn} showLabel={showZoneLabels} />)}
      <OrbitControls key={`controls-${cameraMode}-${selectedZone.id}-${cameraResetToken}`} enabled enablePan={false} minDistance={10} maxDistance={28} maxPolarAngle={Math.PI / 2.14} minPolarAngle={0.42} target={camera.target} />
    </Canvas>
  );
}

function Icon({ children }: { children: ReactNode }) {
  return <span className="icon" aria-hidden="true">{children}</span>;
}

function App() {
  const [activeNav, setActiveNav] = useState("The stage");
  const [mobileNavOpen, setMobileNavOpen] = useState(false);
  const [selectedZone, setSelectedZone] = useState(seatingBlockToZone(seatingBlocks[0]));
  const [activeNightId, setActiveNightId] = useState<NightId>("hanoi");
  const [cameraMode, setCameraMode] = useState<CameraMode>("front");
  const [cameraResetToken, setCameraResetToken] = useState(0);
  const [userAvatar, setUserAvatar] = useState<UserAvatar | null>(null);
  const [isDancing, setIsDancing] = useState(false);
  const [soundOn, setSoundOn] = useState(false);
  const [lightingOn, setLightingOn] = useState(true);
  const [laserOn, setLaserOn] = useState(true);
  const [lightsticksOn, setLightsticksOn] = useState(true);
  const [isLive, setIsLive] = useState(true);
  const [isChatOpen, setIsChatOpen] = useState(true);
  const [showZoneLabels, setShowZoneLabels] = useState(true);
  const [zoneFilter, setZoneFilter] = useState<ZoneFilter>("all");
  const [isEntryOpen, setIsEntryOpen] = useState(false);
  const [entryName, setEntryName] = useState("");
  const [entryNightId, setEntryNightId] = useState<NightId>("hanoi");
  const [entryCharacterAsset, setEntryCharacterAsset] = useState<string>(crowdCharacterAssets[0]);
  const [lightstickColor, setLightstickColor] = useState(defaultLightstickColor);
  const [setlist, setSetlist] = useState<ConcertNight[]>(defaultConcertNights);
  const [adminStatus, setAdminStatus] = useState<"checking" | "logged-out" | "authenticated">("checking");
  const [adminUsername, setAdminUsername] = useState("");
  const [adminPassword, setAdminPassword] = useState("");
  const [adminError, setAdminError] = useState("");
  const [adminSaving, setAdminSaving] = useState(false);
  const [adminDraft, setAdminDraft] = useState<ConcertNight[]>(defaultConcertNights);
  const [nightTrackIndices, setNightTrackIndices] = useState<Record<NightId, number>>({ hanoi: 0, danang: 0, hochiminh: 0 });
  const [nightTrackOffsets, setNightTrackOffsets] = useState<Record<NightId, number>>({ hanoi: 0, danang: 0, hochiminh: 0 });
  const [remoteParticipants, setRemoteParticipants] = useState<Record<string, RemoteParticipant>>({});
  const [roomNotice, setRoomNotice] = useState("");
  const [connectionStatus, setConnectionStatus] = useState<ConnectionStatus>("idle");
  const multiplayerSocket = useRef<WebSocket | null>(null);
  const multiplayerSelfId = useRef("");
  const reconnectTimer = useRef<number | null>(null);
  const heartbeatTimer = useRef<number | null>(null);
  const heartbeatWatchTimer = useRef<number | null>(null);
  const reconnectAttempts = useRef(0);
  const lastPongAt = useRef(0);
  const sessionIdRef = useRef("");
  const entryModalRef = useRef<HTMLFormElement | null>(null);
  const userAvatarRef = useRef<UserAvatar | null>(userAvatar);
  const dancingRef = useRef(isDancing);
  const lightstickColorRef = useRef(lightstickColor);
  const pendingRemoteUpdates = useRef<Record<string, RemoteParticipant>>({});
  const remoteUpdateTimer = useRef<number | null>(null);
  const [message, setMessage] = useState("");
  const [messages, setMessages] = useState([
    { name: "Mây xanh", text: "Nhìn từ Sky Front đẹp quá ✦" },
    { name: "orbit_27", text: "Hẹn mọi người tại SKY DOME · 05.07.2027!" },
    { name: "Sơn ca", text: "Bật cloudstick lên, cùng đi qua bầu trời 💫" },
  ]);

  const concertNights = setlist;
  const activeNight = concertNights.find((night) => night.id === activeNightId) ?? concertNights[0];
  const currentTrackIndex = nightTrackIndices[activeNightId] ?? 0;
  const currentTrackOffset = nightTrackOffsets[activeNightId] ?? 0;
  const activeTrack = activeNight.tracks[currentTrackIndex] ?? activeNight.tracks[0];
  const activeAct = acts.find((act) => act.id === activeTrack.actId) ?? acts[0];
  const currentLightstickColor = lightstickColors.find((color) => color.value === lightstickColor) ?? lightstickColors[0];
  const connectionLabel: Record<ConnectionStatus, string> = { idle: "CHƯA VÀO PHÒNG", connecting: "ĐANG KẾT NỐI", connected: "ĐÃ ĐỒNG BỘ", reconnecting: "ĐANG KHÔI PHỤC", offline: "CHẾ ĐỘ CỤC BỘ", full: "PHÒNG ĐẦY" };

  useEffect(() => {
    if (!isEntryOpen) return;
    const dialog = entryModalRef.current;
    const previousFocus = document.activeElement instanceof HTMLElement ? document.activeElement : null;
    if (!dialog) return;
    const focusableSelector = 'button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), a[href], [tabindex]:not([tabindex="-1"])';
    const focusFirst = () => {
      const first = dialog.querySelector<HTMLElement>(focusableSelector);
      first?.focus();
    };
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        event.preventDefault();
        setIsEntryOpen(false);
        return;
      }
      if (event.key !== "Tab") return;
      const focusable = Array.from(dialog.querySelectorAll<HTMLElement>(focusableSelector));
      if (focusable.length === 0) return;
      const first = focusable[0];
      const last = focusable[focusable.length - 1];
      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first.focus();
      }
    };
    const frame = window.requestAnimationFrame(focusFirst);
    document.body.classList.add("modal-open");
    document.addEventListener("keydown", onKeyDown);
    return () => {
      window.cancelAnimationFrame(frame);
      document.body.classList.remove("modal-open");
      document.removeEventListener("keydown", onKeyDown);
      previousFocus?.focus();
    };
  }, [isEntryOpen]);

  useEffect(() => {
    if (!mobileNavOpen) return;
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") setMobileNavOpen(false);
    };
    document.addEventListener("keydown", onKeyDown);
    return () => document.removeEventListener("keydown", onKeyDown);
  }, [mobileNavOpen]);

  userAvatarRef.current = userAvatar;
  dancingRef.current = isDancing;
  lightstickColorRef.current = lightstickColor;

  const queueRemoteUpdate = useCallback((participant: RemoteParticipant) => {
    pendingRemoteUpdates.current[participant.id] = participant;
    if (remoteUpdateTimer.current !== null) return;
    remoteUpdateTimer.current = window.setTimeout(() => {
      const updates = pendingRemoteUpdates.current;
      pendingRemoteUpdates.current = {};
      remoteUpdateTimer.current = null;
      setRemoteParticipants((current) => {
        let changed = false;
        const next = { ...current };
        for (const [id, participantUpdate] of Object.entries(updates)) {
          if (!current[id]) continue;
          next[id] = participantUpdate;
          changed = true;
        }
        return changed ? next : current;
      });
    }, 100);
  }, []);

  useEffect(() => {
    const rawSession = window.sessionStorage.getItem("sky-tour-active-session");
    if (!rawSession) return;
    try {
      const saved = JSON.parse(rawSession) as { name?: string; asset?: string; lightstickColor?: string; nightId?: NightId; zoneId?: string; seatIndex?: number };
      const zone = allSeatingZones.find((candidate) => candidate.id === saved.zoneId);
      const night = concertNights.find((candidate) => candidate.id === saved.nightId);
      if (!saved.name || !saved.asset || !zone || !night) {
        window.sessionStorage.removeItem("sky-tour-active-session");
        return;
      }
      const seatIndex = typeof saved.seatIndex === "number" ? saved.seatIndex : 0;
      const placement = getSeatPlacement(zone, seatIndex);
      setActiveNightId(night.id);
      setEntryNightId(night.id);
      setSelectedZone(zone);
      setEntryName(saved.name);
      setLightstickColor(saved.lightstickColor ?? defaultLightstickColor);
      setUserAvatar({ name: saved.name, asset: saved.asset, seatIndex, position: placement.position, rotation: placement.rotation });
      setRoomNotice("Đang khôi phục vị trí SKY CROWD...");
    } catch {
      window.sessionStorage.removeItem("sky-tour-active-session");
    }
  }, []);

  useEffect(() => {
    if (!userAvatar) return;
    const rawSession = window.sessionStorage.getItem("sky-tour-active-session");
    if (!rawSession) return;
    try {
      const saved = JSON.parse(rawSession) as Record<string, unknown>;
      window.sessionStorage.setItem("sky-tour-active-session", JSON.stringify({ ...saved, lightstickColor, seatIndex: userAvatar.seatIndex }));
    } catch {
      // A malformed session is cleared by the restore effect on the next load.
    }
  }, [lightstickColor, userAvatar?.seatIndex]);

  useEffect(() => {
    fetch("/api/admin", { credentials: "same-origin" }).then(async (response) => {
      if (!response.ok) return null;
      return response.json() as Promise<{ setlist?: ConcertNight[] | null }>;
    }).then((data) => {
      if (data?.setlist && Array.isArray(data.setlist) && data.setlist.length > 0) {
        setSetlist(data.setlist);
        setAdminDraft(data.setlist);
      }
    }).catch(() => undefined);
  }, []);

  useEffect(() => {
    if (activeNav !== "Admin") return;
    setAdminStatus("checking");
    setAdminError("");
    fetch("/api/admin?auth=1", { credentials: "same-origin" }).then(async (response) => {
      const data = await response.json() as { authenticated?: boolean; setlist?: ConcertNight[] | null };
      if (!response.ok || !data.authenticated) {
        setAdminStatus("logged-out");
        return;
      }
      setAdminStatus("authenticated");
      if (data.setlist && Array.isArray(data.setlist) && data.setlist.length > 0) setAdminDraft(data.setlist);
    }).catch(() => {
      setAdminStatus("logged-out");
      setAdminError("Không kết nối được API quản trị.");
    });
  }, [activeNav]);

  useEffect(() => {
    multiplayerSocket.current?.close();
    multiplayerSocket.current = null;
    multiplayerSelfId.current = "";
    if (reconnectTimer.current !== null) {
      window.clearTimeout(reconnectTimer.current);
      reconnectTimer.current = null;
    }
    if (heartbeatTimer.current !== null) {
      window.clearInterval(heartbeatTimer.current);
      heartbeatTimer.current = null;
    }
    if (heartbeatWatchTimer.current !== null) {
      window.clearInterval(heartbeatWatchTimer.current);
      heartbeatWatchTimer.current = null;
    }
    setRemoteParticipants({});
    if (!userAvatar) {
      setConnectionStatus((current) => current === "full" ? current : "idle");
      return;
    }

    const protocol = window.location.protocol === "https:" ? "wss:" : "ws:";
    const isLocalDevSocket = ["localhost", "127.0.0.1", "0.0.0.0"].includes(window.location.hostname);
    const socketPath = isLocalDevSocket ? "/sky-tour" : "/api/ws";
    const socketUrl = `${protocol}//${window.location.host}${socketPath}`;
    let socket: WebSocket | null = null;
    let disposed = false;
    let shouldReconnect = true;
    const sessionStorageKey = "sky-tour-client-id";
    const storedSessionId = window.sessionStorage.getItem(sessionStorageKey);
    const clientSessionId = storedSessionId ?? (window.crypto?.randomUUID?.() ?? `sky-${Date.now()}-${Math.random().toString(36).slice(2)}`);
    window.sessionStorage.setItem(sessionStorageKey, clientSessionId);
    sessionIdRef.current = clientSessionId;

    const clearHeartbeat = () => {
      if (heartbeatTimer.current !== null) {
        window.clearInterval(heartbeatTimer.current);
        heartbeatTimer.current = null;
      }
      if (heartbeatWatchTimer.current !== null) {
        window.clearInterval(heartbeatWatchTimer.current);
        heartbeatWatchTimer.current = null;
      }
    };

    const scheduleReconnect = () => {
      if (disposed || !shouldReconnect || !userAvatarRef.current || reconnectTimer.current !== null) return;
      reconnectAttempts.current += 1;
      const attempt = reconnectAttempts.current;
      const delay = Math.min(12000, 1000 * (2 ** Math.min(attempt - 1, 4))) + Math.round(Math.random() * 450);
      setConnectionStatus("reconnecting");
      setRoomNotice(`Mất kết nối · đang thử lại lần ${attempt} sau ${Math.ceil(delay / 1000)}s...`);
      reconnectTimer.current = window.setTimeout(() => {
        reconnectTimer.current = null;
        connect();
      }, delay);
    };

    const connect = () => {
      if (disposed || !shouldReconnect || !userAvatarRef.current) return;
      if (socket && (socket.readyState === WebSocket.CONNECTING || socket.readyState === WebSocket.OPEN)) return;
      setConnectionStatus(reconnectAttempts.current > 0 ? "reconnecting" : "connecting");
      const nextSocket = new WebSocket(socketUrl);
      socket = nextSocket;
      multiplayerSocket.current = nextSocket;

      nextSocket.onopen = () => {
        const currentUser = userAvatarRef.current;
        if (!currentUser) return;
        reconnectAttempts.current = 0;
        lastPongAt.current = Date.now();
        setConnectionStatus("connecting");
        setRoomNotice("Đang đồng bộ SKY CROWD...");
        nextSocket.send(JSON.stringify({ type: "join", clientId: clientSessionId, nightId: activeNightId, name: currentUser.name, asset: currentUser.asset, lightstickColor: lightstickColorRef.current, zoneId: selectedZone.id, position: currentUser.position, rotation: currentUser.rotation, dancing: dancingRef.current }));
        clearHeartbeat();
        heartbeatTimer.current = window.setInterval(() => {
          if (nextSocket.readyState !== WebSocket.OPEN) return;
          nextSocket.send(JSON.stringify({ type: "heartbeat" }));
        }, 10000);
        heartbeatWatchTimer.current = window.setInterval(() => {
          if (Date.now() - lastPongAt.current > 30000) nextSocket.close();
        }, 5000);
      };
      nextSocket.onmessage = (event) => {
      let message: { type?: string; selfId?: string; participants?: RemoteParticipant[]; participant?: RemoteParticipant; id?: string; capacity?: number; message?: string; zoneId?: string };
      try {
        message = JSON.parse(event.data) as typeof message;
      } catch {
        return;
      }
      if (message.type === "pong") {
        lastPongAt.current = Date.now();
        return;
      }
      if (message.type === "joined") {
        multiplayerSelfId.current = message.selfId ?? "";
        const participants = (message.participants ?? []).map(normalizeParticipantSeat);
        setRemoteParticipants(Object.fromEntries(participants.filter((participant) => participant.id !== multiplayerSelfId.current).map((participant) => [participant.id, participant])));
        const selfParticipant = participants.find((participant) => participant.id === multiplayerSelfId.current);
        if (selfParticipant) {
          const placement = getSeatPlacement(selectedZone, selfParticipant.seatIndex ?? 0);
          setUserAvatar((current) => current ? { ...current, seatIndex: selfParticipant.seatIndex ?? current.seatIndex, position: placement.position, rotation: placement.rotation } : current);
        }
        setConnectionStatus("connected");
        setRoomNotice(`SKY CROWD · ${participants.length}/${message.capacity ?? 100}`);
      }
      if (message.type === "participant-joined" && message.participant) {
        const participant = normalizeParticipantSeat(message.participant);
        setRemoteParticipants((current) => ({ ...current, [participant.id]: participant }));
      }
      if (message.type === "participant-updated" && message.participant) {
        queueRemoteUpdate(normalizeParticipantSeat(message.participant));
      }
      if (message.type === "participant-left" && message.id) {
        setRemoteParticipants((current) => {
          const next = { ...current };
          delete next[message.id!];
          return next;
        });
      }
      if (message.type === "join-error") {
        shouldReconnect = false;
        setConnectionStatus("full");
        setRoomNotice(message.message ?? "Không thể vào phòng concert.");
        window.sessionStorage.removeItem("sky-tour-active-session");
        setUserAvatar(null);
        setIsEntryOpen(true);
      }
      };
      nextSocket.onerror = () => {
        if (!disposed && shouldReconnect) {
          setConnectionStatus("reconnecting");
          setRoomNotice("Kết nối realtime gián đoạn · đang tự khôi phục...");
        }
      };
      nextSocket.onclose = () => {
        clearHeartbeat();
        if (multiplayerSocket.current === nextSocket) multiplayerSocket.current = null;
        if (!disposed && shouldReconnect && userAvatarRef.current) scheduleReconnect();
      };
    };

    connect();

    return () => {
      disposed = true;
      shouldReconnect = false;
      if (reconnectTimer.current !== null) {
        window.clearTimeout(reconnectTimer.current);
        reconnectTimer.current = null;
      }
      clearHeartbeat();
      if (remoteUpdateTimer.current !== null) {
        window.clearTimeout(remoteUpdateTimer.current);
        remoteUpdateTimer.current = null;
      }
      pendingRemoteUpdates.current = {};
      socket?.close();
      if (multiplayerSocket.current === socket) multiplayerSocket.current = null;
    };
  }, [activeNightId, queueRemoteUpdate, selectedZone.id, selectedZone.position, selectedZone.size, userAvatar?.name, userAvatar?.asset]);

  useEffect(() => {
    if (!userAvatar) return;
    const sendPose = () => {
      const socket = multiplayerSocket.current;
      if (!socket || socket.readyState !== WebSocket.OPEN) return;
      const position = userAvatar.position;
      socket.send(JSON.stringify({ type: "pose", position, rotation: userAvatar.rotation, lightstickColor, dancing: isDancing }));
    };
    const timer = window.setInterval(sendPose, 250);
    sendPose();
    return () => window.clearInterval(timer);
  }, [isDancing, lightstickColor, selectedZone, userAvatar]);

  useEffect(() => {
    if (!userAvatar) return;
    const onKeyDown = (event: KeyboardEvent) => {
      const activeElement = document.activeElement;
      const isTyping = activeElement instanceof HTMLInputElement || activeElement instanceof HTMLSelectElement || activeElement instanceof HTMLTextAreaElement;
      if (event.key === " " && !isTyping && !event.repeat) {
        event.preventDefault();
        setIsDancing((value) => !value);
      }
    };
    window.addEventListener("keydown", onKeyDown);
    return () => {
      window.removeEventListener("keydown", onKeyDown);
    };
  }, [userAvatar]);

  const jumpToTrack = (trackIndex: number) => {
    const normalizedIndex = ((trackIndex % activeNight.tracks.length) + activeNight.tracks.length) % activeNight.tracks.length;
    setNightTrackIndices((current) => ({ ...current, [activeNightId]: normalizedIndex }));
    setNightTrackOffsets((current) => ({ ...current, [activeNightId]: 0 }));
  };

  const selectAct = (actId: ActId) => {
    const nextTrackIndex = activeNight.tracks.findIndex((track) => track.actId === actId);
    if (nextTrackIndex >= 0) jumpToTrack(nextTrackIndex);
  };

  const selectTrack = (index: number) => jumpToTrack(index);

  const selectZone = (zone: Zone) => {
    if (userAvatar) return;
    setSelectedZone(zone);
  };

  const nextTrack = () => {
    jumpToTrack(currentTrackIndex + 1);
  };

  const handleTrackEnded = useCallback((nightId: NightId, trackCount: number) => {
    setNightTrackOffsets((current) => ({ ...current, [nightId]: 0 }));
    setNightTrackIndices((current) => ({ ...current, [nightId]: ((current[nightId] ?? 0) + 1) % trackCount }));
  }, []);

  const handlePlaybackTime = useCallback((nightId: NightId, seconds: number) => {
    setNightTrackOffsets((current) => {
      const previous = current[nightId] ?? 0;
      const next = Number(seconds.toFixed(2));
      // Ignore a loading reset or a stale timestamp from the previous YouTube player instance.
      if (next <= 0.1 && previous > 1) return current;
      if (next + 0.75 < previous) return current;
      if (Math.abs(next - previous) < 0.2) return current;
      return { ...current, [nightId]: next };
    });
  }, []);

  const toggleFullscreen = () => {
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen?.().catch(() => undefined);
    } else {
      document.exitFullscreen?.().catch(() => undefined);
    }
  };

  const resetCamera = () => {
    setCameraMode(userAvatar ? "thirdPerson" : "front");
    setCameraResetToken((value) => value + 1);
  };

  const submitMessage = () => {
    const cleanMessage = message.trim();
    if (!cleanMessage) return;
    setMessages((current) => [...current.slice(-4), { name: "Bạn", text: cleanMessage }]);
    setMessage("");
  };

  const changeZoneFilter = (filter: ZoneFilter) => {
    setZoneFilter(filter);
    if (filter !== "all" && getZoneFilter(selectedZone.id) !== filter) {
      const nextZone = zones.find((zone) => getZoneFilter(zone.id) === filter) ?? seatingBlocks.map(seatingBlockToZone).find((block) => getZoneFilter(block.id) === filter);
      if (nextZone) setSelectedZone(nextZone);
    }
  };

  const joinConcert = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const cleanName = entryName.trim();
    if (!cleanName) return;
    const nextNight = concertNights.find((night) => night.id === entryNightId) ?? concertNights[0];
    const seat = getSeatPlacement(selectedZone, 0);
    setActiveNightId(nextNight.id);
    setUserAvatar({ name: cleanName, asset: entryCharacterAsset, seatIndex: 0, position: seat.position, rotation: seat.rotation });
    window.sessionStorage.setItem("sky-tour-active-session", JSON.stringify({ name: cleanName, asset: entryCharacterAsset, lightstickColor, nightId: nextNight.id, zoneId: selectedZone.id, seatIndex: 0 }));
    setIsDancing(false);
    setSoundOn(true);
    setCameraMode("thirdPerson");
    setRoomNotice("Đang kết nối SKY CROWD...");
    setMessages((current) => [...current.slice(-4), { name: "SKY TOUR", text: `${cleanName} đã vào ${nextNight.city} · ${selectedZone.name}. Đang phát đoạn hiện tại của setlist.` }]);
    setIsEntryOpen(false);
    setIsChatOpen(true);
  };

  const exitConcert = () => {
    const leavingName = userAvatar?.name;
    window.sessionStorage.removeItem("sky-tour-active-session");
    setUserAvatar(null);
    setIsDancing(false);
    setSoundOn(false);
    setCameraMode("front");
    setIsEntryOpen(false);
    if (leavingName) setMessages((current) => [...current.slice(-4), { name: "SKY TOUR", text: `${leavingName} đã rời concert.` }]);
  };

  const loginAdmin = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setAdminError("");
    const response = await fetch("/api/admin", { method: "POST", credentials: "same-origin", headers: { "content-type": "application/json" }, body: JSON.stringify({ action: "login", username: adminUsername, password: adminPassword }) });
    const data = await response.json() as { authenticated?: boolean; error?: string };
    if (!response.ok || !data.authenticated) {
      setAdminError(data.error ?? "Đăng nhập admin thất bại.");
      setAdminStatus("logged-out");
      return;
    }
    setAdminPassword("");
    setAdminStatus("authenticated");
    const current = await fetch("/api/admin?auth=1", { credentials: "same-origin" });
    if (current.ok) {
      const currentData = await current.json() as { setlist?: ConcertNight[] | null };
      if (currentData.setlist && Array.isArray(currentData.setlist) && currentData.setlist.length > 0) setAdminDraft(currentData.setlist);
    }
  };

  const saveAdminSetlist = async () => {
    setAdminSaving(true);
    setAdminError("");
    try {
      const response = await fetch("/api/admin", { method: "POST", credentials: "same-origin", headers: { "content-type": "application/json" }, body: JSON.stringify({ action: "save", setlist: adminDraft }) });
      const data = await response.json() as { saved?: boolean; setlist?: ConcertNight[]; error?: string };
      if (!response.ok || !data.saved || !data.setlist) {
        setAdminError(data.error ?? "Không thể lưu setlist.");
        if (response.status === 401) setAdminStatus("logged-out");
        return;
      }
      setAdminDraft(data.setlist);
      setSetlist(data.setlist);
      setAdminError("Đã lưu setlist cho phiên server hiện tại.");
    } catch {
      setAdminError("Không kết nối được API quản trị.");
    } finally {
      setAdminSaving(false);
    }
  };

  const logoutAdmin = async () => {
    await fetch("/api/admin", { method: "POST", credentials: "same-origin", headers: { "content-type": "application/json" }, body: JSON.stringify({ action: "logout" }) }).catch(() => undefined);
    setAdminStatus("logged-out");
    setAdminPassword("");
    setAdminError("");
    setActiveNav("Home");
  };

  const updateAdminNight = (nightId: NightId, field: "city" | "date" | "month" | "dateLabel" | "venue" | "tagline", value: string) => {
    setAdminDraft((current) => current.map((night) => night.id === nightId ? { ...night, [field]: value } : night));
  };

  const updateAdminTrack = (nightId: NightId, trackIndex: number, field: "title" | "duration" | "youtubeId" | "actId", value: string) => {
    setAdminDraft((current) => current.map((night) => night.id !== nightId ? night : { ...night, tracks: night.tracks.map((track, index) => index === trackIndex ? { ...track, [field]: value } : track) }));
  };

  const addAdminTrack = (nightId: NightId) => {
    setAdminDraft((current) => current.map((night) => {
      if (night.id !== nightId) return night;
      const nextId = String(night.tracks.length + 1).padStart(2, "0");
      return { ...night, tracks: [...night.tracks, { id: nextId, actId: "awakening", title: "Tiết mục mới", duration: "YouTube", youtubeId: night.tracks[0]?.youtubeId ?? "REPLACE_ME" }] };
    }));
  };

  const removeAdminTrack = (nightId: NightId, trackIndex: number) => {
    setAdminDraft((current) => current.map((night) => night.id !== nightId || night.tracks.length <= 1 ? night : { ...night, tracks: night.tracks.filter((_, index) => index !== trackIndex).map((track, index) => ({ ...track, id: String(index + 1).padStart(2, "0") })) }));
  };

  const cycleLightstickColor = () => {
    const currentIndex = lightstickColors.findIndex((color) => color.value === lightstickColor);
    setLightstickColor(lightstickColors[(currentIndex + 1) % lightstickColors.length].value);
  };

  const scrollToConcert = () => document.getElementById("concert")?.scrollIntoView({ behavior: "smooth" });
  const navItems = ["Home", "The stage", "The experience", "Setlist", "About SKY TOUR"];
  const handleNavClick = (item: string) => {
    setActiveNav(item);
    setMobileNavOpen(false);
  };
  const totalTracks = concertNights.reduce((total, night) => total + night.tracks.length, 0);
  const openNight = (nightId: NightId, openEntry = false) => {
    setActiveNightId(nightId);
    setEntryNightId(nightId);
    setActiveNav("The stage");
    if (openEntry) setIsEntryOpen(true);
  };

  return (
    <main className={`app-shell ${activeNav === "The stage" ? "map-only" : "tab-mode"}`}>
      <div className="grain" />
      <div className="portrait-lock" role="dialog" aria-modal="true" aria-label="Xoay ngang màn hình để vào SKY TOUR">
        <div className="portrait-lock-card">
          <span className="portrait-lock-kicker">SKY TOUR ONLINE</span>
          <div className="rotate-device" aria-hidden="true"><span>↻</span></div>
          <h1>Xoay ngang màn hình</h1>
          <p>Hãy xoay điện thoại sang ngang để bước vào không gian concert 3D.</p>
          <small>LANDSCAPE MODE REQUIRED</small>
        </div>
      </div>
      <a className="skip-link" href={activeNav === "The stage" ? "#concert" : "#tab-content"}>BỎ QUA ĐIỀU HƯỚNG</a>
      {concertNights.map((night) => {
        const track = night.tracks[nightTrackIndices[night.id] ?? 0];
        return <YouTubePlaybackController key={night.id} videoId={track.youtubeId} onEnded={() => handleTrackEnded(night.id, night.tracks.length)} onTimeUpdate={(seconds) => handlePlaybackTime(night.id, seconds)} />;
      })}
      <header className="topbar">
        <a className="brand" href="#top" aria-label="Sky Tour Online home">
          <span className="brand-logo-crop"><img src={logoAsset} alt="Sơn Tùng M-TP logo" /></span>
          <span className="brand-copy"><strong>SKY TOUR</strong><small>ONLINE</small></span>
        </a>
        <nav className="desktop-nav" aria-label="Main navigation">
          {navItems.map((item) => (
            <button key={item} className={activeNav === item ? "nav-link active" : "nav-link"} onClick={() => handleNavClick(item)} aria-current={activeNav === item ? "page" : undefined}>
              {item}
            </button>
          ))}
        </nav>
        <div className="top-actions">
          <button className="language-button" type="button" aria-label="Ngôn ngữ hiện tại: tiếng Việt, tiếng Anh">VI <span aria-hidden="true">/</span> EN</button>
          <button className="fullscreen-button" type="button" onClick={toggleFullscreen} aria-label="Bật hoặc tắt chế độ toàn màn hình">FULLSCREEN</button>
          <button className="avatar-button" onClick={() => handleNavClick("Admin")} aria-label="Mở trang quản trị" title="Admin">ST</button>
          <button className="mobile-nav-toggle" type="button" onClick={() => setMobileNavOpen((value) => !value)} aria-expanded={mobileNavOpen} aria-controls="mobile-navigation">{mobileNavOpen ? "ĐÓNG" : "MENU"}</button>
        </div>
      </header>
      {mobileNavOpen && <nav className="mobile-nav" id="mobile-navigation" aria-label="Mobile navigation">
        {navItems.map((item) => <button key={item} className={activeNav === item ? "active" : ""} onClick={() => handleNavClick(item)} aria-current={activeNav === item ? "page" : undefined}>{item}</button>)}
        <button className={activeNav === "Admin" ? "active" : ""} onClick={() => handleNavClick("Admin")} aria-current={activeNav === "Admin" ? "page" : undefined}>Admin control room</button>
      </nav>}

      {activeNav !== "The stage" && <section className="tab-page" id="tab-content" aria-label={activeNav} tabIndex={-1}>
        <div className="tab-page-header">
          <div>
            <span className="section-kicker">SKY TOUR ONLINE / {activeNav.toUpperCase()}</span>
            {activeNav === "Home" && <><h2>Meet me<br /><em>beyond the sky.</em></h2><p className="tab-lead">Một sân vận động 3D nơi SKY có thể bước vào cùng nhau, nhìn thấy cùng một sân khấu và nghe cùng một hành trình âm nhạc.</p></>}
            {activeNav === "The experience" && <><h2>One sky.<br /><em>One crowd.</em></h2><p className="tab-lead">Từ khoảnh khắc chọn nhân vật đến lúc lightstick cùng bật sáng, mỗi lựa chọn tạo nên vị trí riêng của bạn trong SKY TOUR ONLINE.</p></>}
            {activeNav === "Setlist" && <><h2>Three nights.<br /><em>One setlist.</em></h2><p className="tab-lead">Ba đêm diễn concept được xây dựng thành một vòng lặp âm nhạc liên tục. Khi vào concert, bạn sẽ xem đúng đoạn đang phát của đêm đã chọn.</p></>}
            {activeNav === "About SKY TOUR" && <><h2>The story<br /><em>behind SKY.</em></h2><p className="tab-lead">Một không gian tri ân tinh thần SKY TOUR của Sơn Tùng M-TP, được diễn giải lại thành trải nghiệm 3D tương tác.</p></>}
            {activeNav === "Admin" && <><h2>Control<br /><em>the sky.</em></h2><p className="tab-lead">Khu vực riêng để quản lý đêm diễn, tiết mục và link phát. Chỉ phiên admin hợp lệ mới có thể chỉnh sửa hoặc lưu dữ liệu.</p></>}
          </div>
          <div className="tab-header-note"><span className="live-pill"><i /> SKY ONLINE</span><span>PROJECT CONCEPT · 2027</span><span>{activeNight.city} · {activeNight.dateLabel}</span></div>
        </div>

        {activeNav === "Home" && <>
          <div className="tab-actions"><button className="primary-button" onClick={() => { setActiveNav("The stage"); setIsEntryOpen(true); }}>VÀO CONCERT <span>↗</span></button><button className="tab-outline-button" onClick={() => setActiveNav("Setlist")}>XEM SETLIST <span>↗</span></button></div>
          <div className="tab-section-label"><span>SKY TOUR ROUTE</span><span>03 NIGHTS · 03 CITIES</span></div>
          <div className="tab-card-grid">{concertNights.map((night, index) => <article className={`tab-card ${night.id === activeNightId ? "is-selected" : ""}`} key={night.id}>
            <span className="tab-card-index">0{index + 1}</span><span className="tab-card-city">{night.city}</span><strong>{night.dateLabel}</strong><p>{night.venue} · {night.tracks.length} tiết mục</p><button onClick={() => openNight(night.id)}>XEM ĐÊM NÀY <span>↗</span></button>
          </article>)}</div>
        </>}

        {activeNav === "The experience" && <>
          <div className="tab-actions"><button className="primary-button" onClick={() => { setActiveNav("The stage"); setIsEntryOpen(true); }}>CHỌN VỊ TRÍ <span>↗</span></button><button className="tab-outline-button" onClick={() => setActiveNav("Setlist")}>KHÁM PHÁ SETLIST <span>↗</span></button></div>
          <div className="experience-grid">
            <article className="experience-card"><span>01</span><h3>Bước vào bằng tên của bạn</h3><p>Chọn đêm diễn, khu vực khán giả và một nhân vật SKY trước khi bước vào sân vận động.</p></article>
            <article className="experience-card"><span>02</span><h3>SKY CROWD · tối đa 100 người</h3><p>Mỗi người có một nhân vật riêng, tên hiển thị và lightstick để tạo nên một khán đài sống động.</p></article>
            <article className="experience-card"><span>03</span><h3>Sân khấu 3D trung tâm</h3><p>Khán giả bao quanh sân khấu 360°, với runway, màn LED treo và ánh sáng xanh điện theo từng act.</p></article>
            <article className="experience-card"><span>04</span><h3>Setlist đồng bộ</h3><p>Âm nhạc chạy nền theo đêm diễn, còn màn LED trung tâm hiển thị tiết mục đang phát trong thời gian thực.</p></article>
          </div>
          <div className="experience-note"><span className="live-dot" /><strong>THIRD-PERSON VIEW</strong><span>Nhân vật luôn hướng về sân khấu · SPACE để dance</span></div>
        </>}

        {activeNav === "Setlist" && <>
          <div className="tab-actions"><button className="primary-button" onClick={() => { setActiveNav("The stage"); setIsEntryOpen(true); }}>VÀO THEO ĐÊM ĐÃ CHỌN <span>↗</span></button><span className="tab-actions-meta">{totalTracks} tracks · YouTube playback</span></div>
          <div className="setlist-tab-grid">{concertNights.map((night) => <article className={`setlist-tab-card ${night.id === activeNightId ? "is-selected" : ""}`} key={night.id}>
            <button className="setlist-tab-heading" onClick={() => openNight(night.id)}><span><small>{night.dateLabel} · {night.venue.split(" · ")[0]}</small><strong>{night.city}</strong></span><em>{night.id === activeNightId ? "ĐANG CHỌN" : "CHỌN ĐÊM"} ↗</em></button>
            <div className="setlist-tab-tracks">{night.tracks.map((track) => <a className="setlist-tab-track" href={`https://www.youtube.com/watch?v=${track.youtubeId}`} target="_blank" rel="noreferrer" key={`${night.id}-${track.id}`}><span>{track.id}</span><strong>{track.title}</strong><small>{track.actId.toUpperCase()}</small></a>)}</div>
          </article>)}</div>
        </>}

        {activeNav === "About SKY TOUR" && <div className="about-layout">
          <article className="about-panel about-panel-main"><span className="section-kicker">THE ARTIST / THE JOURNEY</span><h3>Sơn Tùng M-TP<br /><em>and the SKY.</em></h3><p>Sơn Tùng M-TP là nghệ sĩ đứng sau M-TP Entertainment. SKY TOUR 2019 là chuỗi concert được thực hiện bởi M-TP Entertainment và là nguồn cảm hứng cho concept SKY TOUR ONLINE này.</p><p>Trong project này, ba mốc TP. Hồ Chí Minh · 27.03.2027, Đà Nẵng · 27.05.2027 và Hà Nội · 05.07.2027 là lịch diễn giả lập để trải nghiệm sản phẩm, không phải lịch diễn chính thức.</p><a className="official-link" href="https://www.youtube.com/watch?v=Z2DvdjaEQtE" target="_blank" rel="noreferrer">XEM TRAILER SKY TOUR 2019 <span>↗</span></a></article>
          <div className="about-side"><article className="about-panel"><span className="section-kicker">THE PROJECT</span><strong>THE JOURNEY<br />BEYOND THE SKY.</strong><p>3 đêm · 3 chương · 39 tiết mục · 1 bầu trời chung.</p></article><article className="about-panel"><span className="section-kicker">THE CODE</span><strong>BLUE LIGHT.<br />REAL CROWD.</strong><p>React · Three.js · WebSocket · YouTube playback.</p></article></div>
        </div>}

        {activeNav === "Admin" && <div className="admin-shell">
          {adminStatus === "checking" && <div className="admin-state"><span className="live-dot" /> ĐANG KIỂM TRA PHIÊN ADMIN...</div>}
          {adminStatus === "logged-out" && <form className="admin-login-card" onSubmit={loginAdmin}>
            <span className="section-kicker">PRIVATE CONTROL ROOM</span><h3>Admin<br /><em>sign in.</em></h3><p>Đăng nhập bằng tài khoản được cấu hình trên server. Người xem thông thường không thể lưu thay đổi setlist.</p>
            <label>TÊN ĐĂNG NHẬP<input value={adminUsername} onChange={(event) => setAdminUsername(event.target.value)} autoComplete="username" placeholder="admin" /></label>
            <label>MẬT KHẨU<input type="password" value={adminPassword} onChange={(event) => setAdminPassword(event.target.value)} autoComplete="current-password" placeholder="••••••••" /></label>
            {adminError && <small className="admin-feedback">{adminError}</small>}
            <button className="primary-button" type="submit">VÀO TRANG QUẢN TRỊ <span>↗</span></button>
            <small className="admin-security-note">Phiên đăng nhập dùng cookie HttpOnly và hết hạn sau 24 giờ.</small>
          </form>}
          {adminStatus === "authenticated" && <>
            <div className="admin-toolbar"><div><span className="section-kicker">SETLIST CMS / AUTHENTICATED</span><strong>Quản lý chương trình</strong><small>Cập nhật tiêu đề, act, thời lượng và video YouTube cho từng đêm.</small></div><div className="admin-toolbar-actions"><button className="primary-button" type="button" onClick={saveAdminSetlist} disabled={adminSaving}>{adminSaving ? "ĐANG LƯU..." : "LƯU SETLIST"} <span>↗</span></button><button className="tab-outline-button" type="button" onClick={logoutAdmin}>ĐĂNG XUẤT</button></div></div>
            {adminError && <div className="admin-feedback admin-feedback-wide">{adminError}</div>}
            <div className="admin-night-grid">{adminDraft.map((night) => <article className="admin-night-card" key={night.id}>
              <div className="admin-night-heading"><span><small>{night.id.toUpperCase()} · NIGHT</small><strong>{night.city}</strong></span><b>{night.tracks.length} TRACKS</b></div>
              <div className="admin-fields-grid">
                <label className="admin-field"><span>THÀNH PHỐ</span><input value={night.city} onChange={(event) => updateAdminNight(night.id as NightId, "city", event.target.value)} /></label>
                <label className="admin-field"><span>NGÀY</span><input value={night.date} onChange={(event) => updateAdminNight(night.id as NightId, "date", event.target.value)} /></label>
                <label className="admin-field"><span>THÁNG</span><input value={night.month} onChange={(event) => updateAdminNight(night.id as NightId, "month", event.target.value)} /></label>
                <label className="admin-field"><span>DATE LABEL</span><input value={night.dateLabel} onChange={(event) => updateAdminNight(night.id as NightId, "dateLabel", event.target.value)} /></label>
                <label className="admin-field admin-field-wide"><span>VENUE</span><input value={night.venue} onChange={(event) => updateAdminNight(night.id as NightId, "venue", event.target.value)} /></label>
                <label className="admin-field admin-field-wide"><span>TAGLINE</span><input value={night.tagline} onChange={(event) => updateAdminNight(night.id as NightId, "tagline", event.target.value)} /></label>
              </div>
              <div className="admin-track-header"><span>SETLIST</span><span>TITLE / YOUTUBE VIDEO ID / ACT</span><button type="button" onClick={() => addAdminTrack(night.id as NightId)}>+ THÊM BÀI</button></div>
              <div className="admin-track-list">{night.tracks.map((track, trackIndex) => <div className="admin-track-row" key={`${night.id}-${trackIndex}`}>
                <span className="admin-track-number">{track.id}</span><input className="admin-track-title" value={track.title} onChange={(event) => updateAdminTrack(night.id as NightId, trackIndex, "title", event.target.value)} aria-label={`Tên bài ${track.id}`} /><input className="admin-track-youtube" value={track.youtubeId} onChange={(event) => updateAdminTrack(night.id as NightId, trackIndex, "youtubeId", event.target.value)} aria-label={`YouTube ID ${track.id}`} /><select value={track.actId} onChange={(event) => updateAdminTrack(night.id as NightId, trackIndex, "actId", event.target.value)} aria-label={`Act ${track.id}`}>{acts.map((act) => <option key={act.id} value={act.id}>{act.number} · {act.title}</option>)}</select><button className="admin-delete-track" type="button" onClick={() => removeAdminTrack(night.id as NightId, trackIndex)} aria-label={`Xóa bài ${track.id}`}>×</button>
              </div>)}</div>
            </article>)}</div>
          </>}
        </div>}
      </section>}

      <section className="hero" id="top">
        <div className="hero-copy">
          <div className="eyebrow"><span className="live-dot" /> NOW BOARDING <span className="eyebrow-line" /> 03 NIGHTS</div>
          <h1>Meet me<br /><em>beyond the sky.</em></h1>
          <p>Sơn Tùng M-TP SKY TOUR đưa bạn đi qua ba thành phố, ba đêm diễn và những tiết mục được kết nối thành một hành trình duy nhất giữa biển sao.</p>
          <div className="hero-buttons">
            <button className="primary-button" onClick={scrollToConcert}>Vào concert <span>↗</span></button>
            <button className="text-button" onClick={() => setIsLive(!isLive)}><span className="play-icon">{isLive ? "Ⅱ" : "▶"}</span> {isLive ? "Live preview" : "Resume preview"}</button>
          </div>
          <div className="hero-meta"><span><strong>03</strong> thành phố</span><span><strong>03</strong> đêm diễn</span><span><strong>39</strong> tiết mục</span></div>
        </div>
        <div className="hero-art" aria-hidden="true">
          <div className="orbit orbit-one" /><div className="orbit orbit-two" /><div className="planet"><div className="planet-glow" /><div className="planet-core" /></div>
          <div className="hero-star star-a" /><div className="hero-star star-b" /><div className="hero-star star-c" />
          <span className="art-caption caption-one">A NEW<br />NIGHT IS<br /><em>CALLING</em></span>
          <span className="art-caption caption-two">11° 04' 26" N<br />106° 37' 28" E</span>
        </div>
        <div className="scroll-hint"><span className="scroll-line" /> SCROLL TO EXPLORE</div>
      </section>

      <section className="route-section section-pad">
        <div className="section-heading"><div><span className="section-kicker">SKY TOUR ROUTE / 01</span><h2>Choose your<br /><em>night.</em></h2></div><p>Mỗi thành phố là một chương của THE JOURNEY BEYOND THE SKY. Chọn một đêm diễn để giữ lấy vị trí của bạn trong sân vận động.</p></div>
        <div className="city-grid">
          {(["hanoi", "danang", "hochiminh"] as NightId[]).map((nightId, index) => {
            const night = concertNights.find((item) => item.id === nightId) ?? concertNights[0];
            const color = ["#8cf9e3", "#4f76ff", "#86dfff"][index];
            return <button className={`city-card ${index === 0 ? "featured" : ""}`} key={night.id} onClick={scrollToConcert} style={{ "--city-accent": color } as React.CSSProperties}>
              <span className="city-number">0{index + 1}</span><span className="city-light" /><span className="city-city">{night.city}</span><span className="city-detail">{night.dateLabel} · {night.venue.split(" · ")[0]}</span><span className="city-arrow">↗</span>
            </button>;
          })}
        </div>
      </section>

      <section className="concert-section section-pad" id="concert" aria-label="Bản đồ sân khấu 3D" tabIndex={-1}>
        <div className="section-heading concert-heading"><div><span className="section-kicker">SKY TOUR ONLINE / THE SKY ARENA</span><h2>The journey<br /><em>beyond the sky.</em></h2></div><div className="heading-aside"><span className="live-pill"><i /> LIVE PREVIEW</span><span>{activeNight.city} · {activeAct.title} · {activeAct.theme}</span><span>{cameraPresets[cameraMode].label} · Drag to rotate · Scroll to zoom</span></div></div>
        <div className="reference-toolbar" role="region" aria-label="Điều khiển bản đồ sân khấu">
          <span className="reference-title"><i /> SKY TOUR 3D MAP <small>INTERACTIVE FLOOR PLAN</small></span>
          <div className="reference-actions">
            <label className="reference-act"><span>ACT</span><select value={activeAct.id} onChange={(event) => selectAct(event.target.value as ActId)} aria-label="Chọn act"><option value="awakening">01 · AWAKENING</option><option value="golden">02 · GOLDEN ERA</option><option value="love">03 · LOVE STORY</option><option value="rebel">04 · REBEL</option><option value="ours">05 · SKY IS OURS</option><option value="encore">EN · WE ARE SKY</option></select></label>
            <button className="reference-join" onClick={userAvatar ? exitConcert : () => setIsEntryOpen(true)}>{userAvatar ? "RỜI CHỖ" : "VÀO CONCERT"} <b>{userAvatar ? "↙" : "↗"}</b></button>
            <button className={cameraMode === "front" ? "is-active" : ""} onClick={() => setCameraMode("front")} aria-pressed={cameraMode === "front"}>TOÀN CẢNH</button>
            <button className={cameraMode === "bird" ? "is-active" : ""} onClick={() => setCameraMode("bird")} aria-pressed={cameraMode === "bird"}>NHÌN TỪ TRÊN</button>
            <button className="camera-reset-button" type="button" onClick={resetCamera} aria-label="Đặt lại góc nhìn camera">RESET CAMERA</button>
            <button className={showZoneLabels ? "is-active" : ""} onClick={() => setShowZoneLabels((value) => !value)} aria-pressed={showZoneLabels}>TÊN KHU</button>
            {userAvatar && <button className={isDancing ? "is-active" : ""} onClick={() => setIsDancing((value) => !value)} aria-pressed={isDancing}> {isDancing ? "DANCE ON" : "DANCE"}</button>}
            {userAvatar && <button className="lightstick-control" onClick={cycleLightstickColor} aria-label={`Đổi màu lightstick, màu hiện tại ${currentLightstickColor.name}`}><i style={{ background: lightstickColor }} /> {currentLightstickColor.name}</button>}
          </div>
        </div>
        <div className="control-dock" role="group" aria-label="Điều khiển sân khấu">
          <div className="control-group act-control"><span className="control-label">SELECT ACT</span><div className="control-buttons act-buttons">{acts.map((act) => <button type="button" key={act.id} className={activeAct.id === act.id ? "control-button is-active" : "control-button"} onClick={() => selectAct(act.id)} aria-pressed={activeAct.id === act.id} style={{ "--control-color": act.accent } as React.CSSProperties}>{act.number}<small>{act.title.replace("THE ", "")}</small></button>)}</div></div>
          <div className="control-group camera-control"><span className="control-label">CAMERA</span><div className="control-buttons">{(Object.keys(cameraPresets) as CameraMode[]).map((mode) => <button type="button" key={mode} className={cameraMode === mode ? "control-button is-active" : "control-button"} onClick={() => setCameraMode(mode)} aria-pressed={cameraMode === mode}>{cameraPresets[mode].label}</button>)}</div></div>
          <div className="control-group effect-control"><span className="control-label">LIVE CONTROLS</span><div className="control-buttons"><button type="button" className={soundOn ? "control-button is-active" : "control-button"} onClick={() => setSoundOn((value) => !value)} aria-pressed={soundOn}>SOUND {soundOn ? "ON" : "OFF"}</button><button type="button" className={lightingOn ? "control-button is-active" : "control-button"} onClick={() => setLightingOn((value) => !value)} aria-pressed={lightingOn}>LIGHTING</button><button type="button" className={laserOn ? "control-button is-active" : "control-button"} onClick={() => setLaserOn((value) => !value)} aria-pressed={laserOn}>LASER</button><button type="button" className={lightsticksOn ? "control-button is-active" : "control-button"} onClick={() => setLightsticksOn((value) => !value)} aria-pressed={lightsticksOn}>LIGHTSTICKS</button></div></div>
        </div>
        <div className="concert-layout">
          <div className="venue-card">
            <div className="venue-toolbar"><span><Icon>✦</Icon> SKY ARENA / 3D FLOOR PLAN</span><span className="venue-toolbar-right">{activeNight.city} · {selectedZone.name} <Icon>⌄</Icon></span></div>
            <div className="venue-canvas" role="region" aria-label="Bản đồ sân khấu 3D tương tác. Kéo để xoay, dùng thao tác chạm để quan sát và chọn khu vực."><VenueScene selectedZone={selectedZone} onSelectZone={selectZone} userAvatar={userAvatar} remoteParticipants={remoteParticipants} isDancing={isDancing} lightstickColor={lightstickColor} act={activeAct} activeTrack={activeTrack} activeTrackOffset={currentTrackOffset} soundOn={soundOn} cameraMode={cameraMode} cameraResetToken={cameraResetToken} lightingOn={lightingOn} laserOn={laserOn} lightsticksOn={lightsticksOn} showZoneLabels={showZoneLabels} zoneFilter={zoneFilter} /><div className="canvas-hint"><span aria-hidden="true">↻</span> {userAvatar ? "GHẾ ĐÃ KHÓA · GÓC NHÌN THỨ 3 · SPACE để dance" : "Kéo để xoay · chạm khu vực để chọn"}</div></div>
            <div className="venue-legend" aria-live="polite"><span><i className="legend-dot mint" /> Đang mở</span><span><i className="legend-dot violet" /> Khu vực được chọn</span><span><Icon>⌖</Icon> {selectedZone.seats}</span><span><Icon>✦</Icon> SKY CROWD {userAvatar ? `${Object.keys(remoteParticipants).length + 1}/100` : "0/100"}</span><span className={`room-status ${connectionStatus}`} aria-label={`Trạng thái phòng: ${connectionLabel[connectionStatus]}`}><i /> {connectionLabel[connectionStatus]}</span></div>
          </div>
          <aside className="show-panel" aria-label="Thông tin đêm diễn và setlist">
            <div className="show-panel-top"><span className="show-date">{activeNight.date}<br /><small>{activeNight.month}</small></span><div><span className="section-kicker">{activeNight.venue}</span><h3>{activeNight.city}<br /><em>{activeNight.tagline}</em></h3></div></div>
            <div className="show-rule" />
            <div className="now-playing"><span className="selected-zone-kicker">NOW PLAYING · {activeTrack.id} / {activeNight.tracks.length} · {activeAct.title}</span><div><span className="equalizer"><i /><i /><i /></span><strong>{activeTrack.title}</strong></div><small>{userAvatar ? "đang phát trên màn LED trung tâm" : "nhấn VÀO CONCERT để bắt đầu"}</small><a className="youtube-link" href={`https://www.youtube.com/watch?v=${activeTrack.youtubeId}`} target="_blank" rel="noreferrer">MỞ TRÊN YOUTUBE ↗</a></div>
            <div className="selected-zone"><span className="selected-zone-kicker">YOUR VIEWPOINT</span><div className="selected-zone-title"><span className="zone-swatch" style={{ background: selectedZone.accent }} />{selectedZone.name}<span className="selected-arrow">↗</span></div><div className="zone-stats"><span>{selectedZone.seats}</span><span>{activeNight.dateLabel}</span></div></div>
            <div className="setlist"><div className="setlist-heading"><span className="selected-zone-kicker">SETLIST · {activeNight.city}</span><button onClick={nextTrack}>NEXT ↗</button></div>{activeNight.tracks.map((track, index) => <button className={index === currentTrackIndex ? "track playing" : "track"} key={`${activeNight.id}-${track.id}`} onClick={() => selectTrack(index)}><span>{track.id}</span><strong>{track.title}</strong><b>{track.duration}</b></button>)}</div>
            <button className="primary-button wide" onClick={userAvatar ? exitConcert : () => setIsEntryOpen(true)}>{userAvatar ? "RỜI CHỖ" : "VÀO KHU VỰC NÀY"} <span>{userAvatar ? "↙" : "↗"}</span></button>
          </aside>
        </div>
      </section>

      <section className="watch-section section-pad">
        <div className="section-heading"><div><span className="section-kicker">SKY LIVE ROOM / 02</span><h2>Stay for<br /><em>the encore.</em></h2></div><p>Không gian xem trực tiếp của SKY TOUR: sân khấu, setlist và cộng đồng cùng hiện diện trong một đêm diễn kéo dài vượt khỏi màn hình.</p></div>
        <div className="watch-layout">
          <div className="video-card"><div className="video-topbar"><span className="live-pill"><i /> LIVE</span><span>{activeNight.venue} · STAGE CAM 01</span><span className="viewer-count">◉ SKY CROWD ONLINE</span></div><div className="video-frame"><video controls playsInline muted={!soundOn} loop poster="data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 1600 900'%3E%3Crect width='1600' height='900' fill='%230b1020'/%3E%3Ccircle cx='800' cy='420' r='180' fill='%231e2e57'/%3E%3Ccircle cx='800' cy='420' r='120' fill='%2391a8ff' fill-opacity='.5'/%3E%3Ctext x='800' y='690' text-anchor='middle' fill='%23e8edff' font-family='Arial' font-size='42' letter-spacing='9'%3ESKY TOUR PREVIEW%3C/text%3E%3C/svg%3E" src={demoVideo} /></div><div className="video-footer"><span><Icon>✦</Icon> Camera 01 · Full stage</span><div><button>CAM 01</button><button>CAM 02</button><button>360°</button></div></div></div>
          <div className="chat-card"><div className="chat-heading"><div><span className="section-kicker">IN THE CROWD</span><h3>Skyline chat</h3></div><button onClick={() => setIsChatOpen(!isChatOpen)}>{isChatOpen ? "Ẩn" : "Mở"}</button></div>{isChatOpen && <><div className="chat-messages">{messages.map((item, index) => <div className="chat-message" key={`${item.name}-${index}`}><span className="chat-avatar">{item.name.slice(0, 1)}</span><p><strong>{item.name}</strong>{item.text}</p></div>)}</div><div className="chat-input"><input value={message} onChange={(event) => setMessage(event.target.value)} onKeyDown={(event) => { if (event.key === "Enter") submitMessage(); }} placeholder="Gửi một điều gì đó..." aria-label="Chat message" /><button onClick={submitMessage}>↗</button></div></>}</div>
        </div>
      </section>

      <footer className="footer section-pad"><div className="footer-brand"><span className="brand-mark"><span /></span><span><strong>SKY TOUR</strong><small>SON TUNG M-TP</small></span></div><p>THE JOURNEY BEYOND THE SKY · Ba thành phố, ba đêm diễn, một bầu trời dành cho SKY.</p><div className="footer-links"><a href="#top">Instagram</a><a href="#top">TikTok</a><a href="#top">YouTube</a></div><span className="footer-year">© 2027</span></footer>
      {isEntryOpen && <div className="entry-overlay" role="dialog" aria-modal="true" aria-labelledby="entry-title" aria-describedby="entry-description">
        <form className="entry-modal" ref={entryModalRef} onSubmit={joinConcert}>
          <button className="entry-close" type="button" onClick={() => setIsEntryOpen(false)} aria-label="Đóng">×</button>
          <span className="section-kicker">SKY TOUR ONLINE / ENTRY</span>
          <h3 id="entry-title">Bước vào<br /><em>bầu trời.</em></h3>
          <p id="entry-description">Chọn đêm diễn và khu vực để bắt đầu trải nghiệm concert online.</p>
          {roomNotice && <small className="room-notice" role="status" aria-live="polite">{roomNotice}</small>}
          <label>TÊN HIỂN THỊ<input value={entryName} onChange={(event) => setEntryName(event.target.value)} placeholder="Tên của bạn" autoFocus /></label>
          <label>ĐÊM DIỄN<select value={entryNightId} onChange={(event) => setEntryNightId(event.target.value as NightId)}>{concertNights.map((night) => <option key={night.id} value={night.id}>{night.city} · {night.dateLabel}</option>)}</select></label>
          <label>KHU VỰC · 3 BẬC / 12 VỊ TRÍ<select disabled={Boolean(userAvatar)} value={selectedZone.id} onChange={(event) => { const next = allSeatingZones.find((zone) => zone.id === event.target.value); if (next) selectZone(next); }}>{allSeatingZones.map((zone) => <option key={zone.id} value={zone.id}>{zone.name}</option>)}</select></label>
          <div className="character-picker-field">
            <div className="character-picker-heading"><span>CHỌN NHÂN VẬT SKY</span><small>{crowdCharacterAssets.length} nhân vật · CC0</small></div>
            <div className="character-picker" role="listbox" aria-label="Chọn nhân vật">
              {crowdCharacterAssets.map((asset, index) => {
                const selected = entryCharacterAsset === asset;
                return <button key={asset} type="button" role="option" aria-selected={selected} className={selected ? "character-option is-selected" : "character-option"} onClick={() => setEntryCharacterAsset(asset)}>
                  <span className="character-option-number">{String(index + 1).padStart(2, "0")}</span>
                  <span className="character-option-icon" aria-hidden="true">{selected ? "✦" : "◉"}</span>
                  <span>{formatCharacterName(asset)}</span>
                </button>;
              })}
            </div>
            <small className="character-picker-note">Đã chọn: {formatCharacterName(entryCharacterAsset)} · nhân vật này sẽ xuất hiện cùng lightstick của bạn.</small>
          </div>
          <div className="lightstick-picker-field">
            <div className="character-picker-heading"><span>MÀU ÁNH SÁNG LIGHTSTICK</span><small>{currentLightstickColor.name}</small></div>
            <div className="lightstick-swatches" role="radiogroup" aria-label="Chọn màu lightstick">
              {lightstickColors.map((color) => <button type="button" key={color.value} className={lightstickColor === color.value ? "lightstick-swatch is-selected" : "lightstick-swatch"} onClick={() => setLightstickColor(color.value)} aria-label={color.name} aria-pressed={lightstickColor === color.value} style={{ "--swatch-color": color.value } as React.CSSProperties}><i /></button>)}
            </div>
            <small className="character-picker-note">Có thể đổi màu ngay trong concert bằng nút màu trên thanh điều khiển.</small>
          </div>
          <button className="primary-button entry-submit" type="submit">NHẢY VÀO <span>↗</span></button>
          <small className="entry-note">Mô phỏng tham khảo · không phải hệ thống bán vé.</small>
        </form>
      </div>}
    </main>
  );
}

export default App;
