export default function Alert(props) {
    if (!props.alert) return null;

    const isSuccess = props.typeAlert === "sucess";

    return (
        <div
            role="alert"
            className={
                "flex justify-between items-start gap-3 px-4 py-3 rounded-xl border text-sm mb-2 " +
                (isSuccess
                    ? "bg-emerald-500/10 border-emerald-500/30 text-emerald-400"
                    : "bg-red-500/10 border-red-500/30 text-red-400") +
                " " + (props.className || "")
            }
        >
            <div className="flex items-start gap-2">
                <span className="text-base mt-0.5">{isSuccess ? "✓" : "✕"}</span>
                <span>{props.messageAlert}</span>
            </div>
            <button
                onClick={() => props.onClose(false)}
                className="shrink-0 opacity-60 hover:opacity-100 transition-opacity mt-0.5"
            >
                <svg className="h-4 w-4" fill="currentColor" viewBox="0 0 20 20">
                    <path d="M14.348 14.849a1.2 1.2 0 0 1-1.697 0L10 11.819l-2.651 3.029a1.2 1.2 0 1 1-1.697-1.697l2.758-3.15-2.759-3.152a1.2 1.2 0 1 1 1.697-1.697L10 8.183l2.651-3.031a1.2 1.2 0 1 1 1.697 1.697l-2.758 3.152 2.758 3.15a1.2 1.2 0 0 1 0 1.698z"/>
                </svg>
            </button>
        </div>
    );
}