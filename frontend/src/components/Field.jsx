import HelpTip from "./HelpTip.jsx";

export default function Field({ label, help, children }) {
  return (
    <div>
      <div className="flex items-center mb-1">
        <span className="label mb-0">{label}</span>
        {help && <HelpTip text={help} />}
      </div>
      {children}
    </div>
  );
}
