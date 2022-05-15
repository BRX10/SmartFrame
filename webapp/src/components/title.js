export default function Title(props) {
    return (
        <div className={"text-left text-3xl font-extrabold leading-none tracking-tight " + props.className}>
            <span
                className="bg-clip-text drop-shadow-xl text-transparent bg-gradient-to-r from-orange-400 to-yellow-300">
                {props.title}
            </span>
        </div>
    );
}