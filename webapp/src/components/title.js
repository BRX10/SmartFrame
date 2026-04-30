export default function Title(props) {
    return (
        <div className={"text-left " + (props.className || "")}>
            <span className="text-xl font-semibold text-zinc-100 tracking-tight">
                {props.title}
            </span>
        </div>
    );
}