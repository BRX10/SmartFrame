export default function Spinner(props) {
    return (
        <div className={"flex justify-center items-center " + (props.className || "")}>
            <div className="h-6 w-6 animate-spin rounded-full border-2 border-zinc-700 border-t-orange-500" />
        </div>
    );
}