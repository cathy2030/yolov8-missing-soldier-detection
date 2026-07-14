import { useEffect, useState, useRef } from "react";
import { useParams, Link } from "react-router-dom";
import { api, API } from "../api/client.js";
import TallyBoard from "../components/TallyBoard.jsx";
import StatusBadge from "../components/StatusBadge.jsx";
import HelpTip from "../components/HelpTip.jsx";

const CAPTURE_SECONDS = 4;

export default function SessionDetail() {
  const { id } = useParams();
  const [session, setSession] = useState(null);
  const [events, setEvents] = useState([]);
  const [err, setErr] = useState("");

  // edit expected
  const [editing, setEditing] = useState(false);
  const [editVal, setEditVal] = useState(0);

  // upload
  const fileRef = useRef(null);
  const [file, setFile] = useState(null);
  const [uploading, setUploading] = useState(false);
  const [uploadMsg, setUploadMsg] = useState("");

  // webcam
  const videoRef = useRef(null);
  const canvasRef = useRef(null);
  const streamRef = useRef(null);
  const timerRef = useRef(null);
  const busyRef = useRef(false);
  const [camOn, setCamOn] = useState(false);
  const [camMsg, setCamMsg] = useState("");

  async function load() {
    try {
      const [s, ev] = await Promise.all([api.session(id), api.events(id)]);
      setSession(s); setEvents(ev);
    } catch (e) { setErr(e.message); }
  }
  useEffect(() => {
    load();
    const t = setInterval(load, 3000);
    return () => clearInterval(t);
  }, [id]);

  // stop the camera when leaving the page
  useEffect(() => () => stopCam(), []);

  async function saveExpected() {
    try {
      const s = await api.updateSession(id, { expected_count: Number(editVal) });
      setSession(s); setEditing(false);
    } catch (e) { setErr(e.message); }
  }

  async function analyzeUpload() {
    if (!file || uploading) return;
    const isVideo = file.type.startsWith("video");
    const isImage = file.type.startsWith("image");
    if (!isVideo && !isImage) { setUploadMsg("Use an image or a video file."); return; }
    setUploading(true);
    setUploadMsg(isVideo ? "Uploading video…" : "Analyzing image…");
    try {
      if (isVideo) {
        await api.analyzeVideo(id, file, file.name);
        setUploadMsg("Video is being analyzed — frames appear in the log below as they process.");
      } else {
        const ev = await api.analyzeImage(id, file, file.name);
        setUploadMsg(`Analyzed: ${ev.detected_count}/${ev.expected_count} present (${ev.status}).`);
      }
      setFile(null);
      if (fileRef.current) fileRef.current.value = "";
      load();
    } catch (e) {
      setUploadMsg(`Failed: ${e.message}`);
    } finally {
      setUploading(false);
    }
  }

  // ---- webcam ----
  async function startCam() {
    setCamMsg("");
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: "environment" }, audio: false });
      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        await videoRef.current.play();
      }
      setCamOn(true);
      setCamMsg(`Live — analyzing a frame every ${CAPTURE_SECONDS}s.`);
      timerRef.current = setInterval(captureAndSend, CAPTURE_SECONDS * 1000);
    } catch (e) {
      setCamMsg(`Camera error: ${e.message}. Allow camera access and try again.`);
    }
  }

  function stopCam() {
    if (timerRef.current) { clearInterval(timerRef.current); timerRef.current = null; }
    if (streamRef.current) { streamRef.current.getTracks().forEach((t) => t.stop()); streamRef.current = null; }
    setCamOn(false);
  }

  function captureAndSend() {
    if (busyRef.current) return;                 // don't overlap requests
    const video = videoRef.current, canvas = canvasRef.current;
    if (!video || !canvas || !video.videoWidth) return;
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    canvas.getContext("2d").drawImage(video, 0, 0);
    canvas.toBlob(async (blob) => {
      if (!blob) return;
      busyRef.current = true;
      try {
        const ev = await api.analyzeImage(id, blob, "webcam.jpg");
        setCamMsg(`Live — last read ${ev.detected_count}/${ev.expected_count} (${ev.status}).`);
        load();
      } catch (e) {
        setCamMsg(`Live capture failed: ${e.message}`);
      } finally {
        busyRef.current = false;
      }
    }, "image/jpeg", 0.85);
  }

  const latest = events[0];
  const expected = latest?.expected_count ?? session?.expected_count;

  return (
    <div>
      <div className="flex items-center gap-3 mb-6 flex-wrap">
        <Link to="/sessions" className="text-muted text-sm hover:text-ink">← Musters</Link>
        <h1 className="font-display uppercase tracking-wider text-2xl">{session?.name || "Muster"}</h1>
        {session && <StatusBadge status={session.status === "active" ? "COMPLETE" : "ENDED"} />}
        {/* editable expected */}
        <div className="ml-auto flex items-center gap-2 text-sm">
          <span className="text-muted">Expected</span>
          {editing ? (
            <>
              <input type="number" min="0" value={editVal} onChange={(e) => setEditVal(e.target.value)}
                className="w-20 border border-line/40 rounded px-2 py-1 num" autoFocus />
              <button className="text-brass text-xs font-display uppercase" onClick={saveExpected}>Save</button>
              <button className="text-muted text-xs" onClick={() => setEditing(false)}>Cancel</button>
            </>
          ) : (
            <>
              <span className="num font-display text-lg">{session?.expected_count ?? "—"}</span>
              <button className="text-muted text-xs underline hover:text-brass"
                onClick={() => { setEditVal(session?.expected_count ?? 0); setEditing(true); }}>edit</button>
            </>
          )}
        </div>
      </div>
      {err && <div className="mb-4 rounded-md bg-missing-soft text-missing text-sm px-3 py-2">{err}</div>}

      <div className="grid lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2">
          <TallyBoard detected={latest?.detected_count} expected={expected} status={latest?.status} />

          <h2 className="eyebrow text-muted mt-8 mb-3">Attendance log</h2>
          <div className="card overflow-hidden">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-muted eyebrow border-b border-line/20">
                  <th className="px-5 py-3 font-medium">Time</th>
                  <th className="px-5 py-3 font-medium">Present</th>
                  <th className="px-5 py-3 font-medium">Missing</th>
                  <th className="px-5 py-3 font-medium">Status</th>
                </tr>
              </thead>
              <tbody>
                {events.length === 0 && (
                  <tr><td colSpan="4" className="px-5 py-10 text-center text-muted">No readings yet. Use the camera, or upload a photo/video.</td></tr>
                )}
                {events.map((e) => (
                  <tr key={e.id} className="border-b border-line/10 last:border-0">
                    <td className="px-5 py-3 text-muted">{new Date(e.created_at).toLocaleTimeString()}</td>
                    <td className="px-5 py-3 num">{e.detected_count}/{e.expected_count}</td>
                    <td className="px-5 py-3 num">{e.missing_count}</td>
                    <td className="px-5 py-3"><StatusBadge status={e.status} /></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        <div className="space-y-6">
          {/* Live camera */}
          <div>
            <h2 className="eyebrow text-muted mb-3 flex items-center">
              Live camera <HelpTip text="Uses this device's webcam. A frame is captured and counted every few seconds — point it at the formation to monitor live." />
            </h2>
            <div className="card p-4">
              <div className="relative rounded-md overflow-hidden bg-command aspect-video mb-3">
                <video ref={videoRef} className="w-full h-full object-cover" muted playsInline />
                {!camOn && (
                  <div className="absolute inset-0 flex items-center justify-center text-white/50 text-xs font-display uppercase tracking-wider">
                    Camera off
                  </div>
                )}
              </div>
              <canvas ref={canvasRef} className="hidden" />
              {!camOn ? (
                <button className="btn-brass w-full" onClick={startCam}>Start live camera</button>
              ) : (
                <button className="btn-ghost w-full" onClick={stopCam}>Stop camera</button>
              )}
              {camMsg && <p className="text-xs mt-2 text-ink">{camMsg}</p>}
            </div>
          </div>

          {/* Upload */}
          <div>
            <h2 className="eyebrow text-muted mb-3 flex items-center">
              Analyze a photo or video <HelpTip text="Upload a parade photo for an instant count, or a video clip that gets sampled frame-by-frame into the log." />
            </h2>
            <div className="card p-4">
              <input ref={fileRef} type="file" accept="image/*,video/*"
                onChange={(e) => { setFile(e.target.files?.[0] || null); setUploadMsg(""); }}
                className="block w-full text-sm text-muted file:mr-3 file:py-2 file:px-3 file:rounded-md file:border-0 file:bg-command file:text-white file:font-display file:uppercase file:tracking-wider file:text-xs" />
              {file && <p className="text-xs text-muted mt-2 truncate">Selected: {file.name}</p>}
              <button className="btn-brass w-full mt-3" onClick={analyzeUpload} disabled={uploading || !file}>
                {uploading ? "Working…" : "Analyze"}
              </button>
              {uploadMsg && <p className="text-xs mt-2 text-ink">{uploadMsg}</p>}
            </div>
          </div>

          {/* Latest evidence */}
          <div>
            <h2 className="eyebrow text-muted mb-3">Latest evidence</h2>
            {latest?.image_url ? (
              <img src={`${API}${latest.image_url}`} alt="Latest frame" className="w-full rounded-lg border border-line/25" />
            ) : (
              <div className="card px-4 py-10 text-center text-muted text-sm">No frame captured yet.</div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
