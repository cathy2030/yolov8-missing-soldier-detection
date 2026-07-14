// Authorship watermark — appears on every page and the login screen.
export default function Watermark() {
  return (
    <div className="text-center text-[11px] text-muted/70 py-4 border-t border-line/15 mt-8">
      Built by <span className="font-medium text-muted">Awoyemi Victor Adewale</span>
      <span className="mx-1.5">Matric No:</span>
      <span className="font-medium text-muted">22/208CSC/181</span>
      {/* <span className="mx-1.5">·</span>
      Dept. of Computer Science, University of Abuja */}
    </div>
  );
}
