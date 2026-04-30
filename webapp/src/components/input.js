export default function Input(props) {
    return (
        <div className={"flex flex-col gap-1 mt-4 w-full " + (props.className || "")}>
            {props.title && (
                <label className="text-xs font-medium text-zinc-400 uppercase tracking-wider px-1">
                    {props.title}
                </label>
            )}
            <input
                disabled={props.disabled}
                onChange={(e) => props.onChange && props.onChange(e.target.value)}
                value={props.value}
                name={props.name}
                step={props.step}
                type={props.type}
                required={props.required}
                className="w-full bg-zinc-800 text-zinc-100 placeholder-zinc-500 text-sm px-4 py-3 rounded-xl border border-zinc-700 focus:outline-none focus:border-orange-500 focus:ring-1 focus:ring-orange-500 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            />
        </div>
    );
}