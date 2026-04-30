export default function Post(props) {
    return (
        <li
            key={props.idx}
            className={
                "relative rounded-xl px-4 py-3 mt-1.5 border border-zinc-800 bg-zinc-900 transition-colors " +
                (props.isClick ? "hover:bg-zinc-800 hover:border-zinc-700 active:bg-zinc-700" : "")
            }
        >
            <p className="text-sm text-zinc-200 leading-snug">
                {props.title}
                {props.children}
            </p>
            <div className="mt-1.5 flex flex-wrap gap-x-3">
                {props.list.map((item, idx) => (
                    <span key={idx} className="text-xs text-zinc-500">
                        {item}
                    </span>
                ))}
            </div>
            {props.isClick ? (
                <button
                    onClick={() => props.onClick()}
                    className="absolute inset-0 rounded-xl focus:outline-none focus-visible:ring-2 focus-visible:ring-orange-500 focus-visible:ring-offset-1 focus-visible:ring-offset-zinc-950"
                    aria-label="Ouvrir"
                />
            ) : null}
        </li>
    );
}